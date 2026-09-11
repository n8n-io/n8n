import { describe, it, expect } from 'vitest';
import type { INode } from 'n8n-workflow';

import { DATA_TABLE_NODE_TYPE, FORM_TRIGGER_NODE_TYPE } from '@/app/constants/nodeTypes';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import { buildFormWorkflow } from '@/features/core/dataTable/utils/formWorkflow';

const dataTable: DataTable = {
	id: 'table-1',
	name: 'Leads',
	projectId: 'project-1',
	sizeBytes: 0,
	createdAt: '',
	updatedAt: '',
	columns: [
		{ id: 'c1', name: 'full name', type: 'string', index: 0 },
		{ id: 'c2', name: 'age', type: 'number', index: 1 },
		{ id: 'c3', name: 'joined', type: 'date', index: 2 },
		{ id: 'c4', name: 'subscribed', type: 'boolean', index: 3 },
		{
			id: 'c5',
			name: 'plan',
			type: 'enum',
			index: 4,
			options: [
				{ id: 'o1', text: 'free', color: '' },
				{ id: 'o2', text: 'pro', color: '' },
			],
		},
	],
};

describe('buildFormWorkflow', () => {
	const workflow = buildFormWorkflow(dataTable);
	const [trigger, insert] = workflow.nodes as INode[];

	it('names the workflow after the table and keeps it in the same project', () => {
		expect(workflow.name).toBe('Form - Leads');
		expect(workflow.projectId).toBe('project-1');
	});

	it('creates a form trigger with one field per column', () => {
		expect(trigger.type).toBe(FORM_TRIGGER_NODE_TYPE);
		expect(trigger.webhookId).toBeTruthy();
		expect(trigger.parameters.formTitle).toBe('Leads');
		expect(trigger.parameters.formFields).toEqual({
			values: [
				{ fieldLabel: 'full name', fieldType: 'text', requiredField: false },
				{ fieldLabel: 'age', fieldType: 'number', requiredField: false },
				{ fieldLabel: 'joined', fieldType: 'date', requiredField: false },
				{
					fieldLabel: 'subscribed',
					fieldType: 'dropdown',
					requiredField: false,
					fieldOptions: { values: [{ option: 'true' }, { option: 'false' }] },
				},
				{
					fieldLabel: 'plan',
					fieldType: 'dropdown',
					requiredField: false,
					fieldOptions: { values: [{ option: 'free' }, { option: 'pro' }] },
				},
			],
		});
	});

	it('inserts every submitted field into the table', () => {
		expect(insert.type).toBe(DATA_TABLE_NODE_TYPE);
		expect(insert.parameters.dataTableId).toMatchObject({
			value: 'table-1',
			cachedResultName: 'Leads',
		});
		expect(insert.parameters.columns).toMatchObject({
			mappingMode: 'defineBelow',
			value: {
				'full name': '={{ $json["full name"] }}',
				age: '={{ $json["age"] }}',
			},
			schema: [
				expect.objectContaining({ id: 'full name', type: 'string' }),
				expect.objectContaining({ id: 'age', type: 'number' }),
				expect.objectContaining({ id: 'joined', type: 'dateTime' }),
				expect.objectContaining({ id: 'subscribed', type: 'boolean' }),
				expect.objectContaining({ id: 'plan', type: 'string' }),
			],
		});
	});

	it('connects the trigger to the insert node', () => {
		expect(workflow.connections).toEqual({
			[trigger.name]: { main: [[{ node: insert.name, type: 'main', index: 0 }]] },
		});
	});
});
