import type { ProjectSecretsProviderAccess, SecretsProviderConnection } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { SecretsProvidersConnectionsService } from '@/modules/external-secrets.ee/secrets-providers-connections.service.ee';

describe('Secret Providers Connections Service', () => {
	const service = new SecretsProvidersConnectionsService(mock(), mock(), mock());

	const createdAt = new Date('2024-01-15T10:00:00.000Z');
	const updatedAt = new Date('2024-01-15T10:01:00.000Z');

	function createProjectAccess(
		projectId: string,
		projectName: string,
		connectionId: number,
	): ProjectSecretsProviderAccess {
		return {
			projectId,
			secretsProviderConnectionId: connectionId,
			project: { id: projectId, name: projectName },
			secretsProviderConnection: {},
			createdAt,
			updatedAt,
		} as ProjectSecretsProviderAccess;
	}

	function createConnection(
		overrides: Partial<SecretsProviderConnection> = {},
	): SecretsProviderConnection {
		return {
			id: 123,
			type: 'awsSecretsManager',
			isEnabled: true,
			providerKey: 'my-connection',
			encryptedSettings: 'encrypted-data',
			projectAccess: [],
			createdAt,
			updatedAt,
			...overrides,
		} as SecretsProviderConnection;
	}

	describe('toPublicConnection', () => {
		it('should map the entity to a public connection DTO', () => {
			const connection = createConnection({
				projectAccess: [
					createProjectAccess('tp-1', 'Project One', 123),
					createProjectAccess('tp-2', 'Project Two', 123),
				],
			});

			const actual = service.toPublicConnection(connection);

			expect(actual).toEqual({
				id: '123',
				name: 'my-connection',
				type: 'awsSecretsManager',
				isEnabled: true,
				projects: [
					{ id: 'tp-1', name: 'Project One' },
					{ id: 'tp-2', name: 'Project Two' },
				],
				createdAt: createdAt.toISOString(),
				updatedAt: updatedAt.toISOString(),
			});
		});

		it('should handle connection with no project access', () => {
			const connection = createConnection({
				id: 456,
				type: 'vault',
				isEnabled: false,
				providerKey: 'vault-connection',
				encryptedSettings: 'encrypted-vault-data',
			});

			const actual = service.toPublicConnection(connection);

			expect(actual).toEqual({
				id: '456',
				name: 'vault-connection',
				type: 'vault',
				isEnabled: false,
				projects: [],
				createdAt: createdAt.toISOString(),
				updatedAt: updatedAt.toISOString(),
			});
		});
	});
});
