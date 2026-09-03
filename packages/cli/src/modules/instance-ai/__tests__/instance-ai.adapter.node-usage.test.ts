// The barrel is mocked so this file exercises the adapter's own wiring rather than pulling the
// whole instance-ai package in behind it, matching the other adapter tests.
vi.mock('@n8n/instance-ai', async () => {
	const { WorkflowSaveConflictError } = await import(
		'../../../../../@n8n/instance-ai/src/errors/workflow-save-conflict.error.js'
	);
	const { WorkflowNotFoundError } = await import(
		'../../../../../@n8n/instance-ai/src/errors/workflow-not-found.error.js'
	);
	const { WorkflowEditorLockedError } = await import(
		'../../../../../@n8n/instance-ai/src/errors/workflow-editor-locked.error.js'
	);
	return {
		WorkflowSaveConflictError,
		WorkflowNotFoundError,
		WorkflowEditorLockedError,
		wrapUntrustedData: (content: string) => content,
		builderTemplatesOptionsFromEnv: () => ({}),
		deriveCredentialHosts: vi.fn().mockReturnValue([]),
		BuilderTemplatesService: class {
			async getBundle() {
				return { files: [], indexTxt: '', version: null };
			}
			getVersion() {
				return null;
			}
		},
	};
});

vi.mock('@n8n/ai-utilities', () => ({
	braveSearch: vi.fn(),
	searxngSearch: vi.fn(),
}));

