import type { Driver } from '@n8n/typeorm';

import { Column } from '../column';

describe('Column.date', () => {
	it.each(['postgres', 'sqlite'])('maps to the native date type on %s', (dialect) => {
		const driver = { [dialect]: {} } as unknown as Driver;

		const options = new Column('day').date.notNull.toOptions(driver);

		expect(options).toMatchObject({ name: 'day', type: 'date', isNullable: false });
	});
});
