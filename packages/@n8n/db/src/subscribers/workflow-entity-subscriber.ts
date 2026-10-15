import type { EntitySubscriberInterface, InsertEvent, UpdateEvent } from '@n8n/typeorm';
import { EventSubscriber } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { WorkflowEntity } from '../entities';
import { consumeWorkflowContentWrite } from '../repositories/workflow-content-write-context';

@EventSubscriber()
export class WorkflowEntitySubscriber implements EntitySubscriberInterface<WorkflowEntity> {
	constructor(private readonly enforce = process.env.VITEST !== 'true') {}

	listenTo() {
		return WorkflowEntity;
	}

	beforeInsert(_event: InsertEvent<WorkflowEntity>) {
		this.assertContentWriteAllowed();
	}

	beforeUpdate(event: UpdateEvent<WorkflowEntity>) {
		const hasTrackedChanges =
			(event.updatedColumns?.length ?? 0) > 0 || (event.updatedRelations?.length ?? 0) > 0;
		const changesNodes = hasTrackedChanges
			? (event.updatedColumns?.some((column) => column.propertyName === 'nodes') ?? false)
			: event.entity && Object.prototype.hasOwnProperty.call(event.entity, 'nodes');

		if (changesNodes) {
			this.assertContentWriteAllowed();
		}
	}

	private assertContentWriteAllowed() {
		if (this.enforce && !consumeWorkflowContentWrite()) {
			throw new UnexpectedError(
				'Workflow content writes must use a policy-cleared repository method',
			);
		}
	}
}