import type { Logger } from '@n8n/backend-common';
import { INSTANCE_AI_NODE_USAGE_FLAG } from '@n8n/api-types';
import type { OutboundHttp } from '@n8n/backend-network';
import type { GlobalConfig } from '@n8n/config';
import type {
	AiBuilderTemporaryWorkflowRepository,
	ExecutionRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	User,
	WorkflowRepository,
} from '@n8n/db';
import { GLOBAL_MEMBER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { EventService } from '@/events/event.service';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { License } from '@/license';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import type { WorkflowDependencyQueryService } from '@/modules/workflow-index/workflow-dependency-query.service';
import type { NodeTypes } from '@/node-types';
import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PostHogClient } from '@/posthog';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import type { FolderService } from '@/services/folder.service';
import type { InstanceWriteAccessService } from '@/services/instance-write-access.service';
import { NodeResourceExplorerService } from '@/services/node-resource-explorer.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';
import type { TagService } from '@/services/tag.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import type { WorkflowService } from '@/workflows/workflow.service';
import type { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

import type { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { InstanceAiAdapterService } from '../instance-ai.adapter.service';
import type { WorkflowTemplatesService } from '../workflow-templates.service';

const user = mock<User>({ id: 'user-1', role: GLOBAL_MEMBER_ROLE });

const workflowService = mock<WorkflowService>();

function buildAdapter(options: { dependencyQueryService?: WorkflowDependencyQueryService }) {
	const logger = mock<Logger>();
	const globalConfig = mock<GlobalConfig>({ ai: { allowSendingParameterValues: true } });

	return new InstanceAiAdapterService(
		logger,
		globalConfig,
		workflowService,
		mock<WorkflowFinderService>(),
		mock<WorkflowRepository>(),
		mock<SharedWorkflowRepository>(),
		mock<ProjectRepository>(),
		mock<ExecutionRepository>(),
		mock<CredentialsService>(),
		mock<CredentialsFinderService>(),
		mock<ActiveExecutions>(),
		mock<WorkflowRunner>(),
		mock<LoadNodesAndCredentials>(),
		mock<NodeTypes>(),
		mock<InstanceSettings>({ staticCacheDir: '/tmp/test-cache', n8nFolder: '/tmp/test-cache' }),
		mock<DataTableService>(),
		mock<DataTableRepository>(),
		new NodeResourceExplorerService(
			logger,
			mock<DynamicNodeParametersService>(),
			mock<CredentialsFinderService>(),
			mock<ProjectRepository>(),
			mock<NodeTypes>(),
		),
		mock<FolderService>(),
		mock<ProjectService>(),
		mock<TagService>(),
		mock<InstanceWriteAccessService>(),
		mock<InstanceAiSettingsService>(),
		mock<WorkflowHistoryService>(),
		mock<EnterpriseWorkflowService>(),
		mock<License>(),
		mock<ExecutionPersistence>(),
		mock<EventService>(),
		mock<RoleService>(),
		mock<Telemetry>(),
		mock<AiBuilderTemporaryWorkflowRepository>(),
		mock<OutboundHttp>(),
		mock<AiGatewayService>(),
		mock<WorkflowTemplatesService>(),
		mock<CollaborationService>(),
		mock<PolicyEnforcementService>(),
		undefined,
		undefined,
		undefined,
		options.dependencyQueryService,
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(Container, 'get').mockReturnValue(mock<ExecutionPersistence>());
});

describe('InstanceAiAdapterService node usage', () => {
	describe('isNodeUsageEnabled()', () => {
		const gateFor = async (flags: Record<string, unknown> | Error) => {
			const postHogClient = mock<PostHogClient>();
			if (flags instanceof Error) {
				postHogClient.getFeatureFlags.mockRejectedValue(flags);
			} else {
				postHogClient.getFeatureFlags.mockResolvedValue(flags as never);
			}
			vi.spyOn(Container, 'get').mockImplementation(((token: unknown) =>
				token === PostHogClient ? postHogClient : mock<ExecutionPersistence>()) as never);
			return await buildAdapter({}).isNodeUsageEnabled(user);
		};

		it('is on for a user in the rollout', async () => {
			expect(await gateFor({ [INSTANCE_AI_NODE_USAGE_FLAG]: true })).toBe(true);
		});

		it('is off when the flag is absent', async () => {
			expect(await gateFor({})).toBe(false);
		});

		it('is off when the flag is explicitly false', async () => {
			expect(await gateFor({ [INSTANCE_AI_NODE_USAGE_FLAG]: false })).toBe(false);
		});

		// A flag-plane outage must not switch a context surface on by accident.
		it('fails closed when PostHog is unreachable', async () => {
			expect(await gateFor(new Error('PostHog unreachable'))).toBe(false);
		});
	});

	describe('capability gate', () => {
		// The tool registers the action from the method's presence, so absence here is what actually
		// removes the surface from the agent — not a check further down.
		// Default-off is the point of the rollout gate: a context created without an explicit
		// decision must not carry the surface.
		it('omits nodeUsage when the caller passes no gate decision', () => {
			const service = buildAdapter({
				dependencyQueryService: mock<WorkflowDependencyQueryService>(),
			});

			expect(service.createContext(user).workflowService.nodeUsage).toBeUndefined();
		});

		it('omits nodeUsage when the rollout gate is closed', () => {
			const service = buildAdapter({
				dependencyQueryService: mock<WorkflowDependencyQueryService>(),
			});

			const context = service.createContext(user, { nodeUsageEnabled: false });

			expect(context.workflowService.nodeUsage).toBeUndefined();
		});

		it('omits nodeUsage when the dependency index is not wired', () => {
			const service = buildAdapter({});

			expect(
				service.createContext(user, { nodeUsageEnabled: true }).workflowService.nodeUsage,
			).toBeUndefined();
		});

		it('exposes nodeUsage when the gate is open and the index is wired', () => {
			const service = buildAdapter({
				dependencyQueryService: mock<WorkflowDependencyQueryService>(),
			});

			expect(
				service.createContext(user, { nodeUsageEnabled: true }).workflowService.nodeUsage,
			).toBeDefined();
		});
	});

	describe('nodeUsage()', () => {
		it("defaults to the thread's bound project", async () => {
			const dependencyQueryService = mock<WorkflowDependencyQueryService>();
			dependencyQueryService.getNodeTypeUsage.mockResolvedValue({
				workflowsInScope: 3,
				nodeTypes: [{ nodeType: 'n8n-nodes-base.slack', workflowCount: 2 }],
			});
			const service = buildAdapter({ dependencyQueryService });

			const context = service.createContext(user, {
				projectId: 'bound-project',
				nodeUsageEnabled: true,
			});
			const result = await context.workflowService.nodeUsage?.();

			expect(dependencyQueryService.getNodeTypeUsage).toHaveBeenCalledWith(user, {
				projectId: 'bound-project',
			});
			expect(result).toEqual({
				workflowsInScope: 3,
				nodeTypes: [{ nodeType: 'n8n-nodes-base.slack', workflowCount: 2 }],
			});
		});

		it('drops the project filter when the caller widens to the instance', async () => {
			const dependencyQueryService = mock<WorkflowDependencyQueryService>();
			dependencyQueryService.getNodeTypeUsage.mockResolvedValue({
				workflowsInScope: 0,
				nodeTypes: [],
			});
			const service = buildAdapter({ dependencyQueryService });

			const context = service.createContext(user, {
				projectId: 'bound-project',
				nodeUsageEnabled: true,
			});
			await context.workflowService.nodeUsage?.({ scope: 'instance' });

			expect(dependencyQueryService.getNodeTypeUsage).toHaveBeenCalledWith(user, {});
		});

		it('serialises workflow timestamps for the agent', async () => {
			const dependencyQueryService = mock<WorkflowDependencyQueryService>();
			dependencyQueryService.getNodeTypeUsage.mockResolvedValue({
				workflowsInScope: 5,
				workflows: [
					{
						workflowId: 'wf-1',
						name: 'Daily sync',
						updatedAt: new Date('2026-01-02T03:04:05.000Z'),
					},
				],
				truncated: true,
			});
			const service = buildAdapter({ dependencyQueryService });

			const context = service.createContext(user, { nodeUsageEnabled: true });
			const result = await context.workflowService.nodeUsage?.({
				nodeType: 'n8n-nodes-base.slack',
			});

			expect(result).toEqual({
				workflowsInScope: 5,
				workflows: [
					{ workflowId: 'wf-1', name: 'Daily sync', updatedAt: '2026-01-02T03:04:05.000Z' },
				],
				truncated: true,
			});
		});
	});

	describe('list()', () => {
		it('passes nodeTypes into the scope filter so totalInScope describes the same set', async () => {
			workflowService.getMany.mockResolvedValue({ workflows: [], count: 0 });
			const service = buildAdapter({
				dependencyQueryService: mock<WorkflowDependencyQueryService>(),
			});

			const context = service.createContext(user, {
				projectId: 'bound-project',
				nodeUsageEnabled: true,
			});
			await context.workflowService.list({ nodeTypes: ['n8n-nodes-base.slack'], query: 'sync' });

			// Both reads carry the node-type filter: the second exists to say how many the *name*
			// filter hid, which would misreport if the two scopes differed.
			expect(workflowService.getMany).toHaveBeenNthCalledWith(1, user, {
				take: 50,
				filter: {
					isArchived: false,
					projectId: 'bound-project',
					nodeTypes: ['n8n-nodes-base.slack'],
					query: 'sync',
				},
			});
			expect(workflowService.getMany).toHaveBeenNthCalledWith(2, user, {
				take: 1,
				filter: {
					isArchived: false,
					projectId: 'bound-project',
					nodeTypes: ['n8n-nodes-base.slack'],
				},
			});
		});

		it('ignores nodeTypes when the capability is off', async () => {
			workflowService.getMany.mockResolvedValue({ workflows: [], count: 0 });
			const service = buildAdapter({});

			const context = service.createContext(user, { projectId: 'bound-project' });
			await context.workflowService.list({ nodeTypes: ['n8n-nodes-base.slack'] });

			expect(workflowService.getMany).toHaveBeenCalledWith(user, {
				take: 50,
				filter: { isArchived: false, projectId: 'bound-project' },
			});
		});
	});
});
