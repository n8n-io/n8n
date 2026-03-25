import isPlainObj from 'is-plain-obj';
import {BINARY_ENCODINGS} from '../arguments/encoding-option.js';
import {TRANSFORM_TYPES} from '../stdio/type.js';
import {getTransformObjectModes} from './object-mode.js';

// Transforms generators/duplex/TransformStream can have multiple shapes.
// This normalizes it and applies default values.
export const normalizeTransforms = (stdioItems, optionName, direction, options) => [
	...stdioItems.filter(({type}) => !TRANSFORM_TYPES.has(type)),
	...getTransforms(stdioItems, optionName, direction, options),
];

const getTransforms = (stdioItems, optionName, direction, {encoding}) => {
	const transforms = stdioItems.filter(({type}) => TRANSFORM_TYPES.has(type));
	const newTransforms = Array.from({length: transforms.length});

	for (const [index, stdioItem] of Object.entries(transforms)) {
		newTransforms[index] = normalizeTransform({
			stdioItem,
			index: Number(index),
			newTransforms,
			optionName,
			direction,
			encoding,
		});
	}

	return sortTransforms(newTransforms, direction);
};

const normalizeTransform = ({stdioItem, stdioItem: {type}, index, newTransforms, optionName, direction, encoding}) => {
	if (type === 'duplex') {
		return normalizeDuplex({stdioItem, optionName});
	}

	if (type === 'webTransform') {
		return normalizeTransformStream({
			stdioItem,
			index,
			newTransforms,
			direction,
		});
	}

	return normalizeGenerator({
		stdioItem,
		index,
		newTransforms,
		direction,
		encoding,
	});
};

const normalizeDuplex = ({
	stdioItem,
	stdioItem: {
		value: {
			transform,
			transform: {writableObjectMode, readableObjectMode},
			objectMode = readableObjectMode,
		},
	},
	optionName,
}) => {
	if (objectMode && !readableObjectMode) {
		throw new TypeError(`The \`${optionName}.objectMode\` option can only be \`true\` if \`new Duplex({objectMode: true})\` is used.`);
	}

	if (!objectMode && readableObjectMode) {
		throw new TypeError(`The \`${optionName}.objectMode\` option cannot be \`false\` if \`new Duplex({objectMode: true})\` is used.`);
	}

	return {
		...stdioItem,
		value: {transform, writableObjectMode, readableObjectMode},
	};
};

const normalizeTransformStream = ({stdioItem, stdioItem: {value}, index, newTransforms, direction}) => {
	const {transform, objectMode} = isPlainObj(value) ? value : {transform: value};
	const {writableObjectMode, readableObjectMode} = getTransformObjectModes(objectMode, index, newTransforms, direction);
	return ({
		...stdioItem,
		value: {transform, writableObjectMode, readableObjectMode},
	});
};

const normalizeGenerator = ({stdioItem, stdioItem: {value}, index, newTransforms, direction, encoding}) => {
	const {
		transform,
		final,
		binary: binaryOption = false,
		preserveNewlines = false,
		objectMode,
	} = isPlainObj(value) ? value : {transform: value};
	const binary = binaryOption || BINARY_ENCODINGS.has(encoding);
	const {writableObjectMode, readableObjectMode} = getTransformObjectModes(objectMode, index, newTransforms, direction);
	return {
		...stdioItem,
		value: {
			transform,
			final,
			binary,
			preserveNewlines,
			writableObjectMode,
			readableObjectMode,
		},
	};
};

const sortTransforms = (newTransforms, direction) => direction === 'input' ? newTransforms.reverse() : newTransforms;
