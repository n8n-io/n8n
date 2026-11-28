import type { CredentialsEntity } from '@n8n/db';

import { CredentialSerializer } from '../credential.serializer';

function makeCredential(overrides: Partial<CredentialsEntity> = {}): CredentialsEntity {
	return {
		id: 'cred-1',
		name: 'My Credential',
		type: 'httpHeaderAuth',
		data: 'encrypted-blob-do-not-export',
		isManaged: false,
		isGlobal: false,
		isResolvable: false,
		resolvableAllowFallback: false,
		resolverId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		shared: [],
		...overrides,
	} as unknown as CredentialsEntity;
}

describe('CredentialSerializer', () => {
	const serializer = new CredentialSerializer();

	it('returns exactly id, name, type, description', () => {
		const credential = makeCredential();

		const serialized = serializer.serialize(credential);

		expect(Object.keys(serialized).sort()).toEqual(['description', 'id', 'name', 'type']);
		expect(serialized).toEqual({
			id: 'cred-1',
			name: 'My Credential',
			type: 'httpHeaderAuth',
			description: null,
		});
	});

	it('emits the description', () => {
		const serialized = serializer.serialize(makeCredential({ description: 'Prod key' }));

		expect(serialized.description).toBe('Prod key');
	});

	it('emits an empty description as null, so an import can clear it', () => {
		const serialized = serializer.serialize(makeCredential({ description: null }));

		expect(serialized.description).toBeNull();
	});

	it('emits bundled expression data when provided', () => {
		const credential = makeCredential();

		const serialized = serializer.serialize(credential, {
			data: { value: '={{ $secrets.api.key }}' },
		});

		expect(Object.keys(serialized).sort()).toEqual(['data', 'description', 'id', 'name', 'type']);
		expect(serialized.data).toEqual({ value: '={{ $secrets.api.key }}' });
	});

	it('does not leak encrypted data or secret-adjacent flags', () => {
		const credential = makeCredential({
			data: 'sensitive-encrypted-payload',
			isManaged: true,
			isGlobal: true,
		});

		const serialized = serializer.serialize(credential);

		const serializedAsRecord = serialized as unknown as Record<string, unknown>;
		expect(serializedAsRecord.data).toBeUndefined();
		expect(serializedAsRecord.isManaged).toBeUndefined();
		expect(serializedAsRecord.isGlobal).toBeUndefined();
		expect(serializedAsRecord.isResolvable).toBeUndefined();
		expect(serializedAsRecord.resolverId).toBeUndefined();
		expect(serializedAsRecord.shared).toBeUndefined();
		expect(serializedAsRecord.createdAt).toBeUndefined();
		expect(serializedAsRecord.updatedAt).toBeUndefined();
	});
});
