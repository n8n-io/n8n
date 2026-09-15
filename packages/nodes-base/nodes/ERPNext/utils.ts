import flow from 'lodash/flow';
import sortBy from 'lodash/sortBy';
import uniqBy from 'lodash/uniqBy';

export type DocumentProperties = {
	// The Properties fixedCollection's own default is {} (see DocumentDescription.ts),
	// not { customProperty: [] }, so customProperty is genuinely absent whenever the
	// field is left untouched — not just empty.
	customProperty?: Array<{ field: string; value: string }>;
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
