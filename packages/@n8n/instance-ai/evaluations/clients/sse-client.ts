// ---------------------------------------------------------------------------
// Lightweight SSE stream consumer
//
// Node.js has no built-in EventSource. This module implements a minimal
// SSE parser using native fetch() with streaming response body. It handles
// partial chunks, comment lines, and multi-field events per the SSE spec.
//
// Reference: https://html.spec.whatwg.org/multipage/server-sent-events.html
// ---------------------------------------------------------------------------

export interface SseEvent {
	id?: string;
	type?: string;
	data: string;
}

/**
 * Open an SSE connection and invoke `handler` for each received event.
 *
 * The function resolves when the stream ends (server closes connection or
 * the provided AbortSignal fires). It rejects if the initial fetch fails or
 * the response is not a valid SSE stream.
 */
export async function consumeSseStream(
	url: string,
	cookie: string,
	handler: (event: SseEvent) => void,
	signal: AbortSignal,
): Promise<void> {
	const res = await fetch(url, {
		headers: {
			cookie,
			Accept: 'text/event-stream',
		},
		signal,
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`SSE connection failed (${res.status}): ${text}`);
	}

	if (!res.body) {
		throw new Error('SSE response has no body');
	}

	const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();

	// Accumulator for partial lines (SSE data can be split across chunks)
	let buffer = '';

	// Current event being assembled
	let eventId: string | undefined;
	let eventType: string | undefined;
	let dataLines: string[] = [];

	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;

			buffer += value;

			// Process all complete lines in the buffer.
			// Lines are terminated by \n, \r\n, or \r.
			let lineEnd: number;
			while ((lineEnd = findLineEnd(buffer)) !== -1) {
				const line = buffer.slice(0, lineEnd);
				buffer = buffer.slice(lineEnd + getLineTerminatorLength(buffer, lineEnd));

				if (line === '') {
					// Empty line = end of event. Dispatch if we have data.
					if (dataLines.length > 0) {
						handler({
							id: eventId,
							type: eventType,
							data: dataLines.join('\n'),
						});
					}
					// Reset for next event
					eventId = undefined;
					eventType = undefined;
					dataLines = [];
					continue;
				}

				// Comment lines start with ':'
				if (line.startsWith(':')) {
					continue;
				}

				// Parse "field: value" or "field:value" or "field"
				const colonIndex = line.indexOf(':');
				let field: string;
				let fieldValue: string;

				if (colonIndex === -1) {
					// Field with no value
					field = line;
					fieldValue = '';
				} else {
					field = line.slice(0, colonIndex);
					// Per spec: if there's a space after the colon, skip it
					const valueStart = colonIndex + 1;
					fieldValue =
						valueStart < line.length && line[valueStart] === ' '
							? line.slice(valueStart + 1)
							: line.slice(valueStart);
				}

				switch (field) {
					case 'id':
						eventId = fieldValue;
						break;
					case 'event':
						eventType = fieldValue;
						break;
					case 'data':
						dataLines.push(fieldValue);
						break;
					case 'retry':
						// Ignored -- reconnection is handled externally
						break;
					default:
						// Unknown fields are ignored per spec
						break;
				}
			}
		}
	} catch (error: unknown) {
		// AbortError is expected when the signal fires -- swallow it
		if (isAbortError(error)) {
			return;
		}
		throw error;
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the index of the first line terminator (\n, \r\n, or \r) in the
 * buffer. Returns -1 if no complete line is available.
 */
function findLineEnd(buffer: string): number {
	for (let i = 0; i < buffer.length; i++) {
		if (buffer[i] === '\n') return i;
		if (buffer[i] === '\r') return i;
	}
	return -1;
}

/**
 * Determine the length of the line terminator at the given position.
 * Handles \r\n (2 chars) and \n or \r (1 char).
 */
function getLineTerminatorLength(buffer: string, position: number): number {
	if (buffer[position] === '\r' && position + 1 < buffer.length && buffer[position + 1] === '\n') {
		return 2;
	}
	return 1;
}

/**
 * Type guard for AbortError (thrown when fetch is aborted via AbortSignal).
 */
function isAbortError(error: unknown): boolean {
	if (error instanceof DOMException && error.name === 'AbortError') {
		return true;
	}
	// Node.js fetch may throw a plain Error with name 'AbortError'
	if (error instanceof Error && error.name === 'AbortError') {
		return true;
	}
	return false;
}
