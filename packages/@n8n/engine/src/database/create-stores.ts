import type { DataSource } from '@n8n/typeorm';

import { WorkflowExecution, WorkflowStepExecution } from './entities';
import { TypeOrmExecutionStore } from './typeorm-execution-store';
import { TypeOrmExecutionViewStore } from './typeorm-execution-view-store';
import { TypeOrmStepStore } from './typeorm-step-store';
import type { ExecutionStore } from '../execution/execution-store';
import type { ExecutionViewStore } from '../execution/execution-view-store';
import type { StepStore } from '../execution/step-store';

/** The engine's own persistence, for hosts that must read the data it writes. */
export interface EngineStores {
	executionStore: ExecutionStore;
	stepStore: StepStore;
	/** A readonly store, for callers that only observe execution outcomes */
	executionViewStore: ExecutionViewStore;
}

export function createStores(dataSource: DataSource): EngineStores {
	const executions = dataSource.getRepository(WorkflowExecution);
	const steps = dataSource.getRepository(WorkflowStepExecution);
	return {
		executionStore: new TypeOrmExecutionStore(executions),
		stepStore: new TypeOrmStepStore(steps),
		executionViewStore: new TypeOrmExecutionViewStore(executions, steps),
	};
}
