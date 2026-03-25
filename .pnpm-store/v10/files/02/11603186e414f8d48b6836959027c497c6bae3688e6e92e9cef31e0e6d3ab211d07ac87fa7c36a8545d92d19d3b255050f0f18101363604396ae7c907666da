export const identity = value => value;

export const noop = () => undefined;

export const getContentsProperty = ({contents}) => contents;

export const throwObjectStream = chunk => {
	throw new Error(`Streams in object mode are not supported: ${String(chunk)}`);
};

export const getLengthProperty = convertedChunk => convertedChunk.length;
