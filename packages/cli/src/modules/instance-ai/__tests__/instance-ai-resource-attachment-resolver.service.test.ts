import type { InstanceAiAttachment, InstanceAiNodesAttachment } from '@n8n/api-types';
import type { User, WorkflowEntity } from '@n8n/db';
import type { INode, IWorkflowGroup } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { InstanceAiMemoryService } from '../instance-ai-memory.service';
import { InstanceAiResourceAttachmentResolverService } from '../instance-ai-resource-attachment-resolver.service';

const user = mock<User>({ id: 'user-1' });

function node(overrides: Partial<INode> = {}): INode {
	return {
		id: 'node-1',
		name: 'Canonical node',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4.2,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

function group(overrides: Partial<IWorkflowGroup> = {}): IWorkflowGroup {
	return {
		id: 'group-1',
		name: 'Canonical group',
		nodeIds: ['node-1'],
		...overrides,
	};
}

function workflow(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
	return mock<WorkflowEntity>({
		id: 'workflow-1',
		name: 'Canonical workflow',
		isArchived: false,
		nodes: [node()],
		nodeGroups: [group()],
		...overrides,
	});
}

function nodesAttachment(
	overrides: Partial<InstanceAiNodesAttachment> = {},
): InstanceAiNodesAttachment {
	return {
		type: 'nodes',
		workflowId: 'workflow-1',
		sets: [{ nodes: [{ id: 'node-1', name: 'Spoofed node' }] }],
		...overrides,
	};
}

describe('InstanceAiResourceAttachmentResolverService', () => {
	const memoryService = mock<InstanceAiMemoryService>();
	const workflowFinder = mock<WorkflowFinderService>();
	const resolver = new InstanceAiResourceAttachmentResolverService(memoryService, workflowFinder);

	beforeEach(() => {
		vi.clearAllMocks();
		memoryService.getThreadProjectId.mockResolvedValue('project-1');
		workflowFinder.findWorkflowsByIdsForUser.mockResolvedValue([workflow()]);
	});

	it('loads referenced workflows in the thread project and replaces client display metadata', async () => {
		const attachments: InstanceAiAttachment[] = [
			{ type: 'workflow', id: 'workflow-1', name: 'Spoofed workflow' },
			nodesAttachment(),
		];

		await expect(resolver.resolve(user, 'thread-1', attachments)).resolves.toEqual([
			{ type: 'workflow', id: 'workflow-1', name: 'Canonical workflow' },
			{
				type: 'nodes',
				workflowId: 'workflow-1',
				workflowName: 'Canonical workflow',
				sets: [
					{
						nodes: [
							{
								id: 'node-1',
								name: 'Canonical node',
								type: 'n8n-nodes-base.httpRequest',
								typeVersion: 4.2,
							},
						],
					},
				],
			},
		]);
		expect(workflowFinder.findWorkflowsByIdsForUser).toHaveBeenCalledWith(
			['workflow-1'],
			user,
			['workflow:read'],
			{ projectId: 'project-1' },
		);
	});

	it('resolves complete one-node group membership instead of trusting the submitted nodes', async () => {
		const attachment = nodesAttachment({
			sets: [
				{
					selectionKind: 'canvas-group',
					canvasGroupId: 'group-1',
					canvasGroupName: 'Spoofed group',
					nodes: [{ id: 'other-node' }],
				},
			],
		});

		const resolved = await resolver.resolve(user, 'thread-1', [attachment]);

		expect(resolved).toEqual([
			{
				type: 'nodes',
				workflowId: 'workflow-1',
				workflowName: 'Canonical workflow',
				sets: [
					{
						selectionKind: 'canvas-group',
						canvasGroupId: 'group-1',
						canvasGroupName: 'Canonical group',
						nodes: [
							{
								id: 'node-1',
								name: 'Canonical node',
								type: 'n8n-nodes-base.httpRequest',
								typeVersion: 4.2,
							},
						],
					},
				],
			},
		]);
	});

	it('accepts a 50-node group and rejects a 51-node group', async () => {
		const nodes = Array.from({ length: 51 }, (_, index) =>
			node({ id: `node-${index}`, name: `Node ${index}` }),
		);
		const attachment = nodesAttachment({
			sets: [
				{
					selectionKind: 'canvas-group',
					canvasGroupId: 'group-1',
					canvasGroupName: 'Group',
					nodes: [{ id: 'node-0' }],
				},
			],
		});

		workflowFinder.findWorkflowsByIdsForUser.mockResolvedValueOnce([
			workflow({ nodes, nodeGroups: [group({ nodeIds: nodes.slice(0, 50).map(({ id }) => id) })] }),
		]);
		const accepted = await resolver.resolve(user, 'thread-1', [attachment]);
		expect(accepted?.[0]).toMatchObject({
			type: 'nodes',
			sets: [{ nodes: expect.arrayContaining([expect.objectContaining({ id: 'node-49' })]) }],
		});

		workflowFinder.findWorkflowsByIdsForUser.mockResolvedValueOnce([
			workflow({ nodes, nodeGroups: [group({ nodeIds: nodes.map(({ id }) => id) })] }),
		]);
		await expect(resolver.resolve(user, 'thread-1', [attachment])).rejects.toBeInstanceOf(
			BadRequestError,
		);
	});

	it('rejects node IDs that resolve more than once', async () => {
		workflowFinder.findWorkflowsByIdsForUser.mockResolvedValue([
			workflow({ nodes: [node(), node({ name: 'Duplicate node' })] }),
		]);

		await expect(resolver.resolve(user, 'thread-1', [nodesAttachment()])).rejects.toBeInstanceOf(
			BadRequestError,
		);
	});

	it('rejects groups with unresolved or repeated members', async () => {
		const attachment = nodesAttachment({
			sets: [
				{
					selectionKind: 'canvas-group',
					canvasGroupId: 'group-1',
					canvasGroupName: 'Group',
					nodes: [{ id: 'node-1' }],
				},
			],
		});
		workflowFinder.findWorkflowsByIdsForUser.mockResolvedValue([
			workflow({ nodeGroups: [group({ nodeIds: ['node-1', 'node-1'] })] }),
		]);

		await expect(resolver.resolve(user, 'thread-1', [attachment])).rejects.toBeInstanceOf(
			BadRequestError,
		);
	});

	it('rejects workflows that are not readable in the thread project', async () => {
		workflowFinder.findWorkflowsByIdsForUser.mockResolvedValue([]);

		await expect(
			resolver.resolve(user, 'thread-1', [
				{ type: 'workflow', id: 'workflow-1', name: 'Workflow' },
			]),
		).rejects.toBeInstanceOf(BadRequestError);
	});

	it('rejects resource attachments when the thread has no project', async () => {
		memoryService.getThreadProjectId.mockResolvedValue(undefined);

		await expect(
			resolver.resolve(user, 'thread-1', [{ type: 'workflow', id: 'workflow-1' }]),
		).rejects.toBeInstanceOf(BadRequestError);
		expect(workflowFinder.findWorkflowsByIdsForUser).not.toHaveBeenCalled();
	});

	it('preserves interleaved attachment order', async () => {
		const attachments: InstanceAiAttachment[] = [
			{ type: 'agent', id: 'agent-1', name: 'Agent', projectId: 'project-1' },
			nodesAttachment(),
			{ type: 'file', data: 'YQ==', mimeType: 'text/plain', fileName: 'note.txt' },
			{ type: 'workflow', id: 'workflow-1' },
		];

		const resolved = await resolver.resolve(user, 'thread-1', attachments);

		expect(resolved?.map(({ type }) => type)).toEqual(['agent', 'nodes', 'file', 'workflow']);
	});
});
