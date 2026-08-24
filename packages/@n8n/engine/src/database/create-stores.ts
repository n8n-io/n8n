import type { DataSource } from '@n8n/typeorm';

import { WorkflowExecution, WorkflowStepExecution } from './entities';
import { TypeOrmExecutionStore } from './typeorm-execution-store';
import { TypeOrmStepStore } from './typeorm-step-store';
import type { ExecutionStore } from '../execution/execution-store';
import type { StepStore } from '../execution/step-store';

/** The engine's own persistence, for hosts that must read the data it writes. */
export interface EngineStores {
	executionStore: ExecutionStore;
	stepStore: StepStore;
}

export function createStores(dataSource: DataSource): EngineStores {
	return {
		executionStore: new TypeOrmExecutionStore(dataSource.getRepository(WorkflowExecution)),
		stepStore: new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution)),
	};
}
