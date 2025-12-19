import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { ICredentialsResponse } from '../credentials.types';
import * as credentialsApi from '../credentials.api';

const mockRootStore = {
	restApiContext: { baseUrl: 'http://localhost:5678', sessionId: 'test-session' },
	baseUrl: 'http://localhost:5678',
};

const { useRootStore } = vi.hoisted(() => ({
	useRootStore: vi.fn(() => mockRootStore),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore,
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType: vi.fn(),
	})),
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({
		isEnterpriseFeatureEnabled: {
			sharing: true,
		},
	})),
}));

vi.mock('../credentials.api');
vi.mock('../credentials.ee.api');

describe('credentials.store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
	});

	describe('fetchAllCredentials', () => {
		it('should pass includeGlobal parameter to API when provided', async () => {
			const { useCredentialsStore } = await import('../credentials.store');
			const store = useCredentialsStore();

			const mockCredentials: ICredentialsResponse[] = [
				mock<ICredentialsResponse>({
					id: 'cred-1',
					name: 'Personal Credential',
					type: 'httpBasicAuth',
					isGlobal: false,
				}),
				mock<ICredentialsResponse>({
					id: 'cred-2',
					name: 'Global Credential',
					type: 'httpBasicAuth',
					isGlobal: true,
				}),
			];

			vi.spyOn(credentialsApi, 'getAllCredentials').mockResolvedValue(mockCredentials);

			await store.fetchAllCredentials(undefined, true, false, true);

			expect(credentialsApi.getAllCredentials).toHaveBeenCalledWith(
				mockRootStore.restApiContext,
				undefined,
				true,
				false,
				true,
			);
		});

		it('should pass includeGlobal as true when not provided', async () => {
			const { useCredentialsStore } = await import('../credentials.store');
			const store = useCredentialsStore();

			const mockCredentials: ICredentialsResponse[] = [
				mock<ICredentialsResponse>({
					id: 'cred-1',
					name: 'Personal Credential',
					type: 'httpBasicAuth',
					isGlobal: false,
				}),
			];

			vi.spyOn(credentialsApi, 'getAllCredentials').mockResolvedValue(mockCredentials);

			await store.fetchAllCredentials();

			expect(credentialsApi.getAllCredentials).toHaveBeenCalledWith(
				mockRootStore.restApiContext,
				undefined,
				true,
				false,
				true,
			);
		});

		it('should set credentials in store including global credentials', async () => {
			const { useCredentialsStore } = await import('../credentials.store');
			const store = useCredentialsStore();

			const mockCredentials: ICredentialsResponse[] = [
				mock<ICredentialsResponse>({
					id: 'cred-1',
					name: 'Personal Credential',
					type: 'httpBasicAuth',
					isGlobal: false,
				}),
				mock<ICredentialsResponse>({
					id: 'cred-2',
					name: 'Global Credential',
					type: 'httpBasicAuth',
					isGlobal: true,
				}),
			];

			vi.spyOn(credentialsApi, 'getAllCredentials').mockResolvedValue(mockCredentials);

			await store.fetchAllCredentials(undefined, true, false, true);

			expect(store.allCredentials).toHaveLength(2);
			expect(store.allCredentials.find((c) => c.id === 'cred-2')?.isGlobal).toBe(true);
		});
	});

	describe('createNewCredential', () => {
		it('should pass isGlobal parameter to API when creating credential', async () => {
			const { useCredentialsStore } = await import('../credentials.store');
			const store = useCredentialsStore();

			const mockCredential = mock<ICredentialsResponse>({
				id: 'new-cred-1',
				name: 'New Global Credential',
				type: 'httpBasicAuth',
				isGlobal: true,
			});

			vi.spyOn(credentialsApi, 'createNewCredential').mockResolvedValue(mockCredential);

			await store.createNewCredential(
				{
					id: 'new-cred-1',
					name: 'New Global Credential',
					type: 'httpBasicAuth',
					data: {},
					isGlobal: true,
				},
				'project-123',
			);

			expect(credentialsApi.createNewCredential).toHaveBeenCalledWith(
				mockRootStore.restApiContext,
				{
					name: 'New Global Credential',
					type: 'httpBasicAuth',
					data: {},
					projectId: 'project-123',
					uiContext: undefined,
					isGlobal: true,
				},
			);
		});

		it('should create non-global credential when isGlobal is false', async () => {
			const { useCredentialsStore } = await import('../credentials.store');
			const store = useCredentialsStore();

			const mockCredential = mock<ICredentialsResponse>({
				id: 'new-cred-2',
				name: 'New Personal Credential',
				type: 'httpBasicAuth',
				isGlobal: false,
			});

			vi.spyOn(credentialsApi, 'createNewCredential').mockResolvedValue(mockCredential);

			await store.createNewCredential(
				{
					id: 'new-cred-2',
					name: 'New Personal Credential',
					type: 'httpBasicAuth',
					data: {},
					isGlobal: false,
				},
				'project-123',
			);

			expect(credentialsApi.createNewCredential).toHaveBeenCalledWith(
				mockRootStore.restApiContext,
				{
					name: 'New Personal Credential',
					type: 'httpBasicAuth',
					data: {},
					projectId: 'project-123',
					uiContext: undefined,
					isGlobal: false,
				},
			);
		});

		it('should create credential without isGlobal when not provided', async () => {
			const { useCredentialsStore } = await import('../credentials.store');
			const store = useCredentialsStore();

			const mockCredential = mock<ICredentialsResponse>({
				id: 'new-cred-3',
				name: 'New Credential',
				type: 'httpBasicAuth',
			});

			vi.spyOn(credentialsApi, 'createNewCredential').mockResolvedValue(mockCredential);

			await store.createNewCredential(
				{
					id: 'new-cred-3',
					name: 'New Credential',
					type: 'httpBasicAuth',
					data: {},
				},
				'project-123',
			);

			expect(credentialsApi.createNewCredential).toHaveBeenCalledWith(
				mockRootStore.restApiContext,
				{
					name: 'New Credential',
					type: 'httpBasicAuth',
					data: {},
					projectId: 'project-123',
					uiContext: undefined,
					isGlobal: undefined,
				},
			);
		});
	});

	describe('setCredentialSharedWith', () => {
		it('should pass isGlobal parameter when setting credential sharing', async () => {
			const { useCredentialsStore } = await import('../credentials.store');
			const credentialsEeApi = await import('../credentials.ee.api');
			const store = useCredentialsStore();

			// Initialize the store with a credential
			store.state.credentials = {
				'cred-1': mock<ICredentialsResponse>({
					id: 'cred-1',
					name: 'Test Credential',
					type: 'httpBasicAuth',
					sharedWithProjects: [],
				}),
			};

			vi.spyOn(credentialsEeApi, 'setCredentialSharedWith').mockResolvedValue(
				mock<ICredentialsResponse>({ id: 'cred-1' }),
			);

			await store.setCredentialSharedWith({
				credentialId: 'cred-1',
				sharedWithProjects: [
					{
						id: 'project-1',
						name: 'Project 1',
						type: 'team',
						icon: null,
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z',
					},
				],
				isGlobal: true,
			});

			expect(credentialsEeApi.setCredentialSharedWith).toHaveBeenCalledWith(
				mockRootStore.restApiContext,
				'cred-1',
				{
					shareWithIds: ['project-1'],
				},
			);
		});

		it('should update credential state with new sharing settings', async () => {
			const { useCredentialsStore } = await import('../credentials.store');
			const credentialsEeApi = await import('../credentials.ee.api');
			const store = useCredentialsStore();

			const initialCredential = mock<ICredentialsResponse>({
				id: 'cred-1',
				name: 'Test Credential',
				type: 'httpBasicAuth',
				sharedWithProjects: [],
			});

			store.state.credentials = {
				'cred-1': initialCredential,
			};

			vi.spyOn(credentialsEeApi, 'setCredentialSharedWith').mockResolvedValue(
				mock<ICredentialsResponse>({ id: 'cred-1' }),
			);

			const newSharing = [
				{
					id: 'project-1',
					name: 'Project 1',
					type: 'team' as const,
					icon: null,
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				},
				{
					id: 'project-2',
					name: 'Project 2',
					type: 'team' as const,
					icon: null,
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				},
			];

			await store.setCredentialSharedWith({
				credentialId: 'cred-1',
				sharedWithProjects: newSharing,
			});

			expect(store.state.credentials['cred-1']?.sharedWithProjects).toEqual(newSharing);
		});
	});
});
