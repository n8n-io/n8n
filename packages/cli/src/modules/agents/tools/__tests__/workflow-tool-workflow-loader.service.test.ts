import type { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import {
	type PublishedWorkflowDataForExecution,
	WorkflowEntity,
	WorkflowHistory,
	type WorkflowPublishedVersionRepository,
	type WorkflowRepository,
} from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { WorkflowToolWorkflowLoader } from '../workflow-tool-workflow-loader.service';

const PROJECT_ID = 'project-1';
const REFERENCE = { workflowId: 'workflow-1', workflowName: 'Draft workflow name' };

function makeNode(name: string): INode {
	return {
		id: `${name}-id`,
		name,
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
}

function makeWorkflow(): WorkflowEntity {
	return Object.assign(new WorkflowEntity(), {
		id: REFERENCE.workflowId,
		name: REFERENCE.workflowName,
		description: 'Workflow description',
		active: true,
		isArchived: false,
		nodes: [makeNode('Draft node')],
		connections: { 'Draft node': { main: [[]] } },
		nodeGroups: [{ id: 'draft-group', name: 'Draft group', nodeIds: [] }],
		pinData: { 'Draft node': [{ json: { source: 'editor' } }] },
		versionId: 'draft-version',
		activeVersionId: 'legacy-version',
		activeVersion: null,
		versionCounter: 3,
		triggerCount: 0,
		sourceWorkflowId: null,
		createdAt: new Date('2026-08-01T00:00:00.000Z'),
		updatedAt: new Date('2026-08-02T00:00:00.000Z'),
	});
}

function makePublishedVersion(versionId: string): WorkflowHistory {
	return Object.assign(new WorkflowHistory(), {
		versionId,
		workflowId: REFERENCE.workflowId,
		nodes: [makeNode('Published node')],
		connections: { 'Published node': { main: [[]] } },
		nodeGroups: [{ id: 'published-group', name: 'Published group', nodeIds: [] }],
		authors: 'Test Author',
		name: REFERENCE.workflowName,
		description: null,
		autosaved: false,
		createdAt: new Date('2026-08-01T00:00:00.000Z'),
		updatedAt: new Date('2026-08-01T00:00:00.000Z'),
	});
}

function makePublishedData(
	workflow: WorkflowEntity,
	publishedVersion: WorkflowHistory,
): PublishedWorkflowDataForExecution {
	return {
		id: workflow.id,
		name: workflow.name,
		description: workflow.description,
		active: workflow.active,
		isArchived: workflow.isArchived,
		createdAt: workflow.createdAt,
		updatedAt: workflow.updatedAt,
		settings: workflow.settings,
		staticData: workflow.staticData,
		activeVersionId: workflow.activeVersionId,
		versionCounter: workflow.versionCounter,
		versionId: publishedVersion.versionId,
		nodes: publishedVersion.nodes,
		connections: publishedVersion.connections,
		nodeGroups: publishedVersion.nodeGroups,
	};
}

function makeLoader(useWorkflowPublicationService: boolean) {
	const workflowRepository = mock<WorkflowRepository>();
	const workflowPublishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
	const globalConfig = mock<GlobalConfig>({
		workflows: mock<WorkflowsConfig>({ useWorkflowPublicationService }),
	});
	const loader = new WorkflowToolWorkflowLoader(
		globalConfig,
		workflowRepository,
		workflowPublishedVersionRepository,
	);

	return { loader, workflowRepository, workflowPublishedVersionRepository };
}

describe('WorkflowToolWorkflowLoader', () => {
	describe('loadPublishedWorkflow', () => {
		it('uses the publication mapping and returns a fresh published execution snapshot', async () => {
			const { loader, workflowRepository, workflowPublishedVersionRepository } = makeLoader(true);
			const workflow = makeWorkflow();
			const publishedVersion = makePublishedVersion('mapped-version');
			workflow.activeVersionId = null;
			const publishedData = makePublishedData(workflow, publishedVersion);
			workflowPublishedVersionRepository.findPublishedWorkflowForAgentTool.mockResolvedValue(
				publishedData,
			);

			const result = await loader.loadPublishedWorkflow(PROJECT_ID, REFERENCE);

			expect(
				workflowPublishedVersionRepository.findPublishedWorkflowForAgentTool,
			).toHaveBeenCalledWith(PROJECT_ID, REFERENCE);
			expect(workflowRepository.findPublishedWorkflowForAgentTool).not.toHaveBeenCalled();
			expect(result?.publishedVersionId).toBe('mapped-version');
			expect(result?.workflow).toBeInstanceOf(WorkflowEntity);
			expect(result?.workflow).not.toBe(publishedData);
			expect(result?.workflow).toMatchObject({
				id: workflow.id,
				name: workflow.name,
				versionId: publishedVersion.versionId,
				nodes: publishedVersion.nodes,
				connections: publishedVersion.connections,
				nodeGroups: publishedVersion.nodeGroups,
				pinData: undefined,
			});
			expect(Object.isFrozen(result?.workflow)).toBe(false);
			expect(publishedData).toMatchObject({
				versionId: publishedVersion.versionId,
				nodes: publishedVersion.nodes,
				connections: publishedVersion.connections,
				nodeGroups: publishedVersion.nodeGroups,
			});
			expect(publishedData).not.toHaveProperty('pinData');
		});

		it('does not fall back to activeVersion when the publication mapping has no accessible row', async () => {
			const { loader, workflowRepository, workflowPublishedVersionRepository } = makeLoader(true);
			workflowPublishedVersionRepository.findPublishedWorkflowForAgentTool.mockResolvedValue(null);
			workflowRepository.findPublishedWorkflowForAgentTool.mockResolvedValue(
				makePublishedData(makeWorkflow(), makePublishedVersion('legacy-version')),
			);

			await expect(loader.loadPublishedWorkflow(PROJECT_ID, REFERENCE)).resolves.toBeNull();
			expect(workflowRepository.findPublishedWorkflowForAgentTool).not.toHaveBeenCalled();
		});

		it('uses activeVersion and ignores the publication mapping when the service is disabled', async () => {
			const { loader, workflowRepository, workflowPublishedVersionRepository } = makeLoader(false);
			const workflow = makeWorkflow();
			const activeVersion = makePublishedVersion('legacy-version');
			const publishedData = makePublishedData(workflow, activeVersion);
			workflowRepository.findPublishedWorkflowForAgentTool.mockResolvedValue(publishedData);

			const result = await loader.loadPublishedWorkflow(PROJECT_ID, REFERENCE);

			expect(workflowRepository.findPublishedWorkflowForAgentTool).toHaveBeenCalledWith(
				PROJECT_ID,
				REFERENCE,
			);
			expect(
				workflowPublishedVersionRepository.findPublishedWorkflowForAgentTool,
			).not.toHaveBeenCalled();
			expect(result).toMatchObject({
				publishedVersionId: 'legacy-version',
				workflow: {
					versionId: activeVersion.versionId,
					nodes: activeVersion.nodes,
					connections: activeVersion.connections,
					nodeGroups: activeVersion.nodeGroups,
					pinData: undefined,
				},
			});
			expect(result?.workflow).not.toBe(publishedData);
			expect(publishedData.versionId).toBe('legacy-version');
			expect(publishedData).not.toHaveProperty('pinData');
		});

		it('does not fall back to the mapping when the legacy source has no accessible active row', async () => {
			const { loader, workflowRepository, workflowPublishedVersionRepository } = makeLoader(false);
			workflowRepository.findPublishedWorkflowForAgentTool.mockResolvedValue(null);
			workflowPublishedVersionRepository.findPublishedWorkflowForAgentTool.mockResolvedValue(
				makePublishedData(makeWorkflow(), makePublishedVersion('mapped-version')),
			);

			await expect(loader.loadPublishedWorkflow(PROJECT_ID, REFERENCE)).resolves.toBeNull();
			expect(
				workflowPublishedVersionRepository.findPublishedWorkflowForAgentTool,
			).not.toHaveBeenCalled();
		});
	});

	describe('getPublishedVersionFingerprints', () => {
		it('short-circuits empty input', async () => {
			const { loader, workflowRepository, workflowPublishedVersionRepository } = makeLoader(true);

			await expect(loader.getPublishedVersionFingerprints(PROJECT_ID, [])).resolves.toEqual(
				new Map(),
			);
			expect(
				workflowRepository.findPublishedVersionFingerprintsForAgentTools,
			).not.toHaveBeenCalled();
			expect(
				workflowPublishedVersionRepository.findPublishedVersionFingerprintsForAgentTools,
			).not.toHaveBeenCalled();
		});

		it('deduplicates IDs and batch-loads mapping fingerprints once', async () => {
			const { loader, workflowRepository, workflowPublishedVersionRepository } = makeLoader(true);
			workflowPublishedVersionRepository.findPublishedVersionFingerprintsForAgentTools.mockResolvedValue(
				[
					{ workflowId: 'workflow-1', versionId: 'version-1' },
					{ workflowId: 'workflow-2', versionId: 'version-2' },
				],
			);

			const result = await loader.getPublishedVersionFingerprints(PROJECT_ID, [
				'workflow-1',
				'workflow-1',
				'workflow-2',
				'missing-workflow',
			]);

			expect(
				workflowPublishedVersionRepository.findPublishedVersionFingerprintsForAgentTools,
			).toHaveBeenCalledOnce();
			expect(
				workflowPublishedVersionRepository.findPublishedVersionFingerprintsForAgentTools,
			).toHaveBeenCalledWith(PROJECT_ID, ['workflow-1', 'workflow-2', 'missing-workflow']);
			expect(
				workflowRepository.findPublishedVersionFingerprintsForAgentTools,
			).not.toHaveBeenCalled();
			expect(result).toEqual(
				new Map([
					['workflow-1', 'version-1'],
					['workflow-2', 'version-2'],
				]),
			);
		});

		it('deduplicates IDs and batch-loads legacy fingerprints once', async () => {
			const { loader, workflowRepository, workflowPublishedVersionRepository } = makeLoader(false);
			workflowRepository.findPublishedVersionFingerprintsForAgentTools.mockResolvedValue([
				{ workflowId: 'workflow-1', versionId: 'legacy-version' },
			]);

			const result = await loader.getPublishedVersionFingerprints(PROJECT_ID, [
				'workflow-1',
				'workflow-1',
				'missing-workflow',
			]);

			expect(
				workflowRepository.findPublishedVersionFingerprintsForAgentTools,
			).toHaveBeenCalledOnce();
			expect(workflowRepository.findPublishedVersionFingerprintsForAgentTools).toHaveBeenCalledWith(
				PROJECT_ID,
				['workflow-1', 'missing-workflow'],
			);
			expect(
				workflowPublishedVersionRepository.findPublishedVersionFingerprintsForAgentTools,
			).not.toHaveBeenCalled();
			expect(result).toEqual(new Map([['workflow-1', 'legacy-version']]));
		});
	});
});
