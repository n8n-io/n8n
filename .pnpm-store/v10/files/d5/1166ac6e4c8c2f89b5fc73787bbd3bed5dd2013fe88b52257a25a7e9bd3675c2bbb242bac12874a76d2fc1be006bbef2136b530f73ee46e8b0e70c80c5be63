import {
	SPECIAL_DUPLICATE_TYPES_SYNC,
	SPECIAL_DUPLICATE_TYPES,
	FORBID_DUPLICATE_TYPES,
	TYPE_TO_MESSAGE,
} from './type.js';

// Duplicates in the same file descriptor is most likely an error.
// However, this can be useful with generators.
export const filterDuplicates = stdioItems => stdioItems.filter((stdioItemOne, indexOne) =>
	stdioItems.every((stdioItemTwo, indexTwo) => stdioItemOne.value !== stdioItemTwo.value
		|| indexOne >= indexTwo
		|| stdioItemOne.type === 'generator'
		|| stdioItemOne.type === 'asyncGenerator'));

// Check if two file descriptors are sharing the same target.
// For example `{stdout: {file: './output.txt'}, stderr: {file: './output.txt'}}`.
export const getDuplicateStream = ({stdioItem: {type, value, optionName}, direction, fileDescriptors, isSync}) => {
	const otherStdioItems = getOtherStdioItems(fileDescriptors, type);
	if (otherStdioItems.length === 0) {
		return;
	}

	if (isSync) {
		validateDuplicateStreamSync({
			otherStdioItems,
			type,
			value,
			optionName,
			direction,
		});
		return;
	}

	if (SPECIAL_DUPLICATE_TYPES.has(type)) {
		return getDuplicateStreamInstance({
			otherStdioItems,
			type,
			value,
			optionName,
			direction,
		});
	}

	if (FORBID_DUPLICATE_TYPES.has(type)) {
		validateDuplicateTransform({
			otherStdioItems,
			type,
			value,
			optionName,
		});
	}
};

// Values shared by multiple file descriptors
const getOtherStdioItems = (fileDescriptors, type) => fileDescriptors
	.flatMap(({direction, stdioItems}) => stdioItems
		.filter(stdioItem => stdioItem.type === type)
		.map((stdioItem => ({...stdioItem, direction}))));

// With `execaSync()`, do not allow setting a file path both in input and output
const validateDuplicateStreamSync = ({otherStdioItems, type, value, optionName, direction}) => {
	if (SPECIAL_DUPLICATE_TYPES_SYNC.has(type)) {
		getDuplicateStreamInstance({
			otherStdioItems,
			type,
			value,
			optionName,
			direction,
		});
	}
};

// When two file descriptors share the file or stream, we need to re-use the same underlying stream.
// Otherwise, the stream would be closed twice when piping ends.
// This is only an issue with output file descriptors.
// This is not a problem with generator functions since those create a new instance for each file descriptor.
// We also forbid input and output file descriptors sharing the same file or stream, since that does not make sense.
const getDuplicateStreamInstance = ({otherStdioItems, type, value, optionName, direction}) => {
	const duplicateStdioItems = otherStdioItems.filter(stdioItem => hasSameValue(stdioItem, value));
	if (duplicateStdioItems.length === 0) {
		return;
	}

	const differentStdioItem = duplicateStdioItems.find(stdioItem => stdioItem.direction !== direction);
	throwOnDuplicateStream(differentStdioItem, optionName, type);

	return direction === 'output' ? duplicateStdioItems[0].stream : undefined;
};

const hasSameValue = ({type, value}, secondValue) => {
	if (type === 'filePath') {
		return value.file === secondValue.file;
	}

	if (type === 'fileUrl') {
		return value.href === secondValue.href;
	}

	return value === secondValue;
};

// We do not allow two file descriptors to share the same Duplex or TransformStream.
// This is because those are set directly to `subprocess.std*`.
// For example, this could result in `subprocess.stdout` and `subprocess.stderr` being the same value.
// This means reading from either would get data from both stdout and stderr.
const validateDuplicateTransform = ({otherStdioItems, type, value, optionName}) => {
	const duplicateStdioItem = otherStdioItems.find(({value: {transform}}) => transform === value.transform);
	throwOnDuplicateStream(duplicateStdioItem, optionName, type);
};

const throwOnDuplicateStream = (stdioItem, optionName, type) => {
	if (stdioItem !== undefined) {
		throw new TypeError(`The \`${stdioItem.optionName}\` and \`${optionName}\` options must not target ${TYPE_TO_MESSAGE[type]} that is the same.`);
	}
};
