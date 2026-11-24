import { CreateWorkflowExecution1778529600000 } from './1778529600000-CreateWorkflowExecution';
import { CreateWorkflowStepExecution1784890100000 } from './1784890100000-CreateWorkflowStepExecution';
import { CreateWorkflowSeededStep1791417600000 } from './1791417600000-CreateWorkflowSeededStep';
import { AddOutputSourcesToWorkflowStepExecution1794960000000 } from './1794960000000-AddOutputSourcesToWorkflowStepExecution';
import { AddFinishedAtIndexToWorkflowExecution1795046400000 } from './1795046400000-AddFinishedAtIndexToWorkflowExecution';

export const migrations = [
	CreateWorkflowExecution1778529600000,
	CreateWorkflowStepExecution1784890100000,
	CreateWorkflowSeededStep1791417600000,
	AddOutputSourcesToWorkflowStepExecution1794960000000,
	AddFinishedAtIndexToWorkflowExecution1795046400000,
];
