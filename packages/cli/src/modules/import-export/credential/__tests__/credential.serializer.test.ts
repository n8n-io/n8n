import type { CredentialsEntity } from '@n8n/db';

import { CredentialSerializer } from '../credential.serializer';

describe('CredentialSerializer', () => {
	const serializer = new CredentialSerializer();

	const baseCredential = {
		id: 'cred1100-0000-0000-0000-000000000000',
		name: 'My Slack Token',
		type: 'slackApi',
		data: 'encrypted-data-string',
		isManaged: false,
		isGlobal: false,
		isResolvable: false,
		resolvableAllowFallback: false,
		resolverId: null,
		shared: [],
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-02'),
	} as unknown as CredentialsEntity;

	it('should serialize id, name, and type', () => {
		const result = serializer.serialize(baseCredential);

		expect(result).toEqual({
			id: 'cred1100-0000-0000-0000-000000000000',
			name: 'My Slack Token',
			type: 'slackApi',
		});
	});

	it('should omit sensitive data and internal fields', () => {
		const result = serializer.serialize(baseCredential);

		expect(result).not.toHaveProperty('data');
		expect(result).not.toHaveProperty('isManaged');
		expect(result).not.toHaveProperty('isGlobal');
		expect(result).not.toHaveProperty('isResolvable');
		expect(result).not.toHaveProperty('resolvableAllowFallback');
		expect(result).not.toHaveProperty('resolverId');
		expect(result).not.toHaveProperty('shared');
		expect(result).not.toHaveProperty('createdAt');
		expect(result).not.toHaveProperty('updatedAt');
	});
});
