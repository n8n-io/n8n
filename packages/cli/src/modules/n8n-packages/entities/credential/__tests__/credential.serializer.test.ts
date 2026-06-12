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

	it('returns exactly id, name, type', () => {
		const credential = makeCredential();

		const serialized = serializer.serialize(credential);

		expect(Object.keys(serialized).sort()).toEqual(['id', 'name', 'type']);
		expect(serialized).toEqual({
			id: 'cred-1',
			name: 'My Credential',
			type: 'httpHeaderAuth',
		});
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
