import 'reflect-metadata';

// Mock crypto.getRandomValues to return static value
const originalGetRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);

globalThis.crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
	if (array instanceof Uint8Array) {
		array.fill(0xaa);
		return array;
	}
	return originalGetRandomValues(array);
};

jest.mock('@sentry/node');
jest.mock('@n8n_io/license-sdk');
jest.mock('@/telemetry');
jest.mock('@/eventbus/message-event-bus/message-event-bus');
jest.mock('@/push');
jest.mock('node:fs');
jest.mock('node:fs/promises');
