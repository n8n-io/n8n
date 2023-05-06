import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import difference from 'lodash.difference';
import get from 'lodash.get';
import intersection from 'lodash.intersection';
import isEmpty from 'lodash.isempty';
import omit from 'lodash.omit';
import unset from 'lodash.unset';
import { cloneDeep } from 'lodash';
import set from 'lodash.set';
import union from 'lodash.union';
import { fuzzyCompare } from '../../utils/utilities';

type PairToMatch = {
	field1: string;
	field2: string;
};

type EntryMatches = {
	entry: INodeExecutionData;
	matches: INodeExecutionData[];
};

type CompareFunction = <T, U>(a: T, b: U) => boolean;

const processNullishValueFunction = (version: number) => {
	if (version >= 2) {
		return <T>(value: T) => (value === undefined ? null : value);
	}
	return <T>(value: T) => value || null;
};

function compareItems(
	item1: INodeExecutionData,
	item2: INodeExecutionData,
	fieldsToMatch: PairToMatch[],
	options: IDataObject,
	skipFields: string[],
	isEntriesEqual: CompareFunction,
) {
	const keys = {} as IDataObject;
	fieldsToMatch.forEach((field) => {
		keys[field.field1] = item1.json[field.field1];
	});

	const keys1 = Object.keys(item1.json);
	const keys2 = Object.keys(item2.json);
	const allUniqueKeys = union(keys1, keys2);

	let keysToCompare;
	if (options.fuzzyCompare && (options.nodeVersion as number) >= 2.1) {
		keysToCompare = allUniqueKeys;
	} else {
		keysToCompare = intersection(keys1, keys2);
	}

	const same = keysToCompare.reduce((acc, key) => {
		if (isEntriesEqual(item1.json[key], item2.json[key])) {
			acc[key] = item1.json[key];
		}
		return acc;
	}, {} as IDataObject);

	const sameKeys = Object.keys(same);
	const differentKeys = difference(allUniqueKeys, sameKeys);

	const different: IDataObject = {};
	const skipped: IDataObject = {};

	differentKeys.forEach((key, i) => {
		const processNullishValue = processNullishValueFunction(options.nodeVersion as number);

		switch (options.resolve) {
			case 'preferInput1':
				different[key] = processNullishValue(item1.json[key]);
				break;
			case 'preferInput2':
				different[key] = processNullishValue(item2.json[key]);
				break;
			default:
				let input1 = processNullishValue(item1.json[key]);
				let input2 = processNullishValue(item2.json[key]);

				let [firstInputName, secondInputName] = ['input1', 'input2'];
				if ((options.nodeVersion as number) >= 2) {
					[firstInputName, secondInputName] = ['inputA', 'inputB'];
				}

				if (
					(options.nodeVersion as number) >= 2.1 &&
					!options.disableDotNotation &&
					!skipFields.some((field) => field === key)
				) {
					const skippedFieldsWithDotNotation = skipFields.filter(
						(field) => field.startsWith(key) && field.includes('.'),
					);

					input1 = cloneDeep(input1);
					input2 = cloneDeep(input2);

					if (
						skippedFieldsWithDotNotation.length &&
						(typeof input1 !== 'object' || typeof input2 !== 'object')
					) {
						throw new Error(
							`The field \'${key}\' in item ${i} is not an object. It is not possible to use dot notation.`,
						);
					}

					if (skipped[key] === undefined && skippedFieldsWithDotNotation.length) {
						skipped[key] = { [firstInputName]: {}, [secondInputName]: {} };
					}

					for (const skippedField of skippedFieldsWithDotNotation) {
						const nestedField = skippedField.replace(`${key}.`, '');
						set(
							(skipped[key] as IDataObject)[firstInputName] as IDataObject,
							nestedField,
							get(input1, nestedField),
						);
						set(
							(skipped[key] as IDataObject)[secondInputName] as IDataObject,
							nestedField,
							get(input2, nestedField),
						);

						unset(input1, nestedField);
						unset(input2, nestedField);
					}

					different[key] = { [firstInputName]: input1, [secondInputName]: input2 };
				} else {
					if (skipFields.includes(key)) {
						skipped[key] = { [firstInputName]: input1, [secondInputName]: input2 };
					} else {
						different[key] = { [firstInputName]: input1, [secondInputName]: input2 };
					}
				}
		}
	});

	return {
		json: { keys, same, different, ...(!isEmpty(skipped) && { skipped }) },
	} as INodeExecutionData;
}

function combineItems(
	item1: INodeExecutionData,
	item2: INodeExecutionData,
	prefer: string,
	except: string,
	disableDotNotation: boolean,
) {
	let exceptFields: string[];
	const [entry, match] = prefer === 'input1' ? [item1, item2] : [item2, item1];

	if (except && Array.isArray(except) && except.length) {
		exceptFields = except;
	} else {
		exceptFields = except ? except.split(',').map((field) => field.trim()) : [];
	}

	exceptFields.forEach((field) => {
		entry.json[field] = match.json[field];
		if (disableDotNotation) {
			entry.json[field] = match.json[field];
		} else {
			const value = get(match.json, field) || null;
			set(entry, `json.${field}`, value);
		}
	});

	return entry;
}

function findAllMatches(
	data: INodeExecutionData[],
	lookup: IDataObject,
	disableDotNotation: boolean,
	isEntriesEqual: CompareFunction,
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

			if (!isEntriesEqual(excpectedValue, entry2FieldValue)) {
				return acc;
			}
		}

		return acc.concat({
			entry: entry2,
			index: i,
		});
	}, [] as IDataObject[]);
}

