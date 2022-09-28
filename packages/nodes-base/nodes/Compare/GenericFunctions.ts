import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { get, intersection, isEqual } from 'lodash';

type PairToMatch = {
	field1: string;
	field2: string;
};

type MatchedPair = {
	input1: INodeExecutionData;
	input2: INodeExecutionData;
	same: INodeExecutionData;
	different: INodeExecutionData;
};

function findAllMatches(
	data: INodeExecutionData[],
	lookup: IDataObject,
	disableDotNotation: boolean,
) {
	return data.reduce((acc, entry2, i) => {
		if (entry2 === undefined) return acc;

		for (const key of Object.keys(lookup)) {
			const excpectedValue = lookup[key];
			let entry2FieldValue;

			if (disableDotNotation) {
				entry2FieldValue = entry2.json[key];
			} else {
				entry2FieldValue = get(entry2.json, key);
			}

			if (!isEqual(excpectedValue, entry2FieldValue)) {
				return acc;
			}
		}

		return acc.concat(entry2);
	}, [] as INodeExecutionData[]);
}

function findFirstMatch(
	data: INodeExecutionData[],
	lookup: IDataObject,
	disableDotNotation: boolean,
) {
	const index = data.findIndex((entry2) => {
		if (entry2 === undefined) return false;

		for (const key of Object.keys(lookup)) {
			const excpectedValue = lookup[key];
			let entry2FieldValue;

			if (disableDotNotation) {
				entry2FieldValue = entry2.json[key];
			} else {
				entry2FieldValue = get(entry2.json, key);
			}

			if (!isEqual(excpectedValue, entry2FieldValue)) {
				return false;
			}
		}

		return true;
	});
	if (index === -1) return [];

	return [data[index]];
}

function compareInputs(
	item1: INodeExecutionData,
	item2: INodeExecutionData,
	fieldsToMatch: PairToMatch[],
) {
	const keys = { input1: {} as IDataObject, input2: {} as IDataObject };
	fieldsToMatch.forEach((field) => {
		keys.input1[field.field1] = item1.json[field.field1];
		keys.input2[field.field2] = item2.json[field.field2];
	});

	const keys1 = Object.keys(item1.json);
	const keys2 = Object.keys(item2.json);
	const intersectionKeys = intersection(keys1, keys2);

	const same = intersectionKeys.reduce(
		(acc, key) => {
			if (isEqual(item1.json[key], item2.json[key])) {
				acc.json[key] = item1.json[key];
			}
			return acc;
		},
		{ json: {} } as INodeExecutionData,
	);

	const different = { input1: {} as IDataObject, input2: {} as IDataObject };
	Object.keys(item1.json).forEach((key) => {
		if (!same.json[key]) {
			different.input1[key] = item1.json[key];
		}
	});
	Object.keys(item2.json).forEach((key) => {
		if (!same.json[key]) {
			different.input2[key] = item2.json[key];
		}
	});

	const differentOutput = {
		key: keys,
		same: same.json,
		different,
	};

	return { same, different: { json: differentOutput } };
}

export function findMatches(
	input1: INodeExecutionData[],
	input2: INodeExecutionData[],
	fieldsToMatch: PairToMatch[],
	options: IDataObject,
) {
	const data1 = [...input1];
	const data2 = [...input2];

	const disableDotNotation = (options.disableDotNotation as boolean) || false;
	const multipleMatches = (options.multipleMatches as string) || 'first';

	const returnData: MatchedPair[] = [];

	matchesLoop: for (const entry1 of data1) {
		const lookup: IDataObject = {};

		fieldsToMatch.forEach((matchCase) => {
			let valueToCompare;
			if (disableDotNotation) {
				valueToCompare = entry1.json[matchCase.field1 as string];
			} else {
				valueToCompare = get(entry1.json, matchCase.field1 as string);
			}
			lookup[matchCase.field2 as string] = valueToCompare;
		});

		for (const fieldValue of Object.values(lookup)) {
			if (fieldValue === undefined) {
				continue matchesLoop;
			}
		}

		const matches =
			multipleMatches === 'all'
				? findAllMatches(data2, lookup, disableDotNotation)
				: findFirstMatch(data2, lookup, disableDotNotation);

		matches.forEach((match) => {
			returnData.push({
				input1: entry1,
				input2: match,
				...compareInputs(entry1, match, fieldsToMatch),
			});
		});
	}

	return returnData;
}

export function checkMatchFieldsInput(data: IDataObject[]) {
	if (data.length === 1 && data[0].field1 === '' && data[0].field2 === '') {
		throw new Error(
			'You need to define at least one pair of fields in "Fields to Match" to match on',
		);
	}
	for (const [index, pair] of data.entries()) {
		if (pair.field1 === '' || pair.field2 === '') {
			throw new Error(
				`You need to define both fields in "Fields to Match" for pair ${index + 1},
				 field 1 = '${pair.field1}'
				 field 2 = '${pair.field2}'`,
			);
		}
	}
	return data as PairToMatch[];
}

export function checkInput(
	input: INodeExecutionData[],
	fields: string[],
	disableDotNotation: boolean,
	inputLabel: string,
) {
	for (const field of fields) {
		const isPresent = (input || []).some((entry) => {
			if (disableDotNotation) {
				return entry.json.hasOwnProperty(field);
			}
			return get(entry.json, field, undefined) !== undefined;
		});
		if (!isPresent) {
			throw new Error(`Field '${field}' is not present in any of items in '${inputLabel}'`);
		}
	}
	return input;
}
