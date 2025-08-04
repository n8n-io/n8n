'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getSharedWorkflowIds = getSharedWorkflowIds;
exports.getSharedWorkflow = getSharedWorkflow;
exports.getWorkflowById = getWorkflowById;
exports.createWorkflow = createWorkflow;
exports.setWorkflowAsActive = setWorkflowAsActive;
exports.setWorkflowAsInactive = setWorkflowAsInactive;
exports.deleteWorkflow = deleteWorkflow;
exports.updateWorkflow = updateWorkflow;
exports.parseTagNames = parseTagNames;
exports.getWorkflowTags = getWorkflowTags;
exports.updateTags = updateTags;
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const license_1 = require('@/license');
const workflow_sharing_service_1 = require('@/workflows/workflow-sharing.service');
function insertIf(condition, elements) {
	return condition ? elements : [];
}
async function getSharedWorkflowIds(user, scopes, projectId) {
	if (di_1.Container.get(license_1.License).isSharingEnabled()) {
		return await di_1.Container.get(
			workflow_sharing_service_1.WorkflowSharingService,
		).getSharedWorkflowIds(user, {
			scopes,
			projectId,
		});
	} else {
		return await di_1.Container.get(
			workflow_sharing_service_1.WorkflowSharingService,
		).getSharedWorkflowIds(user, {
			workflowRoles: ['workflow:owner'],
			projectRoles: ['project:personalOwner'],
			projectId,
		});
	}
}
async function getSharedWorkflow(user, workflowId) {
	return await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
		where: {
			...(!['global:owner', 'global:admin'].includes(user.role) && { userId: user.id }),
			...(workflowId && { workflowId }),
		},
		relations: [
			...insertIf(!di_1.Container.get(config_1.GlobalConfig).tags.disabled, ['workflow.tags']),
			'workflow',
		],
	});
}
async function getWorkflowById(id) {
	return await di_1.Container.get(db_1.WorkflowRepository).findOne({
		where: { id },
	});
}
async function createWorkflow(workflow, user, personalProject, role) {
	const { manager: dbManager } = di_1.Container.get(db_1.SharedWorkflowRepository);
	return await dbManager.transaction(async (transactionManager) => {
		const newWorkflow = new db_1.WorkflowEntity();
		Object.assign(newWorkflow, workflow);
		const savedWorkflow = await transactionManager.save(newWorkflow);
		const newSharedWorkflow = new db_1.SharedWorkflow();
		Object.assign(newSharedWorkflow, {
			role,
			user,
			project: personalProject,
			workflow: savedWorkflow,
		});
		await transactionManager.save(newSharedWorkflow);
		return savedWorkflow;
	});
}
async function setWorkflowAsActive(workflowId) {
	await di_1.Container.get(db_1.WorkflowRepository).update(workflowId, {
		active: true,
		updatedAt: new Date(),
	});
}
async function setWorkflowAsInactive(workflowId) {
	return await di_1.Container.get(db_1.WorkflowRepository).update(workflowId, {
		active: false,
		updatedAt: new Date(),
	});
}
async function deleteWorkflow(workflow) {
	return await di_1.Container.get(db_1.WorkflowRepository).remove(workflow);
}
async function updateWorkflow(workflowId, updateData) {
	return await di_1.Container.get(db_1.WorkflowRepository).update(workflowId, updateData);
}
function parseTagNames(tags) {
	return tags.split(',').map((tag) => tag.trim());
}
async function getWorkflowTags(workflowId) {
	return await di_1.Container.get(db_1.TagRepository).find({
		select: ['id', 'name', 'createdAt', 'updatedAt'],
		where: {
			workflowMappings: {
				...(workflowId && { workflowId }),
			},
		},
	});
}
async function updateTags(workflowId, newTags) {
	const { manager: dbManager } = di_1.Container.get(db_1.SharedWorkflowRepository);
	await dbManager.transaction(async (transactionManager) => {
		const oldTags = await transactionManager.findBy(db_1.WorkflowTagMapping, { workflowId });
		if (oldTags.length > 0) {
			await transactionManager.delete(db_1.WorkflowTagMapping, oldTags);
		}
		await transactionManager.insert(
			db_1.WorkflowTagMapping,
			newTags.map((tagId) => ({ tagId, workflowId })),
		);
	});
}
//# sourceMappingURL=workflows.service.js.map
