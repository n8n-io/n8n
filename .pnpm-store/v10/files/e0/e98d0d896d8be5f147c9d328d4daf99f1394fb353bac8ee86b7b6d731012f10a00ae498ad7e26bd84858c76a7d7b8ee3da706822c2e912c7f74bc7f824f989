import {writeFileSync, appendFileSync} from 'node:fs';
import {shouldLogOutput, logLinesSync} from '../verbose/output.js';
import {runGeneratorsSync} from '../transform/generator.js';
import {splitLinesSync} from '../transform/split.js';
import {joinToString, joinToUint8Array, bufferToUint8Array} from '../utils/uint-array.js';
import {FILE_TYPES} from '../stdio/type.js';
import {truncateMaxBufferSync} from './max-buffer.js';

// Apply `stdout`/`stderr` options, after spawning, in sync mode
export const transformOutputSync = ({fileDescriptors, syncResult: {output}, options, isMaxBuffer, verboseInfo}) => {
	if (output === null) {
		return {output: Array.from({length: 3})};
	}

	const state = {};
	const outputFiles = new Set([]);
	const transformedOutput = output.map((result, fdNumber) =>
		transformOutputResultSync({
			result,
			fileDescriptors,
			fdNumber,
			state,
			outputFiles,
			isMaxBuffer,
			verboseInfo,
		}, options));
	return {output: transformedOutput, ...state};
};

const transformOutputResultSync = (
	{result, fileDescriptors, fdNumber, state, outputFiles, isMaxBuffer, verboseInfo},
	{buffer, encoding, lines, stripFinalNewline, maxBuffer},
) => {
	if (result === null) {
		return;
	}

	const truncatedResult = truncateMaxBufferSync(result, isMaxBuffer, maxBuffer);
	const uint8ArrayResult = bufferToUint8Array(truncatedResult);
	const {stdioItems, objectMode} = fileDescriptors[fdNumber];
	const chunks = runOutputGeneratorsSync([uint8ArrayResult], stdioItems, encoding, state);
	const {serializedResult, finalResult = serializedResult} = serializeChunks({
		chunks,
		objectMode,
		encoding,
		lines,
		stripFinalNewline,
		fdNumber,
	});

	logOutputSync({
		serializedResult,
		fdNumber,
		state,
		verboseInfo,
		encoding,
		stdioItems,
		objectMode,
	});

	const returnedResult = buffer[fdNumber] ? finalResult : undefined;

	try {
		if (state.error === undefined) {
			writeToFiles(serializedResult, stdioItems, outputFiles);
		}

		return returnedResult;
	} catch (error) {
		state.error = error;
		return returnedResult;
	}
};

// Applies transform generators to `stdout`/`stderr`
const runOutputGeneratorsSync = (chunks, stdioItems, encoding, state) => {
	try {
		return runGeneratorsSync(chunks, stdioItems, encoding, false);
	} catch (error) {
		state.error = error;
		return chunks;
	}
};

// The contents is converted to three stages:
//  - serializedResult: used when the target is a file path/URL or a file descriptor (including 'inherit')
//  - finalResult/returnedResult: returned as `result.std*`
const serializeChunks = ({chunks, objectMode, encoding, lines, stripFinalNewline, fdNumber}) => {
	if (objectMode) {
		return {serializedResult: chunks};
	}

	if (encoding === 'buffer') {
		return {serializedResult: joinToUint8Array(chunks)};
	}

	const serializedResult = joinToString(chunks, encoding);
	if (lines[fdNumber]) {
		return {serializedResult, finalResult: splitLinesSync(serializedResult, !stripFinalNewline[fdNumber], objectMode)};
	}

	return {serializedResult};
};

const logOutputSync = ({serializedResult, fdNumber, state, verboseInfo, encoding, stdioItems, objectMode}) => {
	if (!shouldLogOutput({
		stdioItems,
		encoding,
		verboseInfo,
		fdNumber,
	})) {
		return;
	}

	const linesArray = splitLinesSync(serializedResult, false, objectMode);

	try {
		logLinesSync(linesArray, fdNumber, verboseInfo);
	} catch (error) {
		state.error ??= error;
	}
};

// When the `std*` target is a file path/URL or a file descriptor
const writeToFiles = (serializedResult, stdioItems, outputFiles) => {
	for (const {path, append} of stdioItems.filter(({type}) => FILE_TYPES.has(type))) {
		const pathString = typeof path === 'string' ? path : path.toString();
		if (append || outputFiles.has(pathString)) {
			appendFileSync(path, serializedResult);
		} else {
			outputFiles.add(pathString);
			writeFileSync(path, serializedResult);
		}
	}
};
