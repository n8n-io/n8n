import { CreateWorkflowExecution1778529600000 } from './1778529600000-CreateWorkflowExecution';
import { CreateWorkflowStepExecution1784890100000 } from './1784890100000-CreateWorkflowStepExecution';
import { CreateWorkflowSeededStep1791417600000 } from './1791417600000-CreateWorkflowSeededStep';
import { AddStepBranch1794787200000 } from './1794787200000-add-step-branch';

export const migrations = [
	CreateWorkflowExecution1778529600000,
	CreateWorkflowStepExecution1784890100000,
	CreateWorkflowSeededStep1791417600000,
	AddStepBranch1794787200000,
];
