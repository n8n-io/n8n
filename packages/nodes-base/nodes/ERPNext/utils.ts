import flow from 'lodash/flow';
import sortBy from 'lodash/sortBy';
import uniqBy from 'lodash/uniqBy';

export type DocumentProperties = {
	customProperty: Array<{ field: string; value: string }>;
};

type DocFields = Array<{ name: string; value: string }>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const isDocTypeField = (value: unknown): value is { label: string; fieldname: string } =>
	isRecord(value) && typeof value.label === 'string' && typeof value.fieldname === 'string';

/** DocType names reach us URI-encoded, but the API echoes them back decoded. */
const safeDecodeUri = (value: string) => {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};

/**
 * Pull the field definitions for `docType` out of a `frappe.desk.form.load.getdoctype`
 * response.
 *
 * The endpoint returns the requested DocType alongside every DocType it links to, so
 * select the requested one rather than merging them all — a linked DocType's fieldnames
 * are not valid on the parent. Frappe returns the requested DocType first, which is the
 * fallback when nothing matches by name.
 *
 * Every layer is checked before it is read: a shape we don't recognise yields an empty
 * list, so an unexpected response leaves the dropdown empty instead of throwing.
 */
export const extractDocTypeFields = (response: unknown, docType: string): DocFields => {
	if (!isRecord(response) || !Array.isArray(response.docs)) return [];

	const wanted = safeDecodeUri(docType);
	const doc =
		response.docs.find((entry) => isRecord(entry) && entry.name === wanted) ?? response.docs[0];

	if (!isRecord(doc) || !Array.isArray(doc.fields)) return [];

	return doc.fields
		.filter(isDocTypeField)
		.map(({ label, fieldname }) => ({ name: label, value: fieldname }));
};

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
