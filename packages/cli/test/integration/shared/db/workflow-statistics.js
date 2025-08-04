'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createWorkflowStatisticsItem = createWorkflowStatisticsItem;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
async function createWorkflowStatisticsItem(workflowId, data) {
	const entity = di_1.Container.get(db_1.WorkflowStatisticsRepository).create({
		count: 0,
		latestEvent: new Date().toISOString(),
		name: 'manual_success',
		...(data ?? {}),
		workflowId,
	});
	await di_1.Container.get(db_1.WorkflowStatisticsRepository).insert(entity);
	return entity;
}
//# sourceMappingURL=workflow-statistics.js.map
