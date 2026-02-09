export interface ServerSentEventMessage {
	/** Ignored by the client. */
	comment?: string;
	/** A string identifying the type of event described. */
	event?: string;
	/** The data field for the message. Split by new lines. */
	data?: string;
	/** The event ID to set the object's last event ID value. */
	id?: string | number;
	/** The reconnection time. */
	retry?: number;
}

/**
 * Parse a Server-Sent Events (SSE) stream according to the SSE specification.
 * Handles multi-line data fields, all SSE field types, and proper event buffering.
 *
 * Features:
 * - Correctly handles multi-line data fields (joined with \n)
 * - Supports all SSE fields: event, data, id, retry, and comments
 * - Handles partial UTF-8 sequences across chunks
 * - Supports CR, LF, and CRLF line endings
 * - Properly buffers incomplete lines
 *
 * @param body - ReadableStream from a fetch response
 * @returns AsyncIterable of parsed SSE messages
 *
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html
 */
export async function* parseSSEStream(
	body: ReadableStream<Uint8Array>,
): AsyncIterable<ServerSentEventMessage> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	// Current event being assembled
	let currentEvent: ServerSentEventMessage = {};
	let dataLines: string[] = [];

	try {
		while (true) {
			const { done, value } = await reader.read();

			if (done) {
				// Flush the decoder to get any trailing partial UTF-8 sequence
				buffer += decoder.decode();

				// Process any remaining buffered content
				if (buffer !== '') {
					const event = processLine(buffer);
					if (event) {
						yield event;
					}
				}
				// Yield final event if it has content
				if (hasEventContent()) {
					yield finalizeEvent();
				}
				break;
			}

			// Decode the chunk and add to buffer (stream: true preserves partial UTF-8 sequences)
			buffer += decoder.decode(value, { stream: true });

			// Process complete lines
			// SSE spec supports CR, LF, and CRLF as line terminators
			const lines = buffer.split(/\r\n|\r|\n/);
			// Keep the last incomplete line in the buffer
			buffer = lines.pop() ?? '';

			for (const line of lines) {
				const event = processLine(line);
				if (event) {
					yield event;
				}
			}
		}
	} finally {
		reader.releaseLock();
	}

	function processLine(line: string): ServerSentEventMessage | null {
		// Empty line marks the end of an event
		if (line === '') {
			if (hasEventContent()) {
				const event = finalizeEvent();
				// Reset for next event
				currentEvent = {};
				dataLines = [];
				return event;
			}
			return null;
		}

		// Lines starting with : are comments (ignored per spec, but we can store them)
		if (line.startsWith(':')) {
			currentEvent.comment = line.slice(1).trimStart();
			return null;
		}

		// Parse field: value
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) {
			// Field with no value (e.g., "data" alone means data: "")
			processField(line, '');
			return null;
		}

		const fieldName = line.slice(0, colonIndex);
		// Remove optional single space after colon per SSE spec
		let fieldValue = line.slice(colonIndex + 1);
		if (fieldValue.startsWith(' ')) {
			fieldValue = fieldValue.slice(1);
		}

		processField(fieldName, fieldValue);
		return null;
	}

	function processField(name: string, value: string): void {
		switch (name) {
			case 'event': {
				currentEvent.event = value;
				break;
			}
			case 'data': {
				// Data fields can be multi-line; collect them
				dataLines.push(value);
				break;
			}
			case 'id': {
				// Only set id if value is not empty per SSE spec
				if (value) {
					// Try to parse as number, otherwise keep as string
					const numId = Number(value);
					currentEvent.id = Number.isNaN(numId) ? value : numId;
				}
				break;
			}
			case 'retry': {
				// Retry must be a valid non-negative integer per SSE spec
				const retryValue = Number.parseInt(value, 10);
				if (!Number.isNaN(retryValue) && retryValue >= 0) {
					currentEvent.retry = retryValue;
				}
				break;
			}
			default: {
				// Unknown fields are ignored per SSE spec
				break;
			}
		}
	}

	function hasEventContent(): boolean {
		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		return !!(currentEvent.event || dataLines.length > 0 || currentEvent.id || currentEvent.retry);
	}

	function finalizeEvent(): ServerSentEventMessage {
		// Join data lines with newline character per SSE spec
		const finalData = dataLines.join('\n');
		return {
			...currentEvent,
			data: finalData ? finalData : undefined,
		};
	}
}
