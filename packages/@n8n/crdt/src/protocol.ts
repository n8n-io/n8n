/**
 * WebSocket message protocol constants.
 *
 * Following the y-websocket protocol, messages are prefixed with a type byte
 * to multiplex different message types over the same connection.
 *
 * Server protocol format: [messageType: u8, ...payload]
 * Worker protocol format: [messageType: u8, docIdLen: u16, docId: utf8, ...payload]
 */

// =============================================================================
// Message Types
// =============================================================================

/**
 * Sync message type - contains CRDT document updates.
 * Payload is the raw CRDT update bytes.
 */
export const MESSAGE_SYNC = 0;

/**
 * Awareness message type - contains ephemeral presence/cursor data.
 * Payload is awareness update bytes.
 */
export const MESSAGE_AWARENESS = 1;

/**
 * Subscribe message type - request to subscribe to a document.
 * Payload is serverUrl as UTF-8 string (empty for local-only docs).
 */
export const MESSAGE_SUBSCRIBE = 2;

/**
 * Unsubscribe message type - request to unsubscribe from a document.
 * Payload is empty.
 */
export const MESSAGE_UNSUBSCRIBE = 3;

/**
 * Connected message type - notification that server connection is established.
 * Sent from worker to frontend. Payload is empty.
 */
export const MESSAGE_CONNECTED = 4;

/**
 * Disconnected message type - notification that server connection was lost.
 * Sent from worker to frontend. Payload is empty.
 */
export const MESSAGE_DISCONNECTED = 5;

/**
 * Initial sync message type - notification that initial sync is complete.
 * Sent from worker to frontend after first server data is received. Payload is empty.
 */
export const MESSAGE_INITIAL_SYNC = 6;

/**
 * Encode a message with type prefix.
 * @param messageType - The message type (MESSAGE_SYNC or MESSAGE_AWARENESS)
 * @param payload - The message payload bytes
 * @returns Encoded message with type prefix
 */
export function encodeMessage(messageType: number, payload: Uint8Array): Uint8Array {
	const result = new Uint8Array(1 + payload.length);
	result[0] = messageType;
	result.set(payload, 1);
	return result;
}

/**
 * Decode a message to extract type and payload.
 * @param data - The encoded message bytes
 * @returns Object with messageType and payload
 */
export function decodeMessage(data: Uint8Array): { messageType: number; payload: Uint8Array } {
	if (data.length === 0) {
		throw new Error('Empty message');
	}
	return {
		messageType: data[0],
		payload: data.subarray(1),
	};
}

// =============================================================================
// Worker Protocol (with docId for multiplexing)
// =============================================================================

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Encode a message with docId prefix for worker routing.
 * Format: [messageType: u8, docIdLen: u16, docId: utf8, ...payload]
 *
 * @param messageType - The message type
 * @param docId - Document ID for routing
 * @param payload - Optional payload bytes (default: empty)
 * @returns Encoded message with docId prefix
 */
export function encodeWithDocId(
	messageType: number,
	docId: string,
	payload: Uint8Array = new Uint8Array(0),
): Uint8Array {
	const docIdBytes = textEncoder.encode(docId);
	const docIdLen = docIdBytes.length;

	// Format: [type: 1][docIdLen: 2][docId: N][payload: M]
	const result = new Uint8Array(1 + 2 + docIdLen + payload.length);

	result[0] = messageType;
	// Write docIdLen as big-endian u16
	result[1] = (docIdLen >> 8) & 0xff;
	result[2] = docIdLen & 0xff;
	result.set(docIdBytes, 3);
	result.set(payload, 3 + docIdLen);

	return result;
}

/**
 * Decode a message with docId prefix.
 * @param data - The encoded message bytes
 * @returns Object with messageType, docId, and payload
 */
export function decodeWithDocId(data: Uint8Array): {
	messageType: number;
	docId: string;
	payload: Uint8Array;
} {
	if (data.length < 3) {
		throw new Error('Message too short to contain docId');
	}

	const messageType = data[0];
	// Read docIdLen as big-endian u16
	const docIdLen = (data[1] << 8) | data[2];

	if (data.length < 3 + docIdLen) {
		throw new Error('Message too short for declared docId length');
	}

	const docId = textDecoder.decode(data.subarray(3, 3 + docIdLen));
	const payload = data.subarray(3 + docIdLen);

	return { messageType, docId, payload };
}

/**
 * Strip docId from a worker message, returning server-format message.
 * Converts [type, docIdLen, docId, payload] → [type, payload]
 *
 * @param data - Worker-format message with docId
 * @returns Server-format message without docId
 */
export function stripDocId(data: Uint8Array): Uint8Array {
	const { messageType, payload } = decodeWithDocId(data);
	return encodeMessage(messageType, payload);
}

/**
 * Add docId to a server message, returning worker-format message.
 * Converts [type, payload] → [type, docIdLen, docId, payload]
 *
 * @param docId - Document ID to add
 * @param data - Server-format message
 * @returns Worker-format message with docId
 */
export function addDocId(docId: string, data: Uint8Array): Uint8Array {
	const { messageType, payload } = decodeMessage(data);
	return encodeWithDocId(messageType, docId, payload);
}

/**
 * Encode a string as UTF-8 bytes.
 * Useful for encoding serverUrl in SUBSCRIBE messages.
 */
export function encodeString(str: string): Uint8Array {
	return textEncoder.encode(str);
}

/**
 * Decode UTF-8 bytes as a string.
 * Useful for decoding serverUrl from SUBSCRIBE messages.
 */
export function decodeString(data: Uint8Array): string {
	return textDecoder.decode(data);
}
