module.exports = {
	workflow: {
		preExecute: [
			async function (workflow, mode, workflowChecks) {
				const requiredTag = 'tagOne';
				const hasTag = await workflowChecks.workflowHasTag(workflow.id, requiredTag);
				if (!hasTag) {
					throw new Error(`Workflow is missing required tag "${requiredTag}", aborting`);
				}
			},
		],
	},
};
