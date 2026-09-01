import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { ICredentialsResponse } from '../credentials.types';
import * as credentialsApi from '../credentials.api';
import { useCredentialsStore } from '../credentials.store';

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

const { mockNodeTypesStore } = vi.hoisted(() => ({
	mockNodeTypesStore: {
		getNodeType: vi.fn(),
		getNodeVersions: vi.fn(() => [] as number[]),
	},
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => mockNodeTypesStore),
}));

vi.mock('@n8n/stores/settings.store', () => ({
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

	describe('isCredentialTypeTestable', () => {
		/**
		 * Registers one credential type backed by a versioned node, with `testedBy` on
		 * whichever versions `testedByOn` names.
		 */
		// Plain literals rather than `mock<T>` on purpose: an auto-mocked `test` property
		// is a truthy proxy, which would short-circuit the getter in every case.
		const credentialType = (overrides: Partial<ICredentialType>): ICredentialType => ({
			name: 'kafka',
			displayName: 'Kafka',
			properties: [],
			...overrides,
		});

		const setupVersionedNode = (versions: number[], testedByOn: number[]) => {
			const store = useCredentialsStore();
			store.setCredentialTypes([credentialType({ supportedNodes: ['kafka'] })]);

			mockNodeTypesStore.getNodeVersions.mockReturnValue(versions);
			mockNodeTypesStore.getNodeType.mockImplementation(
				(_name: string, version?: number) =>
					({
						credentials: [
							{
								name: 'kafka',
								...(version !== undefined && testedByOn.includes(version)
									? { testedBy: 'kafkaConnectionTest' }
									: {}),
							},
						],
					}) as INodeTypeDescription,
			);

			return store;
		};

		it('finds a test declared only on an older version, not just the newest', () => {
			// Regression guard: reading a single version hid Kafka's v1 test once v2 registered
			// without `testedBy`, silently disabling the on-save connection test.
			const store = setupVersionedNode([1, 2], [1]);

			expect(store.isCredentialTypeTestable('kafka')).toBe(true);
		});

		it('is false when no registered version declares a test', () => {
			const store = setupVersionedNode([1, 2], []);

			expect(store.isCredentialTypeTestable('kafka')).toBe(false);
		});

		it('is true when the credential type defines its own test, without consulting nodes', () => {
			const store = useCredentialsStore();
			store.setCredentialTypes([
				credentialType({ name: 'slackApi', test: { request: { url: '/test' } } }),
			]);

			expect(store.isCredentialTypeTestable('slackApi')).toBe(true);
			expect(mockNodeTypesStore.getNodeVersions).not.toHaveBeenCalled();
		});

		it('is false for an unknown credential type', () => {
			const store = useCredentialsStore();

			expect(store.isCredentialTypeTestable('nopeApi')).toBe(false);
		});
	});

	describe('testCredential', () => {
		it('marks the credential test as failed when the test request rejects', async () => {
			const store = useCredentialsStore();
			vi.mocked(credentialsApi.testCredential).mockRejectedValue(new Error('network error'));

			await expect(
				store.testCredential({ id: 'cred-1', name: 'My credential', type: 'slackApi' }),
			).rejects.toThrow('network error');

			expect(store.credentialTestResults.get('cred-1')).toBe('error');
		});
	});

	describe('fetchAllCredentials', () => {
		it('should pass includeGlobal parameter to API when provided', async () => {
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

			await store.fetchAllCredentials({
				projectId: undefined,
				includeScopes: true,
				onlySharedWithMe: false,
				includeGlobal: true,
			});

			expect(credentialsApi.getAllCredentials).toHaveBeenCalledWith(mockRootStore.restApiContext, {
				filter: undefined,
				includeScopes: true,
				onlySharedWithMe: false,
				includeGlobal: true,
				externalSecretsStore: undefined,
			});
		});

		it('should pass includeGlobal as true when not provided', async () => {
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

			expect(credentialsApi.getAllCredentials).toHaveBeenCalledWith(mockRootStore.restApiContext, {
				filter: undefined,
				includeScopes: true,
				onlySharedWithMe: false,
				includeGlobal: true,
				externalSecretsStore: undefined,
			});
		});

		it('should set credentials in store including global credentials', async () => {
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

			await store.fetchAllCredentials({
				projectId: undefined,
				includeScopes: true,
				onlySharedWithMe: false,
				includeGlobal: true,
			});

			expect(store.allCredentials).toHaveLength(2);
			expect(store.allCredentials.find((c) => c.id === 'cred-2')?.isGlobal).toBe(true);
		});
	});

	describe('fetchUsableCredentials', () => {
		const credential = (
			overrides: Partial<ICredentialsResponse> & Pick<ICredentialsResponse, 'id'>,
		): ICredentialsResponse =>
			mock<ICredentialsResponse>({
				name: `Credential ${overrides.id}`,
				type: 'httpBasicAuth',
				updatedAt: '2026-01-01T00:00:00.000Z',
				...overrides,
			});

		const inScope = credential({ id: 'in-scope', name: 'Project credential' });
		const outOfScope = credential({ id: 'out-of-scope', name: 'Personal credential' });

		it('populates the usable slice and flips the fetched flag', async () => {
			const store = useCredentialsStore();
			expect(store.hasFetchedUsableCredentials).toBe(false);

			vi.spyOn(credentialsApi, 'getUsableCredentials').mockResolvedValue([inScope]);

			await store.fetchUsableCredentials({ workflowId: 'wf-1' });

			expect(credentialsApi.getUsableCredentials).toHaveBeenCalledWith(
				mockRootStore.restApiContext,
				{ workflowId: 'wf-1' },
			);
			expect(store.hasFetchedUsableCredentials).toBe(true);
			expect(store.getUsableCredentialByType('httpBasicAuth')).toEqual([inScope]);
			// The flat map keeps its existing replace semantics.
			expect(store.allCredentials).toEqual([inScope]);
		});

		it('reads an unfetched slice as empty rather than falling back to the flat map', async () => {
			const store = useCredentialsStore();

			vi.spyOn(credentialsApi, 'getAllCredentials').mockResolvedValue([outOfScope]);
			await store.fetchAllCredentials();

			expect(store.allCredentials).toEqual([outOfScope]);
			expect(store.hasFetchedUsableCredentials).toBe(false);
			expect(store.getUsableCredentialByType('httpBasicAuth')).toEqual([]);
		});

		it('keeps the usable slice when a later unscoped fetch widens the flat map', async () => {
			const store = useCredentialsStore();

			vi.spyOn(credentialsApi, 'getUsableCredentials').mockResolvedValue([inScope]);
			vi.spyOn(credentialsApi, 'getAllCredentials').mockResolvedValue([inScope, outOfScope]);

			await store.fetchUsableCredentials({ projectId: 'project-1' });
			await store.fetchAllCredentials();

			expect(store.allCredentials).toHaveLength(2);
			expect(store.getUsableCredentialByType('httpBasicAuth')).toEqual([inScope]);
		});

		it('keeps the usable slice when the unscoped fetch resolved first', async () => {
			const store = useCredentialsStore();

			vi.spyOn(credentialsApi, 'getAllCredentials').mockResolvedValue([inScope, outOfScope]);
			vi.spyOn(credentialsApi, 'getUsableCredentials').mockResolvedValue([inScope]);

			await store.fetchAllCredentials();
			await store.fetchUsableCredentials({ projectId: 'project-1' });

			expect(store.getUsableCredentialByType('httpBasicAuth')).toEqual([inScope]);
		});

		it('returns an empty list for a type with no usable credentials', async () => {
			const store = useCredentialsStore();

			vi.spyOn(credentialsApi, 'getUsableCredentials').mockResolvedValue([inScope]);
			await store.fetchUsableCredentials({ workflowId: 'wf-1' });

			expect(store.getUsableCredentialByType('unknownType')).toEqual([]);
		});

		it('never yields undefined entries for a node whose types are only partly usable', async () => {
			const store = useCredentialsStore();

			mockNodeTypesStore.getNodeType.mockReturnValue(
				mock<INodeTypeDescription>({
					credentials: [{ name: 'httpBasicAuth' }, { name: 'oAuth2Api' }],
				}),
			);
			vi.spyOn(credentialsApi, 'getUsableCredentials').mockResolvedValue([inScope]);
			await store.fetchUsableCredentials({ workflowId: 'wf-1' });

			const credentials = store.allUsableCredentialsForNode(
				mock<INodeUi>({ type: 'n8n-nodes-base.httpRequest', typeVersion: 1 }),
			);

			expect(credentials).toEqual([inScope]);
		});

		it('drops the slice while a different scope is in flight', async () => {
			const store = useCredentialsStore();

			vi.spyOn(credentialsApi, 'getUsableCredentials').mockResolvedValue([inScope]);
			await store.fetchUsableCredentials({ workflowId: 'wf-1' });

			let resolveSecond: (credentials: ICredentialsResponse[]) => void = () => {};
			vi.spyOn(credentialsApi, 'getUsableCredentials').mockReturnValue(
				new Promise((resolve) => {
					resolveSecond = resolve;
				}),
			);
			const pending = store.fetchUsableCredentials({ workflowId: 'wf-2' });

			// The previous workflow's credentials must not stand in for the new scope.
			expect(store.hasFetchedUsableCredentials).toBe(false);
			expect(store.getUsableCredentialByType('httpBasicAuth')).toEqual([]);

			resolveSecond([outOfScope]);
			await pending;

			expect(store.hasFetchedUsableCredentials).toBe(true);
			expect(store.getUsableCredentialByType('httpBasicAuth')).toEqual([outOfScope]);
		});

		it('ignores a response for a scope that is no longer active', async () => {
			const store = useCredentialsStore();

			let resolveFirst: (credentials: ICredentialsResponse[]) => void = () => {};
			vi.spyOn(credentialsApi, 'getUsableCredentials').mockReturnValueOnce(
				new Promise((resolve) => {
					resolveFirst = resolve;
				}),
			);
			const stale = store.fetchUsableCredentials({ workflowId: 'wf-1' });

			vi.spyOn(credentialsApi, 'getUsableCredentials').mockResolvedValue([inScope]);
			await store.fetchUsableCredentials({ workflowId: 'wf-2' });

			resolveFirst([outOfScope]);
			await stale;

			expect(store.getUsableCredentialByType('httpBasicAuth')).toEqual([inScope]);
		});

		it('ignores an older response for the scope already loaded', async () => {
			const store = useCredentialsStore();

			// A refresh — the one a quick connect triggers, say — can overtake a fetch the
			// same scope started earlier; the newest answer has to win.
			let resolveFirst: (credentials: ICredentialsResponse[]) => void = () => {};
			vi.spyOn(credentialsApi, 'getUsableCredentials').mockReturnValueOnce(
				new Promise((resolve) => {
					resolveFirst = resolve;
				}),
			);
			const stale = store.fetchUsableCredentials({ workflowId: 'wf-1' });

			vi.spyOn(credentialsApi, 'getUsableCredentials').mockResolvedValue([inScope, outOfScope]);
			await store.fetchUsableCredentials({ workflowId: 'wf-1' });

			resolveFirst([inScope]);
			await stale;

			expect(store.getUsableCredentialByType('httpBasicAuth')).toEqual([outOfScope, inScope]);
		});

		it('keeps the slice when the same scope is fetched again', async () => {
			const store = useCredentialsStore();

			vi.spyOn(credentialsApi, 'getUsableCredentials').mockResolvedValue([inScope]);
			await store.fetchUsableCredentials({ workflowId: 'wf-1' });

			const pending = store.fetchUsableCredentials({ workflowId: 'wf-1' });

			expect(store.hasFetchedUsableCredentials).toBe(true);
			expect(store.getUsableCredentialByType('httpBasicAuth')).toEqual([inScope]);
			await pending;
		});
	});

	describe('refreshUsableCredentials', () => {
		const inScope = mock<ICredentialsResponse>({
			id: 'in-scope',
			name: 'A project credential',
			type: 'httpBasicAuth',
		});
		const connected = mock<ICredentialsResponse>({
			id: 'connected',
			name: 'B just connected',
			type: 'httpBasicAuth',
		});

		it('re-reads the scope the slice was last fetched for', async () => {
			const store = useCredentialsStore();

			const fetchSpy = vi
				.spyOn(credentialsApi, 'getUsableCredentials')
				.mockResolvedValue([inScope]);
			await store.fetchUsableCredentials({ projectId: 'project-1' });

			fetchSpy.mockResolvedValue([inScope, connected]);
			await store.refreshUsableCredentials();

			expect(fetchSpy).toHaveBeenLastCalledWith(mockRootStore.restApiContext, {
				projectId: 'project-1',
			});
			expect(store.getUsableCredentialByType('httpBasicAuth')).toEqual([inScope, connected]);
		});

		it('does nothing when no scoped fetch has happened', async () => {
			const store = useCredentialsStore();

			const fetchSpy = vi.spyOn(credentialsApi, 'getUsableCredentials');
			await store.refreshUsableCredentials();

			expect(fetchSpy).not.toHaveBeenCalled();
			expect(store.hasFetchedUsableCredentials).toBe(false);
		});
	});

	describe('createNewCredential', () => {
		it('should pass isGlobal parameter to API when creating credential', async () => {
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
			const store = useCredentialsStore();
			const credentialsEeApi = await import('../credentials.ee.api');

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
			const store = useCredentialsStore();
			const credentialsEeApi = await import('../credentials.ee.api');

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

	describe('disconnectMyConnection', () => {
		it('calls the API and flips connectedByMe to false locally', async () => {
			const store = useCredentialsStore();
			store.state.credentials = {
				'cred-1': mock<ICredentialsResponse>({
					id: 'cred-1',
					name: 'My OAuth',
					type: 'oAuth2Api',
					isResolvable: true,
					connectedByMe: true,
				}),
			};
			vi.spyOn(credentialsApi, 'disconnectMyConnection').mockResolvedValue(undefined);

			await store.disconnectMyConnection({ id: 'cred-1' });

			expect(credentialsApi.disconnectMyConnection).toHaveBeenCalledWith(
				mockRootStore.restApiContext,
				'cred-1',
			);
			expect(store.state.credentials['cred-1']?.connectedByMe).toBe(false);
		});

		it('leaves state untouched when the credential is not in the store', async () => {
			const store = useCredentialsStore();
			store.state.credentials = {};
			vi.spyOn(credentialsApi, 'disconnectMyConnection').mockResolvedValue(undefined);

			await store.disconnectMyConnection({ id: 'missing' });

			expect(store.state.credentials).toEqual({});
		});
	});
});
