import type { InstanceAiAttachment, InstanceAiNodesAttachment } from '@n8n/api-types';
import type { User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode, IWorkflowGroup } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { InstanceAiMemoryService } from './instance-ai-memory.service';

type NodeReference = InstanceAiNodesAttachment['sets'][number]['nodes'][number];

interface WorkflowAttachmentIndex {
	workflow: WorkflowEntity;
	nodesById: Map<string, INode[]>;
	groupsById: Map<string, IWorkflowGroup[]>;
}

function indexById<T extends { id: string }>(items: T[]): Map<string, T[]> {
	const index = new Map<string, T[]>();
	for (const item of items) {
		const matches = index.get(item.id) ?? [];
		matches.push(item);
		index.set(item.id, matches);
	}
	return index;
}

@Service()
export class InstanceAiResourceAttachmentResolverService {
	constructor(
		private readonly memoryService: InstanceAiMemoryService,
		private readonly workflowFinder: WorkflowFinderService,
	) {}

	async resolve(
		user: User,
		threadId: string,
		attachments: InstanceAiAttachment[] | undefined,
	): Promise<InstanceAiAttachment[] | undefined> {
		if (!attachments) return undefined;

		const workflowIds = new Set<string>();
		for (const attachment of attachments) {
			if (attachment.type === 'workflow') workflowIds.add(attachment.id);
			if (attachment.type === 'nodes') workflowIds.add(attachment.workflowId);
		}
		if (workflowIds.size === 0) return attachments;

		const projectId = await this.memoryService.getThreadProjectId(threadId);
		if (!projectId) {
			throw new BadRequestError(
				"Resources can't be attached because this conversation isn't linked to a project. Start a new conversation and try again.",
			);
		}

		const workflows = await this.workflowFinder.findWorkflowsByIdsForUser(
			[...workflowIds],
			user,
			['workflow:read'],
			{ projectId },
		);
		const indexes = new Map<string, WorkflowAttachmentIndex>();
		for (const workflow of workflows) {
			if (workflow.isArchived) continue;
			indexes.set(workflow.id, {
				workflow,
				nodesById: indexById(workflow.nodes),
				groupsById: indexById(workflow.nodeGroups),
			});
		}

		if ([...workflowIds].some((workflowId) => !indexes.has(workflowId))) {
			throw new BadRequestError(
				"An attached workflow isn't available in this project. Remove it and try again.",
			);
		}

		return attachments.map((attachment) => {
			if (attachment.type === 'workflow') {
				const index = this.getWorkflowIndex(indexes, attachment.id);
				return { ...attachment, name: index.workflow.name };
			}

			if (attachment.type === 'nodes') {
				return this.resolveNodesAttachment(
					attachment,
					this.getWorkflowIndex(indexes, attachment.workflowId),
				);
			}

			return attachment;
		});
	}

	private getWorkflowIndex(
		indexes: Map<string, WorkflowAttachmentIndex>,
		workflowId: string,
	): WorkflowAttachmentIndex {
		const index = indexes.get(workflowId);
		if (!index) {
			throw new BadRequestError(
				"An attached workflow isn't available in this project. Remove it and try again.",
			);
		}
		return index;
	}

	private resolveNodesAttachment(
		attachment: InstanceAiNodesAttachment,
		index: WorkflowAttachmentIndex,
	): InstanceAiNodesAttachment {
		return {
			type: 'nodes',
			workflowId: index.workflow.id,
			workflowName: index.workflow.name,
			sets: attachment.sets.map((set) => {
				if (set.selectionKind === 'canvas-group') {
					const groups = index.groupsById.get(set.canvasGroupId) ?? [];
					if (groups.length !== 1) {
						throw new BadRequestError(
							'An attached canvas group is no longer available. Remove it and try again.',
						);
					}

					const [group] = groups;
					if (
						!group.name ||
						group.nodeIds.length === 0 ||
						group.nodeIds.length > 50 ||
						new Set(group.nodeIds).size !== group.nodeIds.length
					) {
						throw new BadRequestError(
							"An attached canvas group can't be used. Remove it and try again.",
						);
					}

					return {
						selectionKind: 'canvas-group',
						canvasGroupId: group.id,
						canvasGroupName: group.name,
						nodes: group.nodeIds.map((nodeId) => this.resolveNode(index, nodeId)),
						...(set.inputNode ? { inputNode: this.resolveNode(index, set.inputNode.id) } : {}),
						...(set.outputNode ? { outputNode: this.resolveNode(index, set.outputNode.id) } : {}),
					};
				}

				const nodes = set.nodes.map((node) => this.resolveNode(index, node.id));
				const legacyGroup = this.resolveLegacyGroup(index, set.canvasGroupId, nodes);
				return {
					nodes,
					...(set.selectionKind ? { selectionKind: set.selectionKind } : {}),
					...(set.inputNode ? { inputNode: this.resolveNode(index, set.inputNode.id) } : {}),
					...(set.outputNode ? { outputNode: this.resolveNode(index, set.outputNode.id) } : {}),
					...legacyGroup,
				};
			}),
		};
	}

	private resolveNode(index: WorkflowAttachmentIndex, nodeId: string): NodeReference {
		const nodes = index.nodesById.get(nodeId) ?? [];
		if (nodes.length !== 1) {
			throw new BadRequestError(
				'An attached node is no longer available in this workflow. Remove it and try again.',
			);
		}

		const [node] = nodes;
		return {
			id: node.id,
			name: node.name,
			type: node.type,
			typeVersion: node.typeVersion,
		};
	}

	private resolveLegacyGroup(
		index: WorkflowAttachmentIndex,
		groupId: string | undefined,
		nodes: NodeReference[],
	): { canvasGroupId: string; canvasGroupName: string } | Record<string, never> {
		if (!groupId) return {};

		const groups = index.groupsById.get(groupId) ?? [];
		if (groups.length !== 1) return {};

		const [group] = groups;
		const memberIds = new Set(group.nodeIds);
		if (!group.name || nodes.some((node) => !memberIds.has(node.id))) return {};

		return { canvasGroupId: group.id, canvasGroupName: group.name };
	}
}
