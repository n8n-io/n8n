import {runGeneratorsSync} from '../transform/generator.js';
import {joinToUint8Array, isUint8Array} from '../utils/uint-array.js';
import {TYPE_TO_MESSAGE} from '../stdio/type.js';

// Apply `stdin`/`input`/`inputFile` options, before spawning, in sync mode, by converting it to the `input` option
export const addInputOptionsSync = (fileDescriptors, options) => {
	for (const fdNumber of getInputFdNumbers(fileDescriptors)) {
		addInputOptionSync(fileDescriptors, fdNumber, options);
	}
};

const getInputFdNumbers = fileDescriptors => new Set(Object.entries(fileDescriptors)
	.filter(([, {direction}]) => direction === 'input')
	.map(([fdNumber]) => Number(fdNumber)));

const addInputOptionSync = (fileDescriptors, fdNumber, options) => {
	const {stdioItems} = fileDescriptors[fdNumber];
	const allStdioItems = stdioItems.filter(({contents}) => contents !== undefined);
	if (allStdioItems.length === 0) {
		return;
	}

	if (fdNumber !== 0) {
		const [{type, optionName}] = allStdioItems;
		throw new TypeError(`Only the \`stdin\` option, not \`${optionName}\`, can be ${TYPE_TO_MESSAGE[type]} with synchronous methods.`);
	}

	const allContents = allStdioItems.map(({contents}) => contents);
	const transformedContents = allContents.map(contents => applySingleInputGeneratorsSync(contents, stdioItems));
	options.input = joinToUint8Array(transformedContents);
};

const applySingleInputGeneratorsSync = (contents, stdioItems) => {
	const newContents = runGeneratorsSync(contents, stdioItems, 'utf8', true);
	validateSerializable(newContents);
	return joinToUint8Array(newContents);
};

const validateSerializable = newContents => {
	const invalidItem = newContents.find(item => typeof item !== 'string' && !isUint8Array(item));
	if (invalidItem !== undefined) {
		throw new TypeError(`The \`stdin\` option is invalid: when passing objects as input, a transform must be used to serialize them to strings or Uint8Arrays: ${invalidItem}.`);
	}
};
