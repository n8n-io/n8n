import type { Arazzo1Rule } from '../../visitors';
import type { UserContext } from '../../walk';

export const WorkflowIdUnique: Arazzo1Rule = () => {
  const seenWorkflow = new Set();

  return {
    Workflow: {
      enter(workflow, { report, location }: UserContext) {
        if (!workflow.workflowId) return;
        if (seenWorkflow.has(workflow.workflowId)) {
          report({
            message: 'Every workflow must have a unique `workflowId`.',
            location: location.child([workflow.workflowId]),
          });
        }
        seenWorkflow.add(workflow.workflowId);
      },
    },
  };
};
