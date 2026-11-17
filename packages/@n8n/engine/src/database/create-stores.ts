import type { DataSource } from '@n8n/typeorm';

import { WorkflowExecution, WorkflowStepExecution } from './entities';
import { SqliteExecutionStore } from './sqlite/sqlite-execution-store';
import { SqliteExecutionViewStore } from './sqlite/sqlite-execution-view-store';
import { SqliteStepStore } from './sqlite/sqlite-step-store';
import { TypeOrmExecutionStore } from './typeorm-execution-store';
import { TypeOrmExecutionViewStore } from './typeorm-execution-view-store';
import { TypeOrmStepStore } from './typeorm-step-store';
import type { ExecutionStore } from '../execution/execution-store';
import type { ExecutionViewStore } from '../execution/execution-view-store';
import type { StalenessThresholds } from '../execution/staleness';
import type { StepStore } from '../execution/step-store';

/** The engine's own persistence, for hosts that must read the data it writes. */
export interface EngineStores {
	executionStore: ExecutionStore;
	stepStore: StepStore;
	/** A readonly store, for callers that only observe execution outcomes */
	executionViewStore: ExecutionViewStore;
}

export function createStores(
	dataSource: DataSource,
	staleness?: StalenessThresholds,
): EngineStores {
	const executions = dataSource.getRepository(WorkflowExecution);
	const steps = dataSource.getRepository(WorkflowStepExecution);
	if (dataSource.options.type === 'sqlite-pooled' || dataSource.options.type === 'sqlite') {
		return {
			executionStore: new SqliteExecutionStore(executions, staleness),
			stepStore: new SqliteStepStore(steps, staleness),
			executionViewStore: new SqliteExecutionViewStore(executions, steps),
		};
	}
	return {
		executionStore: new TypeOrmExecutionStore(executions, staleness),
		stepStore: new TypeOrmStepStore(steps, staleness),
		executionViewStore: new TypeOrmExecutionViewStore(executions, steps),
	};
}
