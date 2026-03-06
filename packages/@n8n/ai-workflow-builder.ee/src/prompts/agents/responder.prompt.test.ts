import type { DataTableInfo } from '@/utils/data-table-helpers';

import { buildDataTableCreationGuidance } from './responder.prompt';

describe('buildDataTableCreationGuidance', () => {
	it('should include column definitions from Set node for row column operations', () => {
		const dataTables: DataTableInfo[] = [
			{
				nodeName: 'Store Users',
				tableName: 'users',
				columns: [
					{ name: 'email', type: 'text' },
					{ name: 'age', type: 'number' },
				],
				setNodeName: 'Prepare User Data',
				operation: 'insert',
			},
		];

		const guidance = buildDataTableCreationGuidance(dataTables);

		expect(guidance).toContain('Data Table Setup Required');
		expect(guidance).toContain('`email` (text)');
		expect(guidance).toContain('`age` (number)');
		expect(guidance).toContain('Prepare User Data');
	});
});
