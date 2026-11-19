import { CreateWorkflowExecution1778529600000 } from './1778529600000-CreateWorkflowExecution';
import { CreateWorkflowStepExecution1784890100000 } from './1784890100000-CreateWorkflowStepExecution';
import { CreateWorkflowSeededStep1791417600000 } from './1791417600000-CreateWorkflowSeededStep';
import { WidenStepStaleAfterIndex1795046400000 } from './1795046400000-WidenStepStaleAfterIndex';

export const migrations = [
	CreateWorkflowExecution1778529600000,
	CreateWorkflowStepExecution1784890100000,
	CreateWorkflowSeededStep1791417600000,
	WidenStepStaleAfterIndex1795046400000,
];
