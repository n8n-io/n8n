'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createWorkflowHistoryItem = createWorkflowHistoryItem;
exports.createManyWorkflowHistoryItems = createManyWorkflowHistoryItems;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const uuid_1 = require('uuid');
async function createWorkflowHistoryItem(workflowId, data) {
	return await di_1.Container.get(db_1.WorkflowHistoryRepository).save({
		authors: 'John Smith',
		connections: {},
		nodes: [
			{
				id: 'uuid-1234',
				name: 'Start',
				parameters: {},
				position: [-20, 260],
				type: 'n8n-nodes-base.start',
				typeVersion: 1,
			},
		],
		versionId: (0, uuid_1.v4)(),
		...(data ?? {}),
		workflowId,
	});
}
async function createManyWorkflowHistoryItems(workflowId, count, time) {
	const baseTime = (time ?? new Date()).valueOf();
	return await Promise.all(
		[...Array(count)].map(
			async (_, i) =>
				await createWorkflowHistoryItem(workflowId, {
					createdAt: new Date(baseTime + i),
					updatedAt: new Date(baseTime + i),
				}),
		),
	);
}
//# sourceMappingURL=workflow-history.js.map
