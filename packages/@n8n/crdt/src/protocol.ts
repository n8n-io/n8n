/**
 * WebSocket message protocol constants.
 *
 * Following the y-websocket protocol, messages are prefixed with a type byte
 * to multiplex different message types over the same connection.
 *
 * Message format: [messageType: varUint, ...payload]
 */

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
