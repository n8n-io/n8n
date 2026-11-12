import { WorkflowExecution } from './workflow-execution.entity';
import { WorkflowSeededStep } from './workflow-seeded-step.entity';
import { WorkflowStepExecution } from './workflow-step-execution.entity';
import { WorkflowStepRound } from './workflow-step-round.entity';

export const entities = [
	WorkflowExecution,
	WorkflowStepExecution,
	WorkflowSeededStep,
	WorkflowStepRound,
];

export { WorkflowExecution };
export { WorkflowStepExecution };
export { WorkflowSeededStep };
export { WorkflowStepRound };