function findFirstMatch(
	data: INodeExecutionData[],
	lookup: IDataObject,
	disableDotNotation: boolean,
	isEntriesEqual: CompareFunction,
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

			if (!isEntriesEqual(excpectedValue, entry2FieldValue)) {
				return false;
			}
		}

		return true;
	});
	if (index === -1) return [];

	return [{ entry: data[index], index }];
}

export function findMatches(
	input1: INodeExecutionData[],
	input2: INodeExecutionData[],
	fieldsToMatch: PairToMatch[],
	options: IDataObject,
) {
	const data1 = [...input1];
	const data2 = [...input2];

	const isEntriesEqual = fuzzyCompare(
		options.fuzzyCompare as boolean,
		options.nodeVersion as number,
	);
	const disableDotNotation = (options.disableDotNotation as boolean) || false;
	const multipleMatches = (options.multipleMatches as string) || 'first';
	const skipFields = ((options.skipFields as string) || '').split(',').map((field) => field.trim());

	if (disableDotNotation && skipFields.some((field) => field.includes('.'))) {
		const fieldToSkip = skipFields.find((field) => field.includes('.'));
		throw new Error(
			`Dot notation is disabled, but field to skip comparing '${
				fieldToSkip as string
			}' contains dot`,
		);
	}

	const filteredData = {
		matched: [] as EntryMatches[],
		unmatched1: [] as INodeExecutionData[],
		unmatched2: [] as INodeExecutionData[],
	};

	const matchedInInput2 = new Set<number>();

	matchesLoop: for (const entry of data1) {
		const lookup: IDataObject = {};

		fieldsToMatch.forEach((matchCase) => {
			let valueToCompare;
			if (disableDotNotation) {
				valueToCompare = entry.json[matchCase.field1];
			} else {
				valueToCompare = get(entry.json, matchCase.field1);
			}
			lookup[matchCase.field2] = valueToCompare;
		});

		for (const fieldValue of Object.values(lookup)) {
			if (fieldValue === undefined) {
				filteredData.unmatched1.push(entry);
				continue matchesLoop;
			}
		}

		const foundedMatches =
			multipleMatches === 'all'
				? findAllMatches(data2, lookup, disableDotNotation, isEntriesEqual)
				: findFirstMatch(data2, lookup, disableDotNotation, isEntriesEqual);

		const matches = foundedMatches.map((match) => match.entry) as INodeExecutionData[];
		foundedMatches.map((match) => matchedInInput2.add(match.index as number));

		if (matches.length) {
			filteredData.matched.push({ entry, matches });
		} else {
			filteredData.unmatched1.push(entry);
		}
	}

	data2.forEach((entry, i) => {
		if (!matchedInInput2.has(i)) {
			filteredData.unmatched2.push(entry);
		}
	});

	const same: INodeExecutionData[] = [];
	const different: INodeExecutionData[] = [];

	filteredData.matched.forEach((entryMatches) => {
		let entryCopy: INodeExecutionData | undefined;

		entryMatches.matches.forEach((match) => {
			let entryFromInput1 = entryMatches.entry.json;
			let entryFromInput2 = match.json;

			if (skipFields.length) {
				if (disableDotNotation || !skipFields.some((field) => field.includes('.'))) {
					entryFromInput1 = omit(entryFromInput1, skipFields);
					entryFromInput2 = omit(entryFromInput2, skipFields);
				} else {
					entryFromInput1 = cloneDeep(entryFromInput1);
					entryFromInput2 = cloneDeep(entryFromInput2);

					skipFields.forEach((field) => {
						unset(entryFromInput1, field);
						unset(entryFromInput2, field);
					});
				}
			}

			let isItemsEqual = true;
			if (options.fuzzyCompare) {
				for (const key of Object.keys(entryFromInput1)) {
					if (!isEntriesEqual(entryFromInput1[key], entryFromInput2[key])) {
						isItemsEqual = false;
						break;
					}
				}
			} else {
				isItemsEqual = isEntriesEqual(entryFromInput1, entryFromInput2);
			}

			if (isItemsEqual) {
				if (!entryCopy) {
					if (options.fuzzyCompare && options.resolve === 'preferInput2') {
						entryCopy = match;
					} else {
						entryCopy = entryMatches.entry;
					}
				}
			} else {
				switch (options.resolve) {
					case 'preferInput1':
						different.push(entryMatches.entry);
						break;
					case 'preferInput2':
						different.push(match);
						break;
					case 'mix':
						different.push(
							combineItems(
								entryMatches.entry,
								match,
								options.preferWhenMix as string,
								options.exceptWhenMix as string,
								disableDotNotation,
							),
						);
						break;
					default:
						different.push(
							compareItems(
								entryMatches.entry,
								match,
								fieldsToMatch,
								options,
								skipFields,
								isEntriesEqual,
							),
						);
				}
			}
		});
		if (!isEmpty(entryCopy)) {
			same.push(entryCopy);
		}
	});

	return [filteredData.unmatched1, same, different, filteredData.unmatched2];
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

export function checkInput(input: INodeExecutionData[]) {
	if (!input) return [];
	if (input.some((item) => isEmpty(item.json))) {
		input = input.filter((item) => !isEmpty(item.json));
	}
	return input;
}

export function checkInputAndThrowError(
	input: INodeExecutionData[],
	fields: string[],
	disableDotNotation: boolean,
	inputLabel: string,
) {
	if (input.some((item) => isEmpty(item.json))) {
		input = input.filter((item) => !isEmpty(item.json));
	}
	if (input.length === 0) {
		return input;
	}
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
