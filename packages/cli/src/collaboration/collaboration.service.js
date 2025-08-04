'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.CollaborationService = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const collaboration_state_1 = require('@/collaboration/collaboration.state');
const push_1 = require('@/push');
const access_service_1 = require('@/services/access.service');
const workflow_service_1 = require('@/workflows/workflow.service');
const workflow_finder_service_1 = require('@/workflows/workflow-finder.service');
const collaboration_message_1 = require('./collaboration.message');
let CollaborationService = class CollaborationService {
	constructor(
		errorReporter,
		push,
		state,
		userRepository,
		accessService,
		workflowService,
		workflowFinderService,
	) {
		this.errorReporter = errorReporter;
		this.push = push;
		this.state = state;
		this.userRepository = userRepository;
		this.accessService = accessService;
		this.workflowService = workflowService;
		this.workflowFinderService = workflowFinderService;
		this.operationHistory = new Map();
		this.operationCounter = new Map();
	}
	init() {
		this.push.on('message', async (event) => {
			try {
				await this.handleUserMessage(event.userId, event.msg);
			} catch (error) {
				this.errorReporter.error(
					new n8n_workflow_1.UnexpectedError('Error handling CollaborationService push message', {
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
	async handleUserMessage(userId, msg) {
		const workflowMessage = await (0, collaboration_message_1.parseWorkflowMessage)(msg);
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
	async handleWorkflowOpened(userId, msg) {
		const { workflowId } = msg;
		if (!(await this.accessService.hasReadAccess(userId, workflowId))) {
			return;
		}
		await this.state.addCollaborator(workflowId, userId);
		await this.sendWorkflowUsersChangedMessage(workflowId);
	}
	async handleWorkflowClosed(userId, msg) {
		const { workflowId } = msg;
		if (!(await this.accessService.hasReadAccess(userId, workflowId))) {
			return;
		}
		await this.state.removeCollaborator(workflowId, userId);
		await this.sendWorkflowUsersChangedMessage(workflowId);
		const collaborators = await this.state.getCollaborators(workflowId);
		if (collaborators.length === 0) {
			this.cleanupWorkflowHistory(workflowId);
		}
	}
	async handleWorkflowEdit(userId, msg) {
		const { workflowId, operation, timestamp, operationId } = msg;
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user) {
			return;
		}
		const hasWriteAccess = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:update',
		]);
		if (!hasWriteAccess) {
			return;
		}
		try {
			const transformedOperation = await this.applyOperationalTransform(
				workflowId,
				operation,
				timestamp,
			);
			if (!transformedOperation) {
				return;
			}
			await this.applyWorkflowOperation(workflowId, transformedOperation, userId);
			this.addOperationToHistory(workflowId, transformedOperation);
			await this.broadcastWorkflowEdit(workflowId, transformedOperation, userId, operationId);
		} catch (error) {
			this.errorReporter.error(
				new n8n_workflow_1.UnexpectedError('Error handling workflow edit operation', {
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
	async handleWorkflowCursor(userId, msg) {
		const { workflowId, position, selectedNodeId } = msg;
		if (!(await this.accessService.hasReadAccess(userId, workflowId))) {
			return;
		}
		await this.broadcastCursorPosition(workflowId, userId, position, selectedNodeId);
	}
	async applyOperationalTransform(workflowId, operation, _timestamp) {
		const history = this.operationHistory.get(workflowId) ?? [];
		const conflictingOperations = history.filter(
			(op) =>
				(op.position || 0) >= (operation.position || 0) &&
				this.isConflictingOperation(operation, op),
		);
		if (conflictingOperations.length === 0) {
			return operation;
		}
		return this.transformOperation(operation, conflictingOperations);
	}
	isConflictingOperation(op1, op2) {
		if (op1.action === 'removeNode' && op2.action === 'updateNode') {
			return op1.nodeId === op2.nodeId;
		}
		if (op1.action === 'addNode' && op2.action === 'addNode') {
			const node1 = op1.nodeData;
			const node2 = op2.nodeData;
			const distance = Math.sqrt(
				Math.pow(node1.position[0] - node2.position[0], 2) +
					Math.pow(node1.position[1] - node2.position[1], 2),
			);
			return distance < 50;
		}
		return false;
	}
	transformOperation(operation, conflictingOps) {
		if (operation.action === 'addNode') {
			const positionAdjustment = conflictingOps.length * 50;
			return {
				...operation,
				nodeData: {
					...operation.nodeData,
					position: [
						operation.nodeData.position[0] + positionAdjustment,
						operation.nodeData.position[1] + positionAdjustment,
					],
				},
			};
		}
		if (operation.action === 'updateNode' || operation.action === 'removeNode') {
			const hasRemoveConflict = conflictingOps.some(
				(op) => op.action === 'removeNode' && op.nodeId === operation.nodeId,
			);
			if (hasRemoveConflict) {
				return null;
			}
		}
		return operation;
	}
	async applyWorkflowOperation(workflowId, operation, userId) {
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user) {
			throw new Error(`User ${userId} not found`);
		}
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		if (!workflow) {
			throw new Error(`Workflow ${workflowId} not found`);
		}
		const workflowData = { ...workflow };
		switch (operation.action) {
			case 'addNode':
				const nodeOp = operation;
				if (!workflowData.nodes) workflowData.nodes = [];
				workflowData.nodes.push(nodeOp.nodeData);
				break;
			case 'removeNode':
				const removeOp = operation;
				if (workflowData.nodes) {
					workflowData.nodes = workflowData.nodes.filter((node) => node.id !== removeOp.nodeId);
				}
				if (workflowData.connections) {
					delete workflowData.connections[removeOp.nodeId];
					Object.keys(workflowData.connections).forEach((sourceNodeName) => {
						Object.keys(workflowData.connections[sourceNodeName]).forEach((outputIndex) => {
							workflowData.connections[sourceNodeName][outputIndex] = workflowData.connections[
								sourceNodeName
							][outputIndex].filter((connection) => connection.node !== removeOp.nodeId);
						});
					});
				}
				break;
			case 'updateNode':
				const updateOp = operation;
				if (workflowData.nodes) {
					const nodeIndex = workflowData.nodes.findIndex((node) => node.id === updateOp.nodeId);
					if (nodeIndex !== -1) {
						workflowData.nodes[nodeIndex] = {
							...workflowData.nodes[nodeIndex],
							...updateOp.changes,
						};
					}
				}
				break;
			case 'addConnection':
				const connOp = operation;
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
				const removeConnOp = operation;
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
						(connection) =>
							connection.node !== removeConnOp.connection.destination ||
							connection.index !== removeConnOp.connection.destinationIndex,
					);
				}
				break;
		}
		await this.workflowService.update(user, workflowData, workflowId);
	}
	addOperationToHistory(workflowId, operation) {
		if (!this.operationHistory.has(workflowId)) {
			this.operationHistory.set(workflowId, []);
		}
		const history = this.operationHistory.get(workflowId);
		history.push(operation);
		if (history.length > 100) {
			history.splice(0, history.length - 100);
		}
	}
	async broadcastWorkflowEdit(workflowId, operation, originUserId, operationId) {
		const collaborators = await this.state.getCollaborators(workflowId);
		const userIds = collaborators
			.map((user) => user.userId)
			.filter((userId) => userId !== originUserId);
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
	async broadcastCursorPosition(workflowId, userId, position, selectedNodeId) {
		const collaborators = await this.state.getCollaborators(workflowId);
		const userIds = collaborators.map((user) => user.userId).filter((id) => id !== userId);
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
	async sendWorkflowUsersChangedMessage(workflowId) {
		const collaborators = await this.state.getCollaborators(workflowId);
		const userIds = collaborators.map((user) => user.userId);
		if (userIds.length === 0) {
			return;
		}
		const users = await this.userRepository.getByIds(this.userRepository.manager, userIds);
		const activeCollaborators = users.map((user) => ({
			user: user.toIUser(),
			lastSeen: collaborators.find(({ userId }) => userId === user.id).lastSeen,
		}));
		const msgData = {
			workflowId,
			collaborators: activeCollaborators,
		};
		this.push.sendToUsers({ type: 'collaboratorsChanged', data: msgData }, userIds);
	}
	cleanupWorkflowHistory(workflowId) {
		this.operationHistory.delete(workflowId);
		this.operationCounter.delete(workflowId);
	}
};
exports.CollaborationService = CollaborationService;
exports.CollaborationService = CollaborationService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			n8n_core_1.ErrorReporter,
			push_1.Push,
			collaboration_state_1.CollaborationState,
			db_1.UserRepository,
			access_service_1.AccessService,
			workflow_service_1.WorkflowService,
			workflow_finder_service_1.WorkflowFinderService,
		]),
	],
	CollaborationService,
);
//# sourceMappingURL=collaboration.service.js.map
