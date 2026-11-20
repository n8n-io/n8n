import { CHANGE_DATA_TABLES_TOOL_NAME } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { classifyToolSideEffect } from '../tool-classification';

describe('classifyToolSideEffect', () => {
	it('classifies the batch data table tool as a write', () => {
		expect(classifyToolSideEffect(CHANGE_DATA_TABLES_TOOL_NAME)).toBe('write');
	});

	it.each(['list_data_tables', 'get_data_table_schema', 'query_data_table'])(
		'classifies the data table read tool %s as a read',
		(name) => {
			expect(classifyToolSideEffect(name)).toBe('read');
		},
	);

	it.each(['insert_data_table_rows', 'delete_data_table_column', 'create_data_table'])(
		'classifies the former data table write tool %s as a write',
		(name) => {
			expect(classifyToolSideEffect(name)).toBe('write');
		},
	);
});
