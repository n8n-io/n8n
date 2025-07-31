import type { PushPayload } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type { Workflow } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { CollaborationState } from '@/collaboration/collaboration.state';
import { Push } from '@/push';
import type { OnPushMessage } from '@/push/types';
import { AccessService } from '@/services/access.service';
import { WorkflowService } from '@/workflows/workflow.service';

import type {
	WorkflowClosedMessage,
	WorkflowOpenedMessage,
	WorkflowEditMessage,
	WorkflowCursorMessage,
	WorkflowEditOperation,
} from './collaboration.message';
import { parseWorkflowMessage } from './collaboration.message';

/**
 * Service for managing collaboration feature between users. E.g. keeping
 * track of active users for a workflow.
 */
@Service()
export class CollaborationService {
	private readonly operationHistory = new Map<string, WorkflowEditOperation[]>();
	private readonly operationCounter = new Map<string, number>();

	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly push: Push,
		private readonly state: CollaborationState,
		private readonly userRepository: UserRepository,
		private readonly accessService: AccessService,
		private readonly workflowService: WorkflowService,
	) {}

	init() {
		this.push.on('message', async (event: OnPushMessage) => {
			try {
				await this.handleUserMessage(event.userId, event.msg);
			} catch (error) {
				this.errorReporter.error(
					new UnexpectedError('Error handling CollaborationService push message', {
						extra: {
							msg: event.msg,
							userId: event.userId,
						},
						cause: error,
					}),
				);
			}
		});
	}

	async handleUserMessage(userId: User['id'], msg: unknown) {
		const workflowMessage = await parseWorkflowMessage(msg);

		if (workflowMessage.type === 'workflowOpened') {
			await this.handleWorkflowOpened(userId, workflowMessage);
		} else if (workflowMessage.type === 'workflowClosed') {
			await this.handleWorkflowClosed(userId, workflowMessage);
		} else if (workflowMessage.type === 'workflowEdit') {
			await this.handleWorkflowEdit(userId, workflowMessage);
		} else if (workflowMessage.type === 'workflowCursor') {
			await this.handleWorkflowCursor(userId, workflowMessage);
		}
	}

	private async handleWorkflowOpened(userId: User['id'], msg: WorkflowOpenedMessage) {
		const { workflowId } = msg;

		if (!(await this.accessService.hasReadAccess(userId, workflowId))) {
			return;
		}

		await this.state.addCollaborator(workflowId, userId);

		await this.sendWorkflowUsersChangedMessage(workflowId);
	}

	private async handleWorkflowClosed(userId: User['id'], msg: WorkflowClosedMessage) {
		const { workflowId } = msg;

		if (!(await this.accessService.hasReadAccess(userId, workflowId))) {
			return;
		}

		await this.state.removeCollaborator(workflowId, userId);

		await this.sendWorkflowUsersChangedMessage(workflowId);

		// Clean up operation history if no more collaborators
		const collaborators = await this.state.getCollaborators(workflowId);
		if (collaborators.length === 0) {
			this.cleanupWorkflowHistory(workflowId);
		}
	}

	private async handleWorkflowEdit(userId: User['id'], msg: WorkflowEditMessage) {
		const { workflowId, operation, timestamp, operationId } = msg;

		// Check if user has write access to the workflow
		if (!(await this.accessService.hasWriteAccess(userId, workflowId))) {
			return;
		}

		try {
			// Apply operational transform to resolve conflicts
			const transformedOperation = await this.applyOperationalTransform(
				workflowId,
				operation,
				timestamp,
			);

			if (!transformedOperation) {
				// Operation was cancelled due to conflict
				return;
			}

			// Apply the operation to the workflow
			await this.applyWorkflowOperation(workflowId, transformedOperation, userId);

			// Store operation in history for conflict resolution
			this.addOperationToHistory(workflowId, transformedOperation);

			// Broadcast the operation to other collaborators
			await this.broadcastWorkflowEdit(workflowId, transformedOperation, userId, operationId);
		} catch (error) {
			this.errorReporter.error(
				new UnexpectedError('Error handling workflow edit operation', {
					extra: {
						workflowId,
						operation,
						userId,
						operationId,
					},
					cause: error,
				}),
			);
		}
	}

	private async handleWorkflowCursor(userId: User['id'], msg: WorkflowCursorMessage) {
		const { workflowId, position, selectedNodeId } = msg;

		// Check if user has read access to the workflow
		if (!(await this.accessService.hasReadAccess(userId, workflowId))) {
			return;
		}

		// Broadcast cursor position to other collaborators
		await this.broadcastCursorPosition(workflowId, userId, position, selectedNodeId);
	}

	private async applyOperationalTransform(
		workflowId: string,
		operation: WorkflowEditOperation,
		timestamp: number,
	): Promise<WorkflowEditOperation | null> {
		const history = this.operationHistory.get(workflowId) ?? [];
		const conflictingOperations = history.filter(
			(op) =>
				(op.position || 0) >= (operation.position || 0) &&
				this.isConflictingOperation(operation, op),
		);

		if (conflictingOperations.length === 0) {
			return operation;
		}

		// Apply transformation rules based on operation types
		return this.transformOperation(operation, conflictingOperations);
	}

	private isConflictingOperation(op1: WorkflowEditOperation, op2: WorkflowEditOperation): boolean {
		// Check if operations conflict based on their actions and targets
		if (op1.action === 'removeNode' && op2.action === 'updateNode') {
			return op1.nodeId === op2.nodeId;
		}

		if (op1.action === 'addNode' && op2.action === 'addNode') {
			const node1 = op1.nodeData;
			const node2 = op2.nodeData;
			// Check if nodes overlap in position
			const distance = Math.sqrt(
				Math.pow(node1.position[0] - node2.position[0], 2) +
					Math.pow(node1.position[1] - node2.position[1], 2),
			);
			return distance < 50; // Minimum distance between nodes
		}

		return false;
	}

	private transformOperation(
		operation: WorkflowEditOperation,
		conflictingOps: WorkflowEditOperation[],
	): WorkflowEditOperation | null {
		// Implement operational transform logic
		// For now, apply simple conflict resolution

		if (operation.action === 'addNode') {
			// Adjust position if there are conflicting node additions
			const positionAdjustment = conflictingOps.length * 50;
			return {
				...operation,
				nodeData: {
					...operation.nodeData,
					position: [
						operation.nodeData.position[0] + positionAdjustment,
						operation.nodeData.position[1] + positionAdjustment,
					] as [number, number],
				},
			};
		}

		if (operation.action === 'updateNode' || operation.action === 'removeNode') {
			// Check if node still exists after conflicting operations
			const hasRemoveConflict = conflictingOps.some(
				(op) => op.action === 'removeNode' && op.nodeId === operation.nodeId,
			);

			if (hasRemoveConflict) {
				// Node was already removed, cancel this operation
				return null;
			}
		}

		return operation;
	}

	private async applyWorkflowOperation(
		workflowId: string,
		operation: WorkflowEditOperation,
		userId: string,
	): Promise<void> {
		// Get current workflow data
		const workflow = await this.workflowService.get(workflowId, true);

		if (!workflow) {
			throw new Error(`Workflow ${workflowId} not found`);
		}

		const workflowData = { ...workflow };

		// Apply the operation to workflow data
		switch (operation.action) {
			case 'addNode':
				const nodeOp = operation as any;
				if (!workflowData.nodes) workflowData.nodes = [];
				workflowData.nodes.push(nodeOp.nodeData);
				break;

			case 'removeNode':
				const removeOp = operation as any;
				if (workflowData.nodes) {
					workflowData.nodes = workflowData.nodes.filter(
						(node: any) => node.id !== removeOp.nodeId,
					);
				}
				// Also remove any connections involving this node
				if (workflowData.connections) {
					delete workflowData.connections[removeOp.nodeId];
					Object.keys(workflowData.connections).forEach((sourceNodeName) => {
						Object.keys(workflowData.connections[sourceNodeName]).forEach((outputIndex) => {
							workflowData.connections[sourceNodeName][outputIndex] = workflowData.connections[
								sourceNodeName
							][outputIndex].filter((connection: any) => connection.node !== removeOp.nodeId);
						});
					});
				}
				break;

			case 'updateNode':
				const updateOp = operation as any;
				if (workflowData.nodes) {
					const nodeIndex = workflowData.nodes.findIndex(
						(node: any) => node.id === updateOp.nodeId,
					);
					if (nodeIndex !== -1) {
						workflowData.nodes[nodeIndex] = {
							...workflowData.nodes[nodeIndex],
							...updateOp.changes,
						};
					}
				}
				break;

			case 'addConnection':
				const connOp = operation as any;
				if (!workflowData.connections) workflowData.connections = {};
				if (!workflowData.connections[connOp.connection.source]) {
					workflowData.connections[connOp.connection.source] = {};
				}
				if (!workflowData.connections[connOp.connection.source][connOp.connection.sourceIndex]) {
					workflowData.connections[connOp.connection.source][connOp.connection.sourceIndex] = [];
				}
				workflowData.connections[connOp.connection.source][connOp.connection.sourceIndex].push({
					node: connOp.connection.destination,
					type: connOp.connection.type || 'main',
					index: connOp.connection.destinationIndex,
				});
				break;

			case 'removeConnection':
				const removeConnOp = operation as any;
				if (
					workflowData.connections?.[removeConnOp.connection.source]?.[
						removeConnOp.connection.sourceIndex
					]
				) {
					workflowData.connections[removeConnOp.connection.source][
						removeConnOp.connection.sourceIndex
					] = workflowData.connections[removeConnOp.connection.source][
						removeConnOp.connection.sourceIndex
					].filter(
						(connection: any) =>
							connection.node !== removeConnOp.connection.destination ||
							connection.index !== removeConnOp.connection.destinationIndex,
					);
				}
				break;
		}

		// Save the updated workflow
		await this.workflowService.update(userId, workflowId, workflowData);
	}

	private addOperationToHistory(workflowId: string, operation: WorkflowEditOperation): void {
		if (!this.operationHistory.has(workflowId)) {
			this.operationHistory.set(workflowId, []);
		}

		const history = this.operationHistory.get(workflowId)!;
		history.push(operation);

		// Keep only last 100 operations to prevent memory leaks
		if (history.length > 100) {
			history.splice(0, history.length - 100);
		}
	}

	private async broadcastWorkflowEdit(
		workflowId: string,
		operation: WorkflowEditOperation,
		originUserId: string,
		operationId: string,
	): Promise<void> {
		const collaborators = await this.state.getCollaborators(workflowId);
		const userIds = collaborators
			.map((user) => user.userId)
			.filter((userId) => userId !== originUserId); // Don't send back to originator

		if (userIds.length === 0) {
			return;
		}

		const msgData = {
			type: 'workflowEditBroadcast',
			data: {
				workflowId,
				operation,
				userId: originUserId,
				operationId,
				timestamp: Date.now(),
			},
		};

		this.push.sendToUsers(msgData, userIds);
	}

	private async broadcastCursorPosition(
		workflowId: string,
		userId: string,
		position?: { x: number; y: number },
		selectedNodeId?: string,
	): Promise<void> {
		const collaborators = await this.state.getCollaborators(workflowId);
		const userIds = collaborators.map((user) => user.userId).filter((id) => id !== userId); // Don't send back to originator

		if (userIds.length === 0) {
			return;
		}

		const msgData = {
			type: 'workflowCursorBroadcast',
			data: {
				workflowId,
				userId,
				position,
				selectedNodeId,
				timestamp: Date.now(),
			},
		};

		this.push.sendToUsers(msgData, userIds);
	}

	private async sendWorkflowUsersChangedMessage(workflowId: Workflow['id']) {
		// We have already validated that all active workflow users
		// have proper access to the workflow, so we don't need to validate it again
		const collaborators = await this.state.getCollaborators(workflowId);
		const userIds = collaborators.map((user) => user.userId);

		if (userIds.length === 0) {
			return;
		}
		const users = await this.userRepository.getByIds(this.userRepository.manager, userIds);
		const activeCollaborators = users.map((user) => ({
			user: user.toIUser(),
			lastSeen: collaborators.find(({ userId }) => userId === user.id)!.lastSeen,
		}));
		const msgData: PushPayload<'collaboratorsChanged'> = {
			workflowId,
			collaborators: activeCollaborators,
		};

		this.push.sendToUsers({ type: 'collaboratorsChanged', data: msgData }, userIds);
	}

	/**
	 * Clean up operation history for closed workflows to prevent memory leaks
	 */
	cleanupWorkflowHistory(workflowId: string): void {
		this.operationHistory.delete(workflowId);
		this.operationCounter.delete(workflowId);
	}
}
