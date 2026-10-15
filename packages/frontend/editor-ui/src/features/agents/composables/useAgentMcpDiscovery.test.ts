import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import type { McpRegistryServerResponse } from '@n8n/api-types';

import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { McpServerConnectionItem } from '@/features/shared/toolsConnection/types';
import {
	discoverMcpConnection,
	fetchMcpRegistryCatalog,
} from '@/features/shared/toolsConnection/mcpRegistry.api';

import { useAgentMcpDiscovery } from './useAgentMcpDiscovery';

const { canOAuthCredentialQuickConnect, createAndAuthorize } = vi.hoisted(() => ({
	canOAuthCredentialQuickConnect: vi.fn(),
	createAndAuthorize: vi.fn(),
}));
const credentialModalListeners = vi.hoisted(() => ({
	onCredentialCreated: undefined as ((credential: ICredentialsResponse) => void) | undefined,
	onModalClosed: undefined as ((modalName: string) => void) | undefined,
}));

vi.mock('@/features/credentials/credentials.store', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/credentials/credentials.store')>()),
	listenForCredentialChanges: ({
		onCredentialCreated,
	}: {
		onCredentialCreated?: (credential: ICredentialsResponse) => void;
	}) => {
		credentialModalListeners.onCredentialCreated = onCredentialCreated;
	},
}));

vi.mock('@/app/stores/ui.store', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/app/stores/ui.store')>()),
	listenForModalChanges: ({
		onModalClosed,
	}: {
		onModalClosed?: (modalName: string) => void;
	}) => {
		credentialModalListeners.onModalClosed = onModalClosed;
	},
}));

vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({ canOAuthCredentialQuickConnect, createAndAuthorize }),
}));

vi.mock('@/features/shared/toolsConnection/mcpRegistry.api', () => ({
	discoverMcpConnection: vi.fn(),
	fetchMcpRegistryCatalog: vi.fn(),
}));

const server: McpRegistryServerResponse = {
	slug: 'github',
	nodeTypeName: '@n8n/mcp-registry.github',
	name: 'io.github',
	title: 'GitHub',
	description: 'Manage GitHub repositories',
	tagline: 'GitHub tools',
	version: '1.0.0',
	updatedAt: '2026-09-25T00:00:00.000Z',
	icons: [],
	credentials: [{ credentialType: 'githubMcpOAuth2Api', name: 'GitHub OAuth2', value: 'oAuth2' }],
	tools: [],
	isTemplated: false,
	isOfficial: true,
	status: 'active',
};

const item = {
	id: 'registry:github',
	kind: 'mcp-server',
	title: 'GitHub',
	status: 'disconnected',
	availableTools: [],
	settings: { categories: { read: 'always_allow', write: 'require_approval' } },
} satisfies McpServerConnectionItem;

