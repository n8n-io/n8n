import { EventSubscriber, type EntitySubscriberInterface, type InsertEvent } from '@n8n/typeorm';

import { WorkflowStepExecution } from '../entities';
import { generateId } from '../generate-id';

/**
 * The step entity mints its id in a `@BeforeInsert` hook, which an
 * `EntitySchema` does not carry. The SQLite data source registers this
 * subscriber to do the same, so `repo.save(repo.create(...))` keeps working.
 */
@EventSubscriber()
export class GenerateStepIdSubscriber implements EntitySubscriberInterface<WorkflowStepExecution> {
	listenTo() {
		return WorkflowStepExecution;
	}

	beforeInsert(event: InsertEvent<WorkflowStepExecution>): void {
		if (event.entity && !event.entity.id) event.entity.id = generateId();
	}
}
