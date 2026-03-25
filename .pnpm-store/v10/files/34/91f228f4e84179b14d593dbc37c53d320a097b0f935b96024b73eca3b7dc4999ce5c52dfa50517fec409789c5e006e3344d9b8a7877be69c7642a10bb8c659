import type { Arazzo1Rule } from '../../visitors';
import type { UserContext } from '../../walk';

export const StepIdUnique: Arazzo1Rule = () => {
  return {
    Workflow: {
      enter(workflow, { report, location }: UserContext) {
        if (!workflow.steps) return;
        const seenSteps = new Set();

        for (const step of workflow.steps) {
          if (!step.stepId) return;
          if (seenSteps.has(step.stepId)) {
            report({
              message: 'The `stepId` must be unique amongst all steps described in the workflow.',
              location: location.child(['steps', workflow.steps.indexOf(step)]),
            });
          }
          seenSteps.add(step.stepId);
        }
      },
    },
  };
};