describe('useAgentMcpDiscovery', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		canOAuthCredentialQuickConnect.mockReturnValue(false);
		credentialModalListeners.onCredentialCreated = undefined;
		credentialModalListeners.onModalClosed = undefined;
	});

	it('loads the catalog, discovers a credential, and preloads the project credential scope', async () => {
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.fetchCredentialTypes.mockResolvedValue(undefined);
		credentialsStore.fetchUsableCredentials.mockResolvedValue([]);
		vi.mocked(fetchMcpRegistryCatalog).mockResolvedValue([server]);
		vi.mocked(discoverMcpConnection).mockResolvedValue({
			status: 'disconnected',
			failureReason: 'authentication',
			tools: [],
		});
		const discovery = useAgentMcpDiscovery('project-1');

		await expect(discovery.fetchCatalog()).resolves.toEqual([server]);
		await discovery.preloadCredentials();
		await discovery.discoverRegistry('github', 'credential-1');

		expect(credentialsStore.fetchCredentialTypes).toHaveBeenCalledWith(false);
		expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({
			projectId: 'project-1',
		});
		expect(discoverMcpConnection).toHaveBeenCalledWith(expect.anything(), {
			slug: 'github',
			credentialId: 'credential-1',
		});
	});

	it('returns only usable credentials from the current project scope', () => {
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.hasUsableCredentialsForScope = vi.fn().mockReturnValue(true);
		credentialsStore.getUsableCredentialByType = vi
			.fn()
			.mockReturnValue([
				{ id: 'credential-1', name: 'GitHub account', type: 'githubMcpOAuth2Api' },
			]);
		const adapter = useAgentMcpDiscovery('project-1').createCredentialAdapter(
			() => server,
			vi.fn(),
		);

		expect(adapter.getCredentialsByType('githubMcpOAuth2Api')).toEqual([
			{ id: 'credential-1', name: 'GitHub account', type: 'githubMcpOAuth2Api' },
		]);
		expect(credentialsStore.hasUsableCredentialsForScope).toHaveBeenCalledWith({
			projectId: 'project-1',
		});
	});

	it('does not expose credentials when the project scope has no usable credentials', () => {
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.hasUsableCredentialsForScope = vi.fn().mockReturnValue(false);
		credentialsStore.getUsableCredentialByType = vi
			.fn()
			.mockReturnValue([
				{ id: 'credential-1', name: 'GitHub account', type: 'githubMcpOAuth2Api' },
			]);
		const adapter = useAgentMcpDiscovery('project-1').createCredentialAdapter(
			() => server,
			vi.fn(),
		);

		expect(adapter.getCredentialsByType('githubMcpOAuth2Api')).toEqual([]);
		expect(credentialsStore.hasUsableCredentialsForScope).toHaveBeenCalledWith({
			projectId: 'project-1',
		});
		expect(credentialsStore.getUsableCredentialByType).not.toHaveBeenCalled();
	});

	it('quick-connects one OAuth type and reports the new credential', async () => {
		canOAuthCredentialQuickConnect.mockReturnValue(true);
		createAndAuthorize.mockResolvedValue({
			id: 'credential-new',
			type: 'githubMcpOAuth2Api',
		});
		const onCredentialCreated = vi.fn();
		const adapter = useAgentMcpDiscovery('project-1').createCredentialAdapter(
			() => server,
			onCredentialCreated,
		);

		adapter.openNewCredential('githubMcpOAuth2Api', item, ['githubMcpOAuth2Api']);
		await flushPromises();

		expect(createAndAuthorize).toHaveBeenCalledWith('githubMcpOAuth2Api', undefined, {
			projectId: 'project-1',
		});
		expect(onCredentialCreated).toHaveBeenCalledWith({
			authType: 'githubMcpOAuth2Api',
			credentialId: 'credential-new',
			item,
		});
	});

	it('does not report a credential when quick connect is cancelled', async () => {
		canOAuthCredentialQuickConnect.mockReturnValue(true);
		createAndAuthorize.mockResolvedValue(undefined);
		const onCredentialCreated = vi.fn();
		const adapter = useAgentMcpDiscovery('project-1').createCredentialAdapter(
			() => server,
			onCredentialCreated,
		);

		adapter.openNewCredential('githubMcpOAuth2Api', item, ['githubMcpOAuth2Api']);
		await flushPromises();

		expect(onCredentialCreated).not.toHaveBeenCalled();
	});

	it('opens the registry credential selector when the server accepts multiple types', () => {
		const uiStore = useUIStore();
		const openNewCredential = vi.spyOn(uiStore, 'openNewCredential');
		const adapter = useAgentMcpDiscovery('project-1').createCredentialAdapter(
			() => server,
			vi.fn(),
		);

		adapter.openNewCredential('githubMcpOAuth2Api', item, [
			'githubMcpOAuth2Api',
			'githubEnterpriseOAuth2Api',
		]);

		expect(openNewCredential).toHaveBeenCalledWith(
			'githubMcpOAuth2Api',
			true,
			false,
			'project-1',
			undefined,
			'github',
			expect.objectContaining({
				id: 'github',
				name: 'github',
				type: '@n8n/mcp-registry.github',
			}),
		);
	});

	it('reports only an accepted credential after the credential modal closes', () => {
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.getCredentialById = vi.fn().mockReturnValue({
			id: 'credential-new',
			name: 'GitHub account',
			type: 'githubEnterpriseOAuth2Api',
		});
		const onCredentialCreated = vi.fn();
		const adapter = useAgentMcpDiscovery('project-1').createCredentialAdapter(
			() => server,
			onCredentialCreated,
		);
		const acceptedTypes = ['githubMcpOAuth2Api', 'githubEnterpriseOAuth2Api'];

		adapter.openNewCredential('githubMcpOAuth2Api', item, acceptedTypes);
		credentialModalListeners.onCredentialCreated?.({
			id: 'credential-unrelated',
			type: 'slackApi',
		} as ICredentialsResponse);
		credentialModalListeners.onModalClosed?.(CREDENTIAL_EDIT_MODAL_KEY);
		expect(onCredentialCreated).not.toHaveBeenCalled();

		adapter.openNewCredential('githubMcpOAuth2Api', item, acceptedTypes);
		credentialModalListeners.onCredentialCreated?.({
			id: 'credential-new',
			type: 'githubEnterpriseOAuth2Api',
		} as ICredentialsResponse);
		credentialModalListeners.onModalClosed?.(CREDENTIAL_EDIT_MODAL_KEY);

		expect(onCredentialCreated).toHaveBeenCalledWith({
			authType: 'githubEnterpriseOAuth2Api',
			credentialId: 'credential-new',
			item,
		});
	});
});
