import {
	MESSAGE_SYNC,
	MESSAGE_AWARENESS,
	MESSAGE_SUBSCRIBE,
	MESSAGE_UNSUBSCRIBE,
	MESSAGE_CONNECTED,
	MESSAGE_DISCONNECTED,
	MESSAGE_INITIAL_SYNC,
	encodeMessage,
	decodeMessage,
	encodeWithDocId,
	decodeWithDocId,
	stripDocId,
	addDocId,
	encodeString,
	decodeString,
} from './protocol';

describe('Protocol', () => {
	describe('Message constants', () => {
		it('should have correct message type values', () => {
			expect(MESSAGE_SYNC).toBe(0);
			expect(MESSAGE_AWARENESS).toBe(1);
			expect(MESSAGE_SUBSCRIBE).toBe(2);
			expect(MESSAGE_UNSUBSCRIBE).toBe(3);
			expect(MESSAGE_CONNECTED).toBe(4);
			expect(MESSAGE_DISCONNECTED).toBe(5);
			expect(MESSAGE_INITIAL_SYNC).toBe(6);
		});
	});

	describe('encodeMessage / decodeMessage', () => {
		it('should encode and decode a message with payload', () => {
			const payload = new Uint8Array([1, 2, 3, 4, 5]);
			const encoded = encodeMessage(MESSAGE_SYNC, payload);

			expect(encoded[0]).toBe(MESSAGE_SYNC);
			expect(encoded.length).toBe(6); // 1 type + 5 payload

			const decoded = decodeMessage(encoded);
			expect(decoded.messageType).toBe(MESSAGE_SYNC);
			expect(decoded.payload).toEqual(payload);
		});

		it('should encode and decode a message with empty payload', () => {
			const payload = new Uint8Array(0);
			const encoded = encodeMessage(MESSAGE_DISCONNECTED, payload);

			expect(encoded.length).toBe(1); // just type byte

			const decoded = decodeMessage(encoded);
			expect(decoded.messageType).toBe(MESSAGE_DISCONNECTED);
			expect(decoded.payload.length).toBe(0);
		});

		it('should throw on empty message', () => {
			expect(() => decodeMessage(new Uint8Array(0))).toThrow('Empty message');
		});

		it('should handle all message types', () => {
			const types = [
				MESSAGE_SYNC,
				MESSAGE_AWARENESS,
				MESSAGE_SUBSCRIBE,
				MESSAGE_UNSUBSCRIBE,
				MESSAGE_CONNECTED,
				MESSAGE_DISCONNECTED,
				MESSAGE_INITIAL_SYNC,
			];

			types.forEach((type) => {
				const payload = new Uint8Array([42]);
				const encoded = encodeMessage(type, payload);
				const decoded = decodeMessage(encoded);
				expect(decoded.messageType).toBe(type);
			});
		});
	});

	describe('encodeWithDocId / decodeWithDocId', () => {
		it('should encode and decode a message with docId and payload', () => {
			const docId = 'workflow-123';
			const payload = new Uint8Array([10, 20, 30]);
			const encoded = encodeWithDocId(MESSAGE_SYNC, docId, payload);

			const decoded = decodeWithDocId(encoded);
			expect(decoded.messageType).toBe(MESSAGE_SYNC);
			expect(decoded.docId).toBe(docId);
			expect(decoded.payload).toEqual(payload);
		});

		it('should encode and decode a message with docId and no payload', () => {
			const docId = 'doc-456';
			const encoded = encodeWithDocId(MESSAGE_UNSUBSCRIBE, docId);

			const decoded = decodeWithDocId(encoded);
			expect(decoded.messageType).toBe(MESSAGE_UNSUBSCRIBE);
			expect(decoded.docId).toBe(docId);
			expect(decoded.payload.length).toBe(0);
		});

		it('should handle unicode docIds', () => {
			const docId = 'workflow-αβγ-日本語';
			const payload = new Uint8Array([1, 2, 3]);
			const encoded = encodeWithDocId(MESSAGE_AWARENESS, docId, payload);

			const decoded = decodeWithDocId(encoded);
			expect(decoded.docId).toBe(docId);
		});

		it('should handle empty docId', () => {
			const docId = '';
			const payload = new Uint8Array([99]);
			const encoded = encodeWithDocId(MESSAGE_SYNC, docId, payload);

			const decoded = decodeWithDocId(encoded);
			expect(decoded.docId).toBe('');
			expect(decoded.payload).toEqual(payload);
		});

		it('should handle long docIds', () => {
			const docId = 'a'.repeat(1000);
			const encoded = encodeWithDocId(MESSAGE_SYNC, docId);

			const decoded = decodeWithDocId(encoded);
			expect(decoded.docId).toBe(docId);
		});

		it('should throw on message too short', () => {
			expect(() => decodeWithDocId(new Uint8Array([0]))).toThrow(
				'Message too short to contain docId',
			);
			expect(() => decodeWithDocId(new Uint8Array([0, 0]))).toThrow(
				'Message too short to contain docId',
			);
		});

		it('should throw on truncated docId', () => {
			// Message says docId is 10 bytes but only 2 are present
			const truncated = new Uint8Array([0, 0, 10, 65, 66]); // type=0, docIdLen=10, only "AB"
			expect(() => decodeWithDocId(truncated)).toThrow(
				'Message too short for declared docId length',
			);
		});

		it('should correctly encode docIdLen as big-endian u16', () => {
			// Test a docId longer than 255 characters (requires 2-byte length)
			const docId = 'x'.repeat(300);
			const encoded = encodeWithDocId(MESSAGE_SYNC, docId);

			// Check the length bytes manually
			const docIdLen = (encoded[1] << 8) | encoded[2];
			expect(docIdLen).toBe(300);

			const decoded = decodeWithDocId(encoded);
			expect(decoded.docId.length).toBe(300);
		});
	});

	describe('stripDocId', () => {
		it('should strip docId from worker message', () => {
			const docId = 'workflow-123';
			const payload = new Uint8Array([1, 2, 3]);
			const workerMsg = encodeWithDocId(MESSAGE_SYNC, docId, payload);

			const serverMsg = stripDocId(workerMsg);

			expect(serverMsg[0]).toBe(MESSAGE_SYNC);
			expect(serverMsg.subarray(1)).toEqual(payload);
		});

		it('should preserve empty payload', () => {
			const workerMsg = encodeWithDocId(MESSAGE_DISCONNECTED, 'doc-1');
			const serverMsg = stripDocId(workerMsg);

			expect(serverMsg.length).toBe(1);
			expect(serverMsg[0]).toBe(MESSAGE_DISCONNECTED);
		});
	});

	describe('addDocId', () => {
		it('should add docId to server message', () => {
			const payload = new Uint8Array([10, 20, 30]);
			const serverMsg = encodeMessage(MESSAGE_AWARENESS, payload);

			const workerMsg = addDocId('my-doc', serverMsg);
			const decoded = decodeWithDocId(workerMsg);

			expect(decoded.messageType).toBe(MESSAGE_AWARENESS);
			expect(decoded.docId).toBe('my-doc');
			expect(decoded.payload).toEqual(payload);
		});

		it('should handle empty payload', () => {
			const serverMsg = encodeMessage(MESSAGE_CONNECTED, new Uint8Array(0));
			const workerMsg = addDocId('doc-xyz', serverMsg);
			const decoded = decodeWithDocId(workerMsg);

			expect(decoded.messageType).toBe(MESSAGE_CONNECTED);
			expect(decoded.docId).toBe('doc-xyz');
			expect(decoded.payload.length).toBe(0);
		});
	});

	describe('stripDocId and addDocId roundtrip', () => {
		it('should be inverse operations', () => {
			const docId = 'test-doc';
			const originalPayload = new Uint8Array([5, 10, 15, 20]);

			// Start with server message
			const serverMsg = encodeMessage(MESSAGE_SYNC, originalPayload);

			// Add docId
			const workerMsg = addDocId(docId, serverMsg);

			// Strip docId
			const backToServer = stripDocId(workerMsg);

			// Should match original
			expect(backToServer).toEqual(serverMsg);
		});
	});

	describe('encodeString / decodeString', () => {
		it('should encode and decode a simple string', () => {
			const str = 'wss://server.example.com/crdt';
			const encoded = encodeString(str);
			const decoded = decodeString(encoded);

			expect(decoded).toBe(str);
		});

		it('should handle empty string', () => {
			const str = '';
			const encoded = encodeString(str);
			const decoded = decodeString(encoded);

			expect(decoded).toBe(str);
			expect(encoded.length).toBe(0);
		});

		it('should handle unicode strings', () => {
			const str = 'https://例え.jp/path?name=日本語';
			const encoded = encodeString(str);
			const decoded = decodeString(encoded);

			expect(decoded).toBe(str);
		});

		it('should handle emoji', () => {
			const str = 'doc-🚀-test';
			const encoded = encodeString(str);
			const decoded = decodeString(encoded);

			expect(decoded).toBe(str);
		});
	});
});
