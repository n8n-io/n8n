import {getStreamOutput} from '../io/contents.js';
import {waitForStream, isInputFileDescriptor} from './wait-stream.js';

// Read the contents of `subprocess.std*` and|or wait for its completion
export const waitForStdioStreams = ({subprocess, encoding, buffer, maxBuffer, lines, stripFinalNewline, verboseInfo, streamInfo}) => subprocess.stdio.map((stream, fdNumber) => waitForSubprocessStream({
	stream,
	fdNumber,
	encoding,
	buffer: buffer[fdNumber],
	maxBuffer: maxBuffer[fdNumber],
	lines: lines[fdNumber],
	allMixed: false,
	stripFinalNewline,
	verboseInfo,
	streamInfo,
}));

// Read the contents of `subprocess.std*` or `subprocess.all` and|or wait for its completion
export const waitForSubprocessStream = async ({stream, fdNumber, encoding, buffer, maxBuffer, lines, allMixed, stripFinalNewline, verboseInfo, streamInfo}) => {
	if (!stream) {
		return;
	}

	const onStreamEnd = waitForStream(stream, fdNumber, streamInfo);
	if (isInputFileDescriptor(streamInfo, fdNumber)) {
		await onStreamEnd;
		return;
	}

	const [output] = await Promise.all([
		getStreamOutput({
			stream,
			onStreamEnd,
			fdNumber,
			encoding,
			buffer,
			maxBuffer,
			lines,
			allMixed,
			stripFinalNewline,
			verboseInfo,
			streamInfo,
		}),
		onStreamEnd,
	]);
	return output;
};
