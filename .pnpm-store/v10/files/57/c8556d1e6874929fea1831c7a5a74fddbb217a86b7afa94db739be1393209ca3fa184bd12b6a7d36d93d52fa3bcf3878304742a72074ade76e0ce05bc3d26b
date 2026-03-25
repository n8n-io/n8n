import isPlainObject from 'is-plain-obj';
import {normalizeParameters} from './parameters.js';
import {isTemplateString, parseTemplates} from './template.js';
import {execaCoreSync} from './main-sync.js';
import {execaCoreAsync} from './main-async.js';
import {mergeOptions} from './bind.js';

// Wraps every exported methods to provide the following features:
//  - template string syntax: execa`command argument`
//  - options binding: boundExeca = execa(options)
//  - optional argument/options: execa(file), execa(file, args), execa(file, options), execa(file, args, options)
// `mapArguments()` and `setBoundExeca()` allows for method-specific logic.
export const createExeca = (mapArguments, boundOptions, deepOptions, setBoundExeca) => {
	const createNested = (mapArguments, boundOptions, setBoundExeca) => createExeca(mapArguments, boundOptions, deepOptions, setBoundExeca);
	const boundExeca = (...execaArguments) => callBoundExeca({
		mapArguments,
		deepOptions,
		boundOptions,
		setBoundExeca,
		createNested,
	}, ...execaArguments);

	if (setBoundExeca !== undefined) {
		setBoundExeca(boundExeca, createNested, boundOptions);
	}

	return boundExeca;
};

const callBoundExeca = ({mapArguments, deepOptions = {}, boundOptions = {}, setBoundExeca, createNested}, firstArgument, ...nextArguments) => {
	if (isPlainObject(firstArgument)) {
		return createNested(mapArguments, mergeOptions(boundOptions, firstArgument), setBoundExeca);
	}

	const {file, commandArguments, options, isSync} = parseArguments({
		mapArguments,
		firstArgument,
		nextArguments,
		deepOptions,
		boundOptions,
	});
	return isSync
		? execaCoreSync(file, commandArguments, options)
		: execaCoreAsync(file, commandArguments, options, createNested);
};

const parseArguments = ({mapArguments, firstArgument, nextArguments, deepOptions, boundOptions}) => {
	const callArguments = isTemplateString(firstArgument)
		? parseTemplates(firstArgument, nextArguments)
		: [firstArgument, ...nextArguments];
	const [initialFile, initialArguments, initialOptions] = normalizeParameters(...callArguments);
	const mergedOptions = mergeOptions(mergeOptions(deepOptions, boundOptions), initialOptions);
	const {
		file = initialFile,
		commandArguments = initialArguments,
		options = mergedOptions,
		isSync = false,
	} = mapArguments({file: initialFile, commandArguments: initialArguments, options: mergedOptions});
	return {
		file,
		commandArguments,
		options,
		isSync,
	};
};
