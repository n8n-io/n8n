module.exports = {
	workflow: {
		preExecute: [
			async function (workflow, mode, workflowContext) {
				const requiredTag = 'tagOne';
				const hasTag = await workflowContext.hasWorkflowTag(workflow.id, requiredTag);
				if (!hasTag) {
					throw new Error(`Workflow is missing required tag "${requiredTag}", aborting`);
				}
			},
		],
	},
};
