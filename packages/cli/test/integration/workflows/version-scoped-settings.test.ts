import { type ModuleName, ModuleRegistry } from '@n8n/backend-common';
import { WorkflowPublishedDataService } from '@n8n/backend-services';
import {
	createActiveWorkflow,
	createWorkflow,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import { type User, WorkflowHistoryRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { IWorkflowSettings } from 'n8n-workflow';
import type { MockInstance } from 'vitest';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { getPublishedWorkflowData } from '@/workflow-execute-additional-data';
import { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';
import { WorkflowService } from '@/workflows/workflow.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';

import { createOwner } from '../shared/db/users';
import { createWorkflowHistoryItem } from '../shared/db/workflow-history';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows'],
	enabledFeatures: ['feat:sharing'],
});

mockInstance(ActiveWorkflowManager);
mockInstance(CollaborationService);
const workflowValidationService = mockInstance(WorkflowValidationService);

describe('version-scoped settings', () => {
	const workflowsConfig = Container.get(WorkflowsConfig);
	const originalUseWorkflowPublicationService = workflowsConfig.useWorkflowPublicationService;

	let owner: User;
	let ownerAgent: SuperAgentTest;
	let eligibleModulesSpy: MockInstance<() => ModuleName[]>;

	beforeAll(async () => {
		workflowsConfig.useWorkflowPublicationService = false;
		await utils.initNodeTypes();
	});

	afterAll(() => {
		workflowsConfig.useWorkflowPublicationService = originalUseWorkflowPublicationService;
	});

	beforeEach(async () => {
		await testDb.truncate([
			'WorkflowPublishHistory',
			'WorkflowPublishedVersion',
			'SharedWorkflow',
			'WorkflowEntity',
			'WorkflowHistory',
			'User',
		]);
		owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);

		workflowValidationService.validateForActivation.mockResolvedValue({ isValid: true });
		workflowValidationService.validateDynamicCredentials.mockResolvedValue({ isValid: true });
		workflowValidationService.validatePublisherCredentialAccess.mockResolvedValue({
			isValid: true,
		});
		workflowValidationService.validateSubWorkflowReferences.mockResolvedValue({ isValid: true });
		workflowValidationService.validateCredentialNodeRestrictions.mockReturnValue({
			isValid: true,
		});

		eligibleModulesSpy = vi
			.spyOn(Container.get(ModuleRegistry), 'eligibleModules', 'get')
			.mockReturnValue(['engine-v2']);
	});

	afterEach(() => {
		eligibleModulesSpy.mockRestore();
		vi.clearAllMocks();
	});

	const productionEngine = async (workflowId: string) => {
		const published = await getPublishedWorkflowData({ id: workflowId }, 'parent-workflow');
		return published.settings?.engineType ?? 'v1';
	};

	const setVersionSettings = async (versionId: string, settings: IWorkflowSettings) =>
		await Container.get(WorkflowHistoryRepository).update({ versionId }, { settings });

	describe('publishing a version saved before history stored settings', () => {
		test('a draft engine change does not reach production', async () => {
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } }, owner);
			const olderVersion = await createWorkflowHistoryItem(workflow.id, { settings: {} });

			await ownerAgent
				.post(`/workflows/${workflow.id}/activate`)
				.send({ versionId: olderVersion.versionId })
				.expect(200);
			expect(await productionEngine(workflow.id)).toBe('v1');

			await ownerAgent
				.patch(`/workflows/${workflow.id}`)
				.send({ settings: { executionOrder: 'v1', engineType: 'v2' } })
				.expect(200);

			expect(await productionEngine(workflow.id)).toBe('v1');
		});

		test('runs on v1 when the draft engine is v2, and a draft change does not move it', async () => {
			const workflow = await createWorkflow(
				{ settings: { executionOrder: 'v1', engineType: 'v2' } },
				owner,
			);
			const olderVersion = await createWorkflowHistoryItem(workflow.id, { settings: {} });

			await ownerAgent
				.post(`/workflows/${workflow.id}/activate`)
				.send({ versionId: olderVersion.versionId })
				.expect(200);
			expect(await productionEngine(workflow.id)).toBe('v1');

			await ownerAgent
				.patch(`/workflows/${workflow.id}`)
				.send({ settings: { executionOrder: 'v1', engineType: 'v1' } })
				.expect(200);

			expect(await productionEngine(workflow.id)).toBe('v1');
		});
	});

	describe('node id repair republish', () => {
		test('keeps the engine that production runs on', async () => {
			const workflow = await createActiveWorkflow(
				{ settings: { executionOrder: 'v1', engineType: 'v2' } },
				owner,
			);
			await setVersionSettings(workflow.versionId, {});
			expect(await productionEngine(workflow.id)).toBe('v1');

			const result = await Container.get(WorkflowService).publishAsSystem(
				workflow.id,
				{
					nodes: workflow.nodes,
					connections: workflow.connections,
					nodeGroups: workflow.nodeGroups ?? [],
					settings: {},
				},
				workflow.versionId,
			);

			expect(result.published).toBe(true);
			expect(await productionEngine(workflow.id)).toBe('v1');
		});
	});

	describe('trigger loads of the published version', () => {
		test('a cached load and a database load agree on the engine', async () => {
			const workflow = await createActiveWorkflow({ settings: { executionOrder: 'v1' } }, owner);
			await setVersionSettings(workflow.versionId, {});
			await Container.get(WorkflowPublishedDataService).refreshCache(workflow.id);

			await Container.get(WorkflowRepository).update(workflow.id, {
				settings: { executionOrder: 'v1', engineType: 'v2' },
			});

			const factory = Container.get(TriggerExecutionContextFactory);
			const cached = await factory.loadPublishedWorkflowData(workflow.id);
			const fromDatabase = await factory.loadPublishedWorkflowData(workflow.id, {
				bypassCache: true,
			});

			expect(cached.settings?.engineType ?? 'v1').toBe(fromDatabase.settings?.engineType ?? 'v1');
		});
	});
});
