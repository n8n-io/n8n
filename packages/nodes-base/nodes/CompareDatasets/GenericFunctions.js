import cloneDeep from 'lodash/cloneDeep';
import difference from 'lodash/difference';
import get from 'lodash/get';
import intersection from 'lodash/intersection';
import isEmpty from 'lodash/isEmpty';
import omit from 'lodash/omit';
import set from 'lodash/set';
import union from 'lodash/union';
import unset from 'lodash/unset';
import { UserError } from 'n8n-workflow';
import { fuzzyCompare, preparePairedItemDataArray } from '@utils/utilities';
const processNullishValueFunction = (version) => {
    if (version >= 2) {
        return (value) => (value === undefined ? null : value);
    }
    return (value) => value || null;
};
function compareItems(item1, item2, fieldsToMatch, options, skipFields, isEntriesEqual) {
    const keys = {};
    fieldsToMatch.forEach((field) => {
        keys[field.field1] = item1.json[field.field1];
    });
    const keys1 = Object.keys(item1.json);
    const keys2 = Object.keys(item2.json);
    const allUniqueKeys = union(keys1, keys2);
    let keysToCompare;
    if (options.fuzzyCompare && options.nodeVersion >= 2.1) {
        keysToCompare = allUniqueKeys;
    }
    else {
        keysToCompare = intersection(keys1, keys2);
    }
    const same = keysToCompare.reduce((acc, key) => {
        if (isEntriesEqual(item1.json[key], item2.json[key])) {
            acc[key] = item1.json[key];
        }
        return acc;
    }, {});
    const sameKeys = Object.keys(same);
    const differentKeys = difference(allUniqueKeys, sameKeys);
    const different = {};
    const skipped = {};
    differentKeys.forEach((key, i) => {
        const processNullishValue = processNullishValueFunction(options.nodeVersion);
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
                if (options.nodeVersion >= 2) {
                    [firstInputName, secondInputName] = ['inputA', 'inputB'];
                }
                if (options.nodeVersion >= 2.1 &&
                    !options.disableDotNotation &&
                    !skipFields.some((field) => field === key)) {
                    const skippedFieldsWithDotNotation = skipFields.filter((field) => field.startsWith(key) && field.includes('.'));
                    input1 = cloneDeep(input1);
                    input2 = cloneDeep(input2);
                    if (skippedFieldsWithDotNotation.length &&
                        (typeof input1 !== 'object' || typeof input2 !== 'object')) {
                        throw new UserError(`The field \'${key}\' in item ${i} is not an object. It is not possible to use dot notation.`, { level: 'warning' });
                    }
                    if (skipped[key] === undefined && skippedFieldsWithDotNotation.length) {
                        skipped[key] = { [firstInputName]: {}, [secondInputName]: {} };
                    }
                    for (const skippedField of skippedFieldsWithDotNotation) {
                        const nestedField = skippedField.replace(`${key}.`, '');
                        set(skipped[key][firstInputName], nestedField, get(input1, nestedField));
                        set(skipped[key][secondInputName], nestedField, get(input2, nestedField));
                        unset(input1, nestedField);
                        unset(input2, nestedField);
                    }
                    different[key] = { [firstInputName]: input1, [secondInputName]: input2 };
                }
                else {
                    if (skipFields.includes(key)) {
                        skipped[key] = { [firstInputName]: input1, [secondInputName]: input2 };
                    }
                    else {
                        different[key] = { [firstInputName]: input1, [secondInputName]: input2 };
                    }
                }
        }
    });
    return {
        json: { keys, same, different, ...(!isEmpty(skipped) && { skipped }) },
        pairedItem: [
            ...preparePairedItemDataArray(item1.pairedItem),
            ...preparePairedItemDataArray(item2.pairedItem),
        ],
    };
}
function combineItems(item1, item2, prefer, except, disableDotNotation) {
    let exceptFields;
    const [entry, match] = prefer === 'input1' ? [item1, item2] : [item2, item1];
    if (except && Array.isArray(except) && except.length) {
        exceptFields = except;
    }
    else {
        exceptFields = except ? except.split(',').map((field) => field.trim()) : [];
    }
    exceptFields.forEach((field) => {
        if (disableDotNotation) {
            entry.json[field] = match.json[field];
        }
        else {
            const value = get(match.json, field) ?? null;
            set(entry, ['json', field], value);
        }
    });
    return entry;
}
function findAllMatches(data, lookup, disableDotNotation, isEntriesEqual) {
    return data.reduce((acc, entry2, i) => {
        if (entry2 === undefined)
            return acc;
        for (const key of Object.keys(lookup)) {
            const excpectedValue = lookup[key];
            let entry2FieldValue;
            if (disableDotNotation) {
                entry2FieldValue = entry2.json[key];
            }
            else {
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
    }, []);
}
function findFirstMatch(data, lookup, disableDotNotation, isEntriesEqual) {
    const index = data.findIndex((entry2) => {
        if (entry2 === undefined)
            return false;
        for (const key of Object.keys(lookup)) {
            const excpectedValue = lookup[key];
            let entry2FieldValue;
            if (disableDotNotation) {
                entry2FieldValue = entry2.json[key];
            }
            else {
                entry2FieldValue = get(entry2.json, key);
            }
            if (!isEntriesEqual(excpectedValue, entry2FieldValue)) {
                return false;
            }
        }
        return true;
    });
    if (index === -1)
        return [];
    return [{ entry: data[index], index }];
}
export function findMatches(input1, input2, fieldsToMatch, options) {
    const data1 = [...input1];
    const data2 = [...input2];
    const isEntriesEqual = fuzzyCompare(options.fuzzyCompare, options.nodeVersion);
    const disableDotNotation = options.disableDotNotation || false;
    const multipleMatches = options.multipleMatches || 'first';
    const skipFields = (options.skipFields || '').split(',').map((field) => field.trim());
    if (disableDotNotation && skipFields.some((field) => field.includes('.'))) {
        const fieldToSkip = skipFields.find((field) => field.includes('.'));
        const msg = `Dot notation is disabled, but field to skip comparing '${fieldToSkip}' contains dot`;
        throw new UserError(msg, { level: 'warning' });
    }
    const filteredData = {
        matched: [],
        unmatched1: [],
        unmatched2: [],
    };
    const matchedInInput2 = new Set();
    matchesLoop: for (const entry of data1) {
        const lookup = {};
        fieldsToMatch.forEach((matchCase) => {
            let valueToCompare;
            if (disableDotNotation) {
                valueToCompare = entry.json[matchCase.field1];
            }
            else {
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
        const foundedMatches = multipleMatches === 'all'
            ? findAllMatches(data2, lookup, disableDotNotation, isEntriesEqual)
            : findFirstMatch(data2, lookup, disableDotNotation, isEntriesEqual);
        const matches = foundedMatches.map((match) => match.entry);
        foundedMatches.map((match) => matchedInInput2.add(match.index));
        if (matches.length) {
            filteredData.matched.push({ entry, matches });
        }
        else {
            filteredData.unmatched1.push(entry);
        }
    }
    data2.forEach((entry, i) => {
        if (!matchedInInput2.has(i)) {
            filteredData.unmatched2.push(entry);
        }
    });
    const same = [];
    const different = [];
    filteredData.matched.forEach((entryMatches) => {
        let entryCopy;
        entryMatches.matches.forEach((match) => {
            let entryFromInput1 = entryMatches.entry.json;
            let entryFromInput2 = match.json;
            if (skipFields.length) {
                if (disableDotNotation || !skipFields.some((field) => field.includes('.'))) {
                    entryFromInput1 = omit(entryFromInput1, skipFields);
                    entryFromInput2 = omit(entryFromInput2, skipFields);
                }
                else {
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
            }
            else {
                isItemsEqual = isEntriesEqual(entryFromInput1, entryFromInput2);
            }
            if (isItemsEqual) {
                if (!entryCopy) {
                    if (options.fuzzyCompare && options.resolve === 'preferInput2') {
                        entryCopy = match;
                    }
                    else {
                        entryCopy = entryMatches.entry;
                    }
                }
            }
            else {
                switch (options.resolve) {
                    case 'preferInput1':
                        different.push(entryMatches.entry);
                        break;
                    case 'preferInput2':
                        different.push(match);
                        break;
                    case 'mix':
                        different.push(combineItems(entryMatches.entry, match, options.preferWhenMix, options.exceptWhenMix, disableDotNotation));
                        break;
                    default:
                        different.push(compareItems(entryMatches.entry, match, fieldsToMatch, options, skipFields, isEntriesEqual));
                }
            }
        });
        if (!isEmpty(entryCopy)) {
            same.push(entryCopy);
        }
    });
    return [filteredData.unmatched1, same, different, filteredData.unmatched2];
}
export function checkMatchFieldsInput(data) {
    if (data.length === 1 && data[0].field1 === '' && data[0].field2 === '') {
        throw new UserError('You need to define at least one pair of fields in "Fields to Match" to match on', { level: 'warning' });
    }
    for (const [index, pair] of data.entries()) {
        if (pair.field1 === '' || pair.field2 === '') {
            throw new UserError(`You need to define both fields in "Fields to Match" for pair ${index + 1},
				 field 1 = '${pair.field1}'
				 field 2 = '${pair.field2}'`, { level: 'warning' });
        }
    }
    return data;
}
export function checkInput(input) {
    if (!input)
        return [];
    if (input.some((item) => isEmpty(item.json))) {
        input = input.filter((item) => !isEmpty(item.json));
    }
    return input;
}
export function checkInputAndThrowError(input, fields, disableDotNotation, inputLabel) {
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
            throw new UserError(`Field '${field}' is not present in any of items in '${inputLabel}'`, {
                level: 'warning',
            });
        }
    }
    return input;
}
//# sourceMappingURL=GenericFunctions.js.map