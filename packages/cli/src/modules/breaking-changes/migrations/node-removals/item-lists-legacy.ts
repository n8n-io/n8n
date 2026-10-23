import type { INode, INodeParameters } from 'n8n-workflow';

import {
	assertIncludeEmptyIsInert,
	assertNoEmptyFieldToSplitOut,
	assertNoSplitBy,
} from './item-lists-checks';
import { asParameters, isExpression, pickDefined, readString } from '../parameter-readers';

/*
 * Item Lists 1 and 2 (`typeVersion` 1, 2, 2.1 and 2.2). Limit and Sort have the same shape
 * as in version 3, so they need no code here. The other operations differ in two ways:
 * - They store field lists as a collection (`{ fields: [{ fieldName }] }`). The new nodes
 *   use one comma-separated string.
 * - Some behavior differs from version 3 (see each function).
 * Each function returns the new parameters, or throws when the node has no exact equivalent.
 */

export interface LegacyResult {
	/** The version of the new node. The default is the version of the target. */
	typeVersion?: number;
	parameters: INodeParameters;
	/** Behavior changes that the user should check. A note turns off the one-click republish. */
	notes?: string[];
}

// A note turns off the one-click republish, so it only fits where the old node can throw.
const MISSING_FIELD_NOTE =
	'This node used to stop with an error when a field was missing in all items. The new node continues. Check the workflow if it relies on that error.';

// Item Lists 2.1 and later never throw. Before that, Keep Missing off (or an expression) can.
function canStopForMissingField(node: INode, options: INodeParameters): boolean {
	return node.typeVersion < 2.1 && options.keepMissing !== true;
}

// Split Out throws for a missing field before 2.1, and for a value it cannot split before 2.2.
function splitOutNote(typeVersion: number): string[] | undefined {
	if (typeVersion >= 2.2) return undefined;

	const cause =
		typeVersion < 2.1
			? 'the field was missing, or when its value was not a list or an object'
			: 'the value of the field was not a list or an object';
	return [
		`This node used to stop with an error when ${cause}. The new node continues. Check the workflow if it relies on that error.`,
	];
}

const unreadable = (label: string) =>
	new Error(`"${label}" could not be read. Open the node, check this field and migrate again.`);

function readChoice(
	parameters: INodeParameters,
	key: string,
	fallback: string,
	label: string,
	allowed: string[],
): string {
	const value = readString(parameters, key, fallback, label);
	if (!allowed.includes(value)) {
		throw new Error(`"${label}" has an unsupported value. Replace this node by hand.`);
	}
	return value;
}

/** Reads the `options` of the node and keeps only the listed keys, which the new node knows. */
function readOptions(node: INode, keys: string[]): INodeParameters {
	const { options } = node.parameters;
	if (options === undefined) return {};

	const parsed = asParameters(options);
	if (!parsed) throw new Error('The options of this node are not in a supported format.');
	return pickDefined(parsed, keys);
}

const withOptions = (options: INodeParameters): INodeParameters =>
	Object.keys(options).length > 0 ? { options } : {};

/**
 * Reads a field list collection and returns the names.
 * The new nodes split a string on commas, trim each name and drop empty names. So a name
 * is only safe when none of that changes it. With `trim` set, the old node also trims the
 * names, so surrounding spaces and empty names are fine.
 */
function readFieldNames(value: unknown, label: string, { trim = false } = {}): string[] {
	if (value === undefined) return [];

	const list = asParameters(value)?.fields;
	if (list === undefined) return [];
	if (!Array.isArray(list)) throw unreadable(label);

	const names: string[] = [];
	for (const entry of list) {
		const name = asParameters(entry)?.fieldName;
		// A saved workflow omits the default name, which is empty.
		if (name === undefined) {
			throw new Error(
				`"${label}" has an empty field name. Remove it or replace this node by hand.`,
			);
		}
		if (typeof name !== 'string') throw unreadable(label);
		if (isExpression(name)) {
			throw new Error(
				`"${label}" has a field name that is an expression. Replace this node by hand.`,
			);
		}
		if (name.includes(',')) {
			throw new Error(
				`"${label}" has the field name "${name}" with a comma. The new node would split it into two names. Replace this node by hand.`,
			);
		}

		if (trim) {
			if (name.trim() !== '') names.push(name.trim());
			continue;
		}
		if (name === '') {
			throw new Error(
				`"${label}" has an empty field name. Remove it or replace this node by hand.`,
			);
		}
		if (name !== name.trim()) {
			throw new Error(
				`"${label}" has the field name "${name}" with a space at the start or end. The new node removes it, so the name would change. Replace this node by hand.`,
			);
		}
		names.push(name);
	}
	return names;
}

/** Version 1 reads a name as one literal value. The new node splits it and trims it. */
function assertPlainName(value: string, label: string, { allowEmpty = false } = {}) {
	if (isExpression(value)) {
		throw new Error(
			`"${label}" is an expression, and the migration cannot check it. Replace this node by hand.`,
		);
	}
	if (value.includes(',') || value !== value.trim() || (value === '' && !allowEmpty)) {
		throw new Error(
			`"${label}" is empty or has a comma or a space at the start or end. The old version of the node reads it as one name, so the result could change. Replace this node by hand.`,
		);
	}
}

