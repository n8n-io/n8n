import flow from 'lodash/flow';
import sortBy from 'lodash/sortBy';
import uniqBy from 'lodash/uniqBy';

export type DocumentProperties = {
	customProperty: Array<{ field: string; value: string }>;
};

type DocFields = Array<{ name: string; value: string }>;

const ensureName = (docFields: DocFields) => docFields.filter((o) => o.name);
const sortByName = (docFields: DocFields) => sortBy(docFields, ['name']);
const uniqueByName = (docFields: DocFields) => uniqBy(docFields, (o) => o.name);

export const processNames = flow(ensureName, sortByName, uniqueByName);

export const toSQL = (operator: string) => {
	const operators: { [key: string]: string } = {
		is: '=',
		isNot: '!=',
		greater: '>',
		less: '<',
		equalsGreater: '>=',
		equalsLess: '<=',
	};

	return operators[operator];
};
