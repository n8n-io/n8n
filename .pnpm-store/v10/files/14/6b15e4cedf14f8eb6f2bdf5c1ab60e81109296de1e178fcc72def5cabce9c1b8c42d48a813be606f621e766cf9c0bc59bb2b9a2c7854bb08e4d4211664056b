import {createReadStream, createWriteStream} from 'node:fs';
import {Buffer} from 'node:buffer';
import {Readable, Writable, Duplex} from 'node:stream';
import {generatorToStream} from '../transform/generator.js';
import {handleStdio} from './handle.js';
import {TYPE_TO_MESSAGE} from './type.js';

// Handle `input`, `inputFile`, `stdin`, `stdout` and `stderr` options, before spawning, in async mode
export const handleStdioAsync = (options, verboseInfo) => handleStdio(addPropertiesAsync, options, verboseInfo, false);

const forbiddenIfAsync = ({type, optionName}) => {
	throw new TypeError(`The \`${optionName}\` option cannot be ${TYPE_TO_MESSAGE[type]}.`);
};

// Create streams used internally for piping when using specific values for the `std*` options, in async mode.
// For example, `stdout: {file}` creates a file stream, which is piped from/to.
const addProperties = {
	fileNumber: forbiddenIfAsync,
	generator: generatorToStream,
	asyncGenerator: generatorToStream,
	nodeStream: ({value}) => ({stream: value}),
	webTransform({value: {transform, writableObjectMode, readableObjectMode}}) {
		const objectMode = writableObjectMode || readableObjectMode;
		const stream = Duplex.fromWeb(transform, {objectMode});
		return {stream};
	},
	duplex: ({value: {transform}}) => ({stream: transform}),
	native() {},
};

const addPropertiesAsync = {
	input: {
		...addProperties,
		fileUrl: ({value}) => ({stream: createReadStream(value)}),
		filePath: ({value: {file}}) => ({stream: createReadStream(file)}),
		webStream: ({value}) => ({stream: Readable.fromWeb(value)}),
		iterable: ({value}) => ({stream: Readable.from(value)}),
		asyncIterable: ({value}) => ({stream: Readable.from(value)}),
		string: ({value}) => ({stream: Readable.from(value)}),
		uint8Array: ({value}) => ({stream: Readable.from(Buffer.from(value))}),
	},
	output: {
		...addProperties,
		fileUrl: ({value}) => ({stream: createWriteStream(value)}),
		filePath: ({value: {file, append}}) => ({stream: createWriteStream(file, append ? {flags: 'a'} : {})}),
		webStream: ({value}) => ({stream: Writable.fromWeb(value)}),
		iterable: forbiddenIfAsync,
		asyncIterable: forbiddenIfAsync,
		string: forbiddenIfAsync,
		uint8Array: forbiddenIfAsync,
	},
};
