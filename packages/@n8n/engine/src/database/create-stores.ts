import type { DataSource } from '@n8n/typeorm';

import { WorkflowExecution, WorkflowStepExecution } from './entities';
import { TypeOrmExecutionReadStore } from './typeorm-execution-read-store';
import { TypeOrmExecutionStore } from './typeorm-execution-store';
import { TypeOrmStepStore } from './typeorm-step-store';
import type { ExecutionReadStore } from '../execution/execution-read-store';
import type { ExecutionStore } from '../execution/execution-store';
import type { StepStore } from '../execution/step-store';

/** The engine's own persistence, for hosts that must read the data it writes. */
export interface EngineStores {
	executionStore: ExecutionStore;
	stepStore: StepStore;
	/** The read path's own store: reads only, and read-shaped. */
	executionReadStore: ExecutionReadStore;
}

export function createStores(dataSource: DataSource): EngineStores {
	const executions = dataSource.getRepository(WorkflowExecution);
	const steps = dataSource.getRepository(WorkflowStepExecution);
	return {
		executionStore: new TypeOrmExecutionStore(executions),
		stepStore: new TypeOrmStepStore(steps),
		executionReadStore: new TypeOrmExecutionReadStore(executions, steps),
	};
}
