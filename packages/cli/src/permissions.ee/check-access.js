'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.userHasScopes = userHasScopes;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const typeorm_1 = require('@n8n/typeorm');
const n8n_workflow_1 = require('n8n-workflow');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
async function userHasScopes(user, scopes, globalOnly, { credentialId, workflowId, projectId }) {
	if ((0, permissions_1.hasGlobalScope)(user, scopes, { mode: 'allOf' })) return true;
	if (globalOnly) return false;
	const projectRoles = (0, permissions_1.rolesWithScope)('project', scopes);
	const userProjectIds = (
		await di_1.Container.get(db_1.ProjectRepository).find({
			where: {
				projectRelations: {
					userId: user.id,
					role: (0, typeorm_1.In)(projectRoles),
				},
			},
			select: ['id'],
		})
	).map((p) => p.id);
	if (credentialId) {
		const credentials = await di_1.Container.get(db_1.SharedCredentialsRepository).findBy({
			credentialsId: credentialId,
		});
		if (!credentials.length) {
			throw new not_found_error_1.NotFoundError(`Credential with ID "${credentialId}" not found.`);
		}
		return credentials.some(
			(c) =>
				userProjectIds.includes(c.projectId) &&
				(0, permissions_1.rolesWithScope)('credential', scopes).includes(c.role),
		);
	}
	if (workflowId) {
		const workflows = await di_1.Container.get(db_1.SharedWorkflowRepository).findBy({
			workflowId,
		});
		if (!workflows.length) {
			throw new not_found_error_1.NotFoundError(`Workflow with ID "${workflowId}" not found.`);
		}
		return workflows.some(
			(w) =>
				userProjectIds.includes(w.projectId) &&
				(0, permissions_1.rolesWithScope)('workflow', scopes).includes(w.role),
		);
	}
	if (projectId) return userProjectIds.includes(projectId);
	throw new n8n_workflow_1.UnexpectedError(
		"`@ProjectScope` decorator was used but does not have a `credentialId`, `workflowId`, or `projectId` in its URL parameters. This is likely an implementation error. If you're a developer, please check your URL is correct or that this should be using `@GlobalScope`.",
	);
}
//# sourceMappingURL=check-access.js.map
