import { mock } from 'jest-mock-extended';

import type { ErrorReporter } from 'n8n-core';
import { BlobBundleStore } from '../bundle-store';
import type { BlobStore } from '../types';

type Ref = {
	id: string;
};

type Payload = {
	value: string;
};

class CorruptedBundleError extends Error {
	constructor(
		readonly ref: Ref,
		readonly corruptionCause: unknown,
	) {
		super('Corrupted bundle');
	}
}

const ref = { id: 'bundle-1' };

const createStore = (content: Buffer | null) => {
	const blobStore: BlobStore = {
		write: async () => 0,
		read: async () => content,
		delete: async () => {},
	};
	const errorReporter = mock<ErrorReporter>();
	const store = new BlobBundleStore<Ref, Payload>({
		blobStore,
		errorReporter,
		version: 1,
		key: ({ id }) => id,
		getId: ({ id }) => id,
		createWriteError: () => new Error('Write failed'),
		createCorruptedError: (targetRef, error) => new CorruptedBundleError(targetRef, error),
	});

	return { errorReporter, store };
};

describe('BlobBundleStore', () => {
	it('should reject bundles with an unsupported version', async () => {
		const { store } = createStore(Buffer.from(JSON.stringify({ value: 'payload', version: 2 })));

		await expect(store.read(ref)).rejects.toThrow(CorruptedBundleError);
	});

	it('should report and omit unsupported versions in batch reads', async () => {
		const { errorReporter, store } = createStore(
			Buffer.from(JSON.stringify({ value: 'payload', version: 2 })),
		);

		const bundles = await store.readMany([ref]);

		expect(bundles.size).toBe(0);
		expect(errorReporter.error).toHaveBeenCalledWith(expect.any(CorruptedBundleError));
	});
});
