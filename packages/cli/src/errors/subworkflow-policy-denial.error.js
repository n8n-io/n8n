'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SubworkflowPolicyDenialError = exports.SUBWORKFLOW_DENIAL_BASE_DESCRIPTION = void 0;
const n8n_workflow_1 = require('n8n-workflow');
exports.SUBWORKFLOW_DENIAL_BASE_DESCRIPTION =
	'The sub-workflow you’re trying to execute limits which workflows it can be called by.';
class SubworkflowPolicyDenialError extends n8n_workflow_1.WorkflowOperationError {
	constructor({ subworkflowId, subworkflowProject, instanceUrl, hasReadAccess, ownerName, node }) {
		const descriptions = {
			default: exports.SUBWORKFLOW_DENIAL_BASE_DESCRIPTION,
			accessible: [
				exports.SUBWORKFLOW_DENIAL_BASE_DESCRIPTION,
				`<a href="${instanceUrl}/workflow/${subworkflowId}" target="_blank">Update sub-workflow settings</a> to allow other workflows to call it.`,
			].join(' '),
			inaccessiblePersonalProject: [
				exports.SUBWORKFLOW_DENIAL_BASE_DESCRIPTION,
				`You will need ${ownerName} to update the sub-workflow (${subworkflowId}) settings to allow this workflow to call it.`,
			].join(' '),
			inaccesibleTeamProject: [
				exports.SUBWORKFLOW_DENIAL_BASE_DESCRIPTION,
				`You will need an admin from the ${subworkflowProject.name} project to update the sub-workflow (${subworkflowId}) settings to allow this workflow to call it.`,
			].join(' '),
		};
		const description = () => {
			if (hasReadAccess) return descriptions.accessible;
			if (subworkflowProject.type === 'personal') return descriptions.inaccessiblePersonalProject;
			if (subworkflowProject.type === 'team') return descriptions.inaccesibleTeamProject;
			return descriptions.default;
		};
		super(
			`The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
			node,
			description(),
		);
	}
}
exports.SubworkflowPolicyDenialError = SubworkflowPolicyDenialError;
//# sourceMappingURL=subworkflow-policy-denial.error.js.map
