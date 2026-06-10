import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { N8nPackagesRegistryConnectionsService } from '../n8n-packages-registry-connections.service';
import { N8nPackagesRegistryService } from '../n8n-packages-registry.service';
import { SOURCE_CONTROL_REGISTRY_ID } from '../n8n-packages-registry.types';
import type {
	InitializedN8nPackagesRegistry,
	N8nPackagesRegistryConnection,
	N8nPackagesRegistryProvider,
} from '../n8n-packages-registry.types';
import { N8nPackagesRegistryProviders } from '../providers/n8n-packages-registry-providers.service';

describe('N8nPackagesRegistryService', () => {
	const logger = mock<Logger>();
	const connections = mock<N8nPackagesRegistryConnectionsService>();
	const providers = mock<N8nPackagesRegistryProviders>();
	const provider = mock<N8nPackagesRegistryProvider>();
	const user = mock<User>();

	const connection: N8nPackagesRegistryConnection = {
		id: 'registry-1',
		type: 'git',
		name: 'Registry 1',
		enabled: true,
		readonly: false,
		config: { repositoryUrl: 'git@example.com:n8n/templates.git' },
		credentialId: null,
	};

	let initialized: jest.Mocked<InitializedN8nPackagesRegistry>;
	let service: N8nPackagesRegistryService;

	beforeEach(() => {
		jest.clearAllMocks();

		initialized = mock<InitializedN8nPackagesRegistry>({
			connection,
			listProjects: jest.fn().mockResolvedValue([{ id: 'project-1' }]),
			getImportableChangesGroupedByProject: jest.fn().mockResolvedValue([]),
			importProjectChanges: jest.fn().mockResolvedValue([]),
		});

		connections.findById.mockResolvedValue(connection);
		providers.getProvider.mockReturnValue(provider);
		provider.init.mockResolvedValue(initialized);
		service = new N8nPackagesRegistryService(logger, connections, providers);
	});

	it('lists configured registries from the connection service', async () => {
		connections.findAllAvailable.mockResolvedValue([connection]);

		await expect(service.listRegistries()).resolves.toEqual([connection]);
	});

	it('routes project changes through the initialized provider instance', async () => {
		await service.findImportableChangesGroupedByProject(user, connection.id);

		expect(connections.findById).toHaveBeenCalledWith(connection.id);
		expect(providers.getProvider).toHaveBeenCalledWith(connection.type);
		expect(provider.init).toHaveBeenCalledWith(connection);
		expect(initialized.getImportableChangesGroupedByProject).toHaveBeenCalledWith(user);
	});

	it('uses the built-in source-control registry by default for imports', async () => {
		await service.importProjectChanges(user, 'project-1');

		expect(connections.findById).toHaveBeenCalledWith(SOURCE_CONTROL_REGISTRY_ID);
		expect(initialized.importProjectChanges).toHaveBeenCalledWith(user, 'project-1');
	});

	it('throws when the registry connection does not exist', async () => {
		connections.findById.mockResolvedValue(null);

		await expect(service.findAllProjects(user, 'missing')).rejects.toBeInstanceOf(NotFoundError);
	});
});
