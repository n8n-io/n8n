import isPlainObject from 'is-plain-obj';
import {FD_SPECIFIC_OPTIONS} from '../arguments/specific.js';

// Deep merge specific options like `env`. Shallow merge the other ones.
export const mergeOptions = (boundOptions, options) => {
	const newOptions = Object.fromEntries(
		Object.entries(options).map(([optionName, optionValue]) => [
			optionName,
			mergeOption(optionName, boundOptions[optionName], optionValue),
		]),
	);
	return {...boundOptions, ...newOptions};
};

const mergeOption = (optionName, boundOptionValue, optionValue) => {
	if (DEEP_OPTIONS.has(optionName) && isPlainObject(boundOptionValue) && isPlainObject(optionValue)) {
		return {...boundOptionValue, ...optionValue};
	}

	return optionValue;
};

const DEEP_OPTIONS = new Set(['env', ...FD_SPECIFIC_OPTIONS]);