/**
 * Concatenate Items (`aggregateItems`) to Aggregate.
 * Individual fields copy as they are. The all-data mode needs the field lists as strings.
 * Versions 1 and 2 throw for a missing field and the new node adds a hint, which is accepted.
 */
export function legacyAggregate(node: INode): LegacyResult {
	const { parameters } = node;
	const aggregate = readChoice(parameters, 'aggregate', 'aggregateIndividualFields', 'Aggregate', [
		'aggregateIndividualFields',
		'aggregateAllItemData',
	]);

	if (aggregate === 'aggregateIndividualFields') {
		const options = readOptions(node, ['disableDotNotation', 'mergeLists', 'keepMissing']);
		return {
			parameters: {
				...pickDefined(parameters, ['aggregate', 'fieldsToAggregate']),
				...withOptions(options),
			},
			notes: canStopForMissingField(node, options) ? [MISSING_FIELD_NOTE] : undefined,
		};
	}

	const include = readChoice(parameters, 'include', 'allFields', 'Include', [
		'allFields',
		'specifiedFields',
		'allFieldsExcept',
	]);
	const result = pickDefined(parameters, ['aggregate', 'destinationFieldName', 'include']);

	if (include === 'allFieldsExcept') {
		const names = readFieldNames(parameters.fieldsToExclude, 'Fields to Exclude');
		if (names.length > 0) result.fieldsToExclude = names.join(', ');
	}
	if (include === 'specifiedFields') {
		const names = readFieldNames(parameters.fieldsToInclude, 'Fields to Include');
		if (names.length > 0) result.fieldsToInclude = names.join(', ');
	}
	return { parameters: result };
}

/**
 * Remove Duplicates to Remove Duplicates 1. The old code is the same in every version.
 * Version 1 of the new node does not skip `null`, as the old node did not.
 */
export function legacyRemoveDuplicates(node: INode): LegacyResult {
	const { parameters } = node;
	const compare = readChoice(parameters, 'compare', 'allFields', 'Compare', [
		'allFields',
		'allFieldsExcept',
		'selectedFields',
	]);
	const result = pickDefined(parameters, ['compare']);
	// The field lists and the options are hidden when all fields are compared.
	if (compare === 'allFields') return { parameters: result };

	const options = readOptions(node, ['disableDotNotation', 'removeOtherFields']);
	if (Object.values(options).some((value) => typeof value !== 'boolean')) {
		throw new Error(
			'An option of this node is an expression or has an unsupported value. Replace this node by hand.',
		);
	}

	if (compare === 'allFieldsExcept') {
		// The old node compares these names as they are. The new node trims them.
		const names = readFieldNames(parameters.fieldsToExclude, 'Fields to Exclude');
		if (names.length > 0) result.fieldsToExclude = names.join(', ');
	} else {
		// The old node trims these names. An empty name throws there and is dropped here.
		const names = readFieldNames(parameters.fieldsToCompare, 'Fields to Compare', { trim: true });
		if (names.length > 0) result.fieldsToCompare = names.join(', ');
	}
	return { parameters: { ...result, ...withOptions(options) } };
}

const INCLUDE_MODES = ['noOtherFields', 'allOtherFields', 'selectedOtherFields'];

/**
 * Split Out Items to Split Out 1.
 * Versions 2 to 2.2 read the field as a comma-separated list, as the new node does.
 * Version 1 reads it as one literal name, so it needs more checks.
 * The new node removes a leading `$json.` and reads `$binary` as the binary data.
 * Item Lists 1 and 2 do neither, so those names are refused.
 */
