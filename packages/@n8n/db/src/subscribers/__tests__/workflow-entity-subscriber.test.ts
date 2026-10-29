import type { InsertEvent, UpdateEvent } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { WorkflowEntitySubscriber } from '../workflow-entity-subscriber';
import type { WorkflowEntity } from '../../entities';
import { runWorkflowContentWrite } from '../../repositories/workflow-content-write-context';

type UpdatedColumn = UpdateEvent<WorkflowEntity>['updatedColumns'][number];

describe('WorkflowEntitySubscriber', () => {
	const subscriber = new WorkflowEntitySubscriber(true);

	it('rejects inserts outside a cleared repository write', () => {
		expect(() => subscriber.beforeInsert(mock<InsertEvent<WorkflowEntity>>())).toThrow(
			'Workflow content writes must use a policy-cleared repository method',
		);
	});

	it('rejects node updates outside a cleared repository write', () => {
		expect(() =>
			subscriber.beforeUpdate(
				mock<UpdateEvent<WorkflowEntity>>({
					entity: { nodes: [] },
					updatedColumns: [],
					updatedRelations: [],
				}),
			),
		).toThrow('Workflow content writes must use a policy-cleared repository method');
	});

	it('allows a full entity save when only metadata changed', () => {
		expect(() =>
			subscriber.beforeUpdate(
				mock<UpdateEvent<WorkflowEntity>>({
					entity: { active: false, nodes: [] },
					updatedColumns: [mock<UpdatedColumn>({ propertyName: 'active' })],
					updatedRelations: [],
				}),
			),
		).not.toThrow();
	});

	it('rejects a full entity save when nodes changed', () => {
		expect(() =>
			subscriber.beforeUpdate(
				mock<UpdateEvent<WorkflowEntity>>({
					entity: { nodes: [] },
					updatedColumns: [mock<UpdatedColumn>({ propertyName: 'nodes' })],
					updatedRelations: [],
				}),
			),
		).toThrow('Workflow content writes must use a policy-cleared repository method');
	});

	it('allows content writes inside the repository context', async () => {
		await expect(
			runWorkflowContentWrite(async () => {
				subscriber.beforeInsert(mock<InsertEvent<WorkflowEntity>>());
			}),
		).resolves.toBeUndefined();

		await expect(
			runWorkflowContentWrite(async () => {
				subscriber.beforeUpdate(
					mock<UpdateEvent<WorkflowEntity>>({
						entity: { nodes: [] },
						updatedColumns: [],
						updatedRelations: [],
					}),
				);
			}),
		).resolves.toBeUndefined();
	});

	it('consumes the scoped write capability', async () => {
		await expect(
			runWorkflowContentWrite(async () => {
				subscriber.beforeInsert(mock<InsertEvent<WorkflowEntity>>());
				subscriber.beforeInsert(mock<InsertEvent<WorkflowEntity>>());
			}),
		).rejects.toThrow('Workflow content writes must use a policy-cleared repository method');
	});
});
