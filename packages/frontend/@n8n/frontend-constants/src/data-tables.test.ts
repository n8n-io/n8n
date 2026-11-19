import * as dataTableRouteNames from './data-tables';

describe('data table route names', () => {
	it('keeps every name and value the router and the apps module link to', () => {
		expect({ ...dataTableRouteNames }).toEqual({
			DATA_TABLE_VIEW: 'data-tables',
			PROJECT_DATA_TABLES: 'project-data-tables',
			DATA_TABLE_DETAILS: 'data-table-details',
		});
	});
});
