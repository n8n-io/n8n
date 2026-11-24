import { flushPromises } from '@vue/test-utils';
import { effectScope, reactive, type EffectScope } from 'vue';
import { useChatCredentials } from './useChatCredentials';

const { credentialsStore, projectsStore } = vi.hoisted(() => ({
	credentialsStore: {
		allCredentials: [] as Array<{ id: string; type: string; createdAt: string }>,
		allCredentialTypes: [] as Array<{ name: string }>,
		fetchCredentialTypes: vi.fn(),
		fetchUsableCredentials: vi.fn(),
		getCredentialsByType: vi.fn(),
	},
	projectsStore: {
		personalProject: null as { id: string } | null,
	},
}));

const reactiveCredentialsStore = reactive(credentialsStore);
const reactiveProjectsStore = reactive(projectsStore);

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => reactiveCredentialsStore,
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => reactiveProjectsStore,
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({ moduleSettings: {} }),
}));

const openAiCredential = { id: 'openai-1', type: 'openAiApi', createdAt: '2026-01-01' };

describe('useChatCredentials', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		window.localStorage.clear();
		reactiveCredentialsStore.allCredentials = [];
		reactiveCredentialsStore.allCredentialTypes = [];
		reactiveProjectsStore.personalProject = null;
		credentialsStore.fetchCredentialTypes.mockResolvedValue(undefined);
		credentialsStore.fetchUsableCredentials.mockResolvedValue([]);
		// Like the store: credentials by type need the credential types.
		credentialsStore.getCredentialsByType.mockImplementation((type: string) =>
			reactiveCredentialsStore.allCredentialTypes.some((t) => t.name === type)
				? reactiveCredentialsStore.allCredentials.filter((c) => c.type === type)
				: [],
		);
	});

	let scope: EffectScope | undefined;

	afterEach(() => {
		scope?.stop();
		scope = undefined;
	});

	function setup() {
		scope = effectScope();
		const result = scope.run(() => useChatCredentials('user-1'));
		if (!result) throw new Error('useChatCredentials did not return');
		return result;
	}

	it('is not ready while the credentials are loaded but the credential types are not', async () => {
		const { promise, resolve } = Promise.withResolvers<void>();
		credentialsStore.fetchCredentialTypes.mockReturnValueOnce(promise);
		reactiveCredentialsStore.allCredentials = [openAiCredential];

		const { credentialsByProvider } = setup();
		await flushPromises();

		expect(credentialsByProvider.value).toBeNull();

		reactiveCredentialsStore.allCredentialTypes = [{ name: 'openAiApi' }];
		resolve();
		await flushPromises();

		expect(credentialsByProvider.value?.openai).toBe('openai-1');
	});

	it('is ready after its own loads end, also when the usable credentials fail to load', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		credentialsStore.fetchUsableCredentials.mockRejectedValue(new Error('credentials'));
		const { credentialsByProvider } = setup();

		reactiveProjectsStore.personalProject = { id: 'personal' };
		await flushPromises();

		expect(credentialsByProvider.value).not.toBeNull();
	});

	it('is ready after its own loads end, also when the credential types fail to load', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		credentialsStore.fetchCredentialTypes.mockRejectedValue(new Error('credential types'));
		const { credentialsByProvider } = setup();

		reactiveProjectsStore.personalProject = { id: 'personal' };
		await flushPromises();

		expect(credentialsStore.fetchCredentialTypes).toHaveBeenCalledWith(false);
		expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({
			projectId: 'personal',
		});
		expect(credentialsByProvider.value).not.toBeNull();
	});
});
