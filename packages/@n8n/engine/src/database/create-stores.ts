import type { DataSource } from '@n8n/typeorm';

import { WorkflowExecution, WorkflowStepExecution } from './entities';
import { poolOf } from './data-source';
import { PgExecutionStore } from './pg-execution-store';
import { PgStepStore } from './pg-step-store';
import { TypeOrmExecutionViewStore } from './typeorm-execution-view-store';
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
	const pool = poolOf(dataSource);
	return {
		executionStore: new PgExecutionStore(pool),
		stepStore: new PgStepStore(pool),
		executionViewStore: new TypeOrmExecutionViewStore(
			dataSource.getRepository(WorkflowExecution),
			dataSource.getRepository(WorkflowStepExecution),
		),
	};
}
