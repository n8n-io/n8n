import {isReadableStream} from 'is-stream';
import {isUint8Array} from '../utils/uint-array.js';
import {isUrl, isFilePathString} from './type.js';

// Append the `stdin` option with the `input` and `inputFile` options
export const handleInputOptions = ({input, inputFile}, fdNumber) => fdNumber === 0
	? [
		...handleInputOption(input),
		...handleInputFileOption(inputFile),
	]
	: [];

const handleInputOption = input => input === undefined ? [] : [{
	type: getInputType(input),
	value: input,
	optionName: 'input',
}];

const getInputType = input => {
	if (isReadableStream(input, {checkOpen: false})) {
		return 'nodeStream';
	}

	if (typeof input === 'string') {
		return 'string';
	}

	if (isUint8Array(input)) {
		return 'uint8Array';
	}

	throw new Error('The `input` option must be a string, a Uint8Array or a Node.js Readable stream.');
};

const handleInputFileOption = inputFile => inputFile === undefined ? [] : [{
	...getInputFileType(inputFile),
	optionName: 'inputFile',
}];

const getInputFileType = inputFile => {
	if (isUrl(inputFile)) {
		return {type: 'fileUrl', value: inputFile};
	}

	if (isFilePathString(inputFile)) {
		return {type: 'filePath', value: {file: inputFile}};
	}

	throw new Error('The `inputFile` option must be a file path string or a file URL.');
};
