import type { WorkflowDataCreate } from '@n8n/rest-api-client/api/workflows';
import type { INode, INodeParameters, ResourceMapperField } from 'n8n-workflow';

import { DATA_TABLE_NODE_TYPE, FORM_TRIGGER_NODE_TYPE } from '@/app/constants/nodeTypes';
import type { DataTable, DataTableColumn } from '@/features/core/dataTable/dataTable.types';

const toFormField = (column: DataTableColumn): INodeParameters => {
	// The form has no boolean input; the insert coerces 'true'/'false' strings.
	const options =
		column.type === 'boolean'
			? ['true', 'false']
			: (column.options ?? []).map((option) => option.text);
	return {
		fieldLabel: column.name,
		fieldType: options.length ? 'dropdown' : column.type === 'string' ? 'text' : column.type,
		requiredField: false,
		...(options.length && { fieldOptions: { values: options.map((option) => ({ option })) } }),
	};
};

const toSchemaField = (column: DataTableColumn): ResourceMapperField => ({
	id: column.name,
	displayName: column.name,
	required: false,
	defaultMatch: false,
	display: true,
	type: column.type === 'date' ? 'dateTime' : column.type === 'enum' ? 'string' : column.type,
	readOnly: false,
	removed: false,
});

/** Builds a workflow that submits a form into the given data table. */
export function buildFormWorkflow(dataTable: DataTable): WorkflowDataCreate {
	const formTrigger: INode = {
		id: crypto.randomUUID(),
		name: 'On form submission',
		type: FORM_TRIGGER_NODE_TYPE,
		typeVersion: 2.6,
		position: [0, 0],
		webhookId: crypto.randomUUID(),
		parameters: {
			formTitle: dataTable.name,
			formFields: { values: dataTable.columns.map(toFormField) },
		},
	};
	const insertRow: INode = {
		id: crypto.randomUUID(),
		name: 'Insert row',
		type: DATA_TABLE_NODE_TYPE,
		typeVersion: 1.1,
		position: [220, 0],
		parameters: {
			resource: 'row',
			operation: 'insert',
			dataTableId: {
				__rl: true,
				mode: 'list',
				value: dataTable.id,
				cachedResultName: dataTable.name,
			},
			columns: {
				mappingMode: 'defineBelow',
				value: Object.fromEntries(
					dataTable.columns.map((column) => [
						column.name,
						`={{ $json[${JSON.stringify(column.name)}] }}`,
					]),
				),
				matchingColumns: [],
				schema: dataTable.columns.map(toSchemaField),
				attemptToConvertTypes: false,
				convertFieldsToString: false,
			},
		},
	};

	return {
		name: `Form - ${dataTable.name}`,
		projectId: dataTable.projectId,
		nodes: [formTrigger, insertRow],
		connections: {
			[formTrigger.name]: {
				main: [[{ node: insertRow.name, type: 'main', index: 0 }]],
			},
		},
	};
}