export function legacySplitOut(node: INode): LegacyResult {
	const { parameters } = node;
	const isVersion1 = node.typeVersion < 2;

	const fieldToSplitOut = parameters.fieldToSplitOut ?? '';
	if (typeof fieldToSplitOut !== 'string') throw unreadable('Field to Split Out');
	if (isVersion1) assertPlainName(fieldToSplitOut, 'Field to Split Out');
	else assertNoEmptyFieldToSplitOut(node);

	// An expression can only be checked when it runs.
	if (!isExpression(fieldToSplitOut)) {
		for (const name of fieldToSplitOut.split(',').map((entry) => entry.trim())) {
			if (name.startsWith('$json.') || name === '$binary') {
				throw new Error(
					'"Field to Split Out" starts with "$json." or is "$binary". The new node reads these names in a special way, so the result could change. Replace this node by hand.',
				);
			}
		}
	}

	const include = readChoice(parameters, 'include', 'noOtherFields', 'Include', INCLUDE_MODES);
	const options = readOptions(node, ['disableDotNotation', 'destinationFieldName']);
	const { disableDotNotation, destinationFieldName } = options;

	// The old node reads this option once and the new node reads it for each item.
	if (disableDotNotation !== undefined && typeof disableDotNotation !== 'boolean') {
		throw new Error(
			'"Disable Dot Notation" is an expression. The old node reads it once and the new node reads it for each item, so the results could differ. Replace this node by hand.',
		);
	}
	if (destinationFieldName !== undefined && typeof destinationFieldName !== 'string') {
		throw unreadable('Destination Field Name');
	}
	if (isVersion1 && destinationFieldName !== undefined) {
		assertPlainName(destinationFieldName, 'Destination Field Name', { allowEmpty: true });
	}

	const result = pickDefined(parameters, ['fieldToSplitOut', 'include']);

	if (include === 'selectedOtherFields') {
		const names = readFieldNames(parameters.fieldsToInclude, 'Fields to Include');
		if (names.length > 0) result.fieldsToInclude = names.join(',');

		// Version 1 lets one value win when a name matches the split field or its destination.
		// The new node always writes the original value.
		if (
			isVersion1 &&
			names.some((name) => name === fieldToSplitOut || name === destinationFieldName)
		) {
			throw new Error(
				'"Fields to Include" has the same name as the field to split out or its destination field. The new node orders these in a different way. Replace this node by hand.',
			);
		}
	}

	// Version 1 always removes the field with a dot path. The new node removes the literal name.
	if (
		isVersion1 &&
		include === 'allOtherFields' &&
		disableDotNotation === true &&
		/[.[]/.test(fieldToSplitOut)
	) {
		throw new Error(
			'"Field to Split Out" has a dot or a bracket while "Disable Dot Notation" is on. The new node removes this field in a different way. Replace this node by hand.',
		);
	}

	return {
		parameters: { ...result, ...withOptions(options) },
		notes: splitOutNote(node.typeVersion),
	};
}

const SUMMARIZE_KEY_PREFIXES: Record<string, string> = {
	append: 'appended_',
	average: 'average_',
	concatenate: 'concatenated_',
	count: 'count_',
	countUnique: 'unique_count_',
	sum: 'sum_',
};

// Same cleanup that Summarize and Item Lists 2 apply to the output names.
const normalizeKey = (key: string) => key.replace(/[\]["]/g, '').replace(/[ .]/g, '_');

/**
 * Summarize to Summarize.
 * Versions 1 and 2 throw when a field is missing in all items, as Summarize 1 does.
 * Versions 2.1 and 2.2 do not throw, as Summarize 1.1 does not.
 * The checks for a split and for Include Empty are the same as for version 3.
 */
export function legacySummarize(node: INode): LegacyResult {
	assertNoSplitBy(node);
	assertIncludeEmptyIsInert(node);

	const isVersion1 = node.typeVersion < 2;
	const entries = asParameters(node.parameters.fieldsToSummarize)?.values;
	const normalizedToRaw = new Map<string, string>();

	for (const entry of Array.isArray(entries) ? entries.map(asParameters) : []) {
		const aggregation = entry?.aggregation ?? 'count';
		if (typeof aggregation !== 'string' || isExpression(aggregation)) {
			throw new Error(
				'A field to summarize has an aggregation that is an expression. Replace this node by hand.',
			);
		}
		// Item Lists 1 and 2 compare only numbers for Minimum and Maximum, and can return
		// Infinity. The new node also compares text and dates, and returns null.
		if (aggregation === 'min' || aggregation === 'max') {
			throw new Error(
				'A field uses Minimum or Maximum. The old node compared only numbers, and the new node also compares text and dates, so the results could change. Replace this node by hand.',
			);
		}
		const prefix = SUMMARIZE_KEY_PREFIXES[aggregation];
		if (prefix === undefined) {
			throw new Error(
				'A field to summarize has an unsupported aggregation. Replace this node by hand.',
			);
		}

		const field = entry?.field ?? '';
		if (typeof field !== 'string') throw unreadable('Field');
		// Version 1 does not know the field at this point, so it cannot compare the names.
		if (isExpression(field)) {
			if (isVersion1) {
				throw new Error('A field to summarize is an expression. Replace this node by hand.');
			}
			continue;
		}

		const raw = `${prefix}${field}`;
		const normalized = normalizeKey(raw);

		// Version 1 keeps the name as it is. The new node cleans it up.
		if (isVersion1 && normalized !== raw) {
			throw new Error(
				`The field "${field}" has a bracket, a quote, a dot or a space. The old version of the node keeps it in the output name and the new node changes it, so the output names would change. Replace this node by hand.`,
			);
		}

		// Version 2 renames the keys one after the other. When two names collide, the order
		// of the values can differ from the new node.
		const earlier = normalizedToRaw.get(normalized);
		if (earlier !== undefined && earlier !== raw) {
			throw new Error(
				'Two fields to summarize give the same output name after the new node cleans up the names. Replace this node by hand.',
			);
		}
		normalizedToRaw.set(normalized, raw);
	}

	return {
		typeVersion: node.typeVersion < 2.1 ? 1 : 1.1,
		parameters: {
			...pickDefined(node.parameters, ['fieldsToSummarize']),
			...withOptions(
				readOptions(node, ['disableDotNotation', 'outputFormat', 'skipEmptySplitFields']),
			),
		},
	};
}
