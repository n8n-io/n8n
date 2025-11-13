import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';

import * as vcApi from './sourceControl.api';
import { useSourceControlStore } from './sourceControl.store';
import type { SourceControlPreferences } from './sourceControl.types';
import type { SourceControlledFile } from '@n8n/api-types';

vi.mock('./sourceControl.api');

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: {},
	})),
}));

describe('useSourceControlStore', () => {
	let pinia: ReturnType<typeof createPinia>;
	let sourceControlStore: ReturnType<typeof useSourceControlStore>;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		sourceControlStore = useSourceControlStore();

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('initial state', () => {
		it('should initialize with default preferences', () => {
			expect(sourceControlStore.preferences.connectionType).toBe('ssh');
			expect(sourceControlStore.preferences.branchName).toBe('');
			expect(sourceControlStore.preferences.repositoryUrl).toBe('');
			expect(sourceControlStore.preferences.connected).toBe(false);
			expect(sourceControlStore.preferences.keyGeneratorType).toBe('ed25519');
		});

		it('should have ssh key types with labels available', () => {
			expect(sourceControlStore.sshKeyTypesWithLabel).toEqual([
				{ value: 'ed25519', label: 'ED25519' },
				{ value: 'rsa', label: 'RSA' },
			]);
		});
	});

	describe('savePreferences', () => {
		it('should call API with HTTPS credentials', async () => {
			const preferences = {
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				connectionType: 'https' as const,
				httpsUsername: 'testuser',
				httpsPassword: 'testtoken',
			};

			const mockSavePreferences = vi.mocked(vcApi.savePreferences);
			mockSavePreferences.mockResolvedValue({} as SourceControlPreferences);

			await sourceControlStore.savePreferences(preferences);

			expect(mockSavePreferences).toHaveBeenCalledWith(
				{}, // restApiContext
				preferences,
			);
		});

		it('should call API with SSH preferences', async () => {
			const preferences = {
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
				connectionType: 'ssh' as const,
				keyGeneratorType: 'ed25519' as const,
			};

			const mockSavePreferences = vi.mocked(vcApi.savePreferences);
			mockSavePreferences.mockResolvedValue({} as SourceControlPreferences);

			await sourceControlStore.savePreferences(preferences);

			expect(mockSavePreferences).toHaveBeenCalledWith(
				{}, // restApiContext
				preferences,
			);
		});

		it('should update local preferences after successful API call', async () => {
			const preferences: SourceControlPreferences = {
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				connectionType: 'https' as const,
				connected: true,
				branchColor: '#4f46e5',
				branchReadOnly: false,
				branches: ['main', 'develop'],
			};

			const mockSavePreferences = vi.mocked(vcApi.savePreferences);
			mockSavePreferences.mockResolvedValue(preferences);

			await sourceControlStore.savePreferences(preferences);

			expect(sourceControlStore.preferences.repositoryUrl).toBe(preferences.repositoryUrl);
			expect(sourceControlStore.preferences.branchName).toBe(preferences.branchName);
			expect(sourceControlStore.preferences.connectionType).toBe(preferences.connectionType);
			expect(sourceControlStore.preferences.connected).toBe(preferences.connected);
		});
	});

	describe('generateKeyPair', () => {
		it('should call API and update public key', async () => {
			const keyType = 'ed25519';
			const mockPublicKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest';

			const mockGenerateKeyPair = vi.mocked(vcApi.generateKeyPair);
			mockGenerateKeyPair.mockResolvedValue('ssh-ed25519 AAAAC3NzaC1lZDI...');

			const mockGetPreferences = vi.mocked(vcApi.getPreferences);
			mockGetPreferences.mockImplementation(async () => {
				return {
					connected: false,
					repositoryUrl: '',
					branchReadOnly: false,
					branchColor: '#000000',
					branches: [],
					branchName: '',
					publicKey: mockPublicKey,
				} satisfies SourceControlPreferences;
			});

			await sourceControlStore.generateKeyPair(keyType);

			expect(mockGenerateKeyPair).toHaveBeenCalledWith({}, keyType);
			expect(sourceControlStore.preferences.publicKey).toBe(mockPublicKey);
			expect(sourceControlStore.preferences.keyGeneratorType).toBe(keyType);
		});

		it('should handle API errors', async () => {
			const mockGenerateKeyPair = vi.mocked(vcApi.generateKeyPair);
			mockGenerateKeyPair.mockRejectedValue(new Error('API Error'));

			await expect(sourceControlStore.generateKeyPair('rsa')).rejects.toThrow('API Error');
		});
	});

	describe('getBranches', () => {
		it('should call API and update branches list', async () => {
			const mockBranches = {
				branches: ['main', 'develop', 'feature/test'],
				currentBranch: 'main',
			};

			const mockGetBranches = vi.mocked(vcApi.getBranches);
			mockGetBranches.mockResolvedValue(mockBranches);

			await sourceControlStore.getBranches();

			expect(mockGetBranches).toHaveBeenCalledWith({});
			expect(sourceControlStore.preferences.branches).toEqual(mockBranches.branches);
		});
	});

	describe('disconnect', () => {
		it('should call API and reset preferences', async () => {
			sourceControlStore.preferences.connected = true;
			sourceControlStore.preferences.repositoryUrl = 'https://github.com/user/repo.git';
			sourceControlStore.preferences.branchName = 'main';

			const mockDisconnect = vi.mocked(vcApi.disconnect);
			mockDisconnect.mockResolvedValue('Disconnected successfully');

			await sourceControlStore.disconnect(false);

			expect(mockDisconnect).toHaveBeenCalledWith({}, false);
			expect(sourceControlStore.preferences.connected).toBe(false);
			expect(sourceControlStore.preferences.branches).toEqual([]);
		});
	});

	describe('pushWorkfolder', () => {
		it('should call API with correct parameters', async () => {
			const data = {
				commitMessage: 'Test commit',
				fileNames: [
					{
						id: 'workflow1',
						name: 'Test Workflow',
						type: 'workflow' as const,
						status: 'modified' as const,
						location: 'local' as const,
						conflict: false,
						file: '/path/to/workflow.json',
						updatedAt: '2024-01-01T00:00:00.000Z',
						pushed: false,
					},
				],
				force: false,
			};

			const mockPushWorkfolder = vi.mocked(vcApi.pushWorkfolder);
			mockPushWorkfolder.mockResolvedValue(undefined);

			await sourceControlStore.pushWorkfolder(data);

			expect(mockPushWorkfolder).toHaveBeenCalledWith(
				{}, // restApiContext
				{
					force: data.force,
					commitMessage: data.commitMessage,
					fileNames: data.fileNames,
				},
			);
			expect(sourceControlStore.state.commitMessage).toBe(data.commitMessage);
		});
	});

	describe('pullWorkfolder', () => {
		it('should call API with correct parameters', async () => {
			const force = true;

			const mockResult: SourceControlledFile[] = [
				{
					file: 'test.json',
					id: 'test-id',
					name: 'test-workflow',
					type: 'workflow',
					status: 'new',
					location: 'local',
					conflict: false,
					updatedAt: '2023-01-01T00:00:00.000Z',
				},
			];

			const mockPullWorkfolder = vi.mocked(vcApi.pullWorkfolder);
			mockPullWorkfolder.mockResolvedValue(mockResult);

			const result = await sourceControlStore.pullWorkfolder(force);

			expect(mockPullWorkfolder).toHaveBeenCalledWith({}, { force });
			expect(result).toEqual(mockResult);
		});
	});

	describe('getAggregatedStatus', () => {
		it('should call API and return status', async () => {
			const mockStatus: SourceControlledFile[] = [
				{
					id: 'workflow1',
					name: 'Test Workflow',
					type: 'workflow' as const,
					status: 'modified' as const,
					location: 'local' as const,
					conflict: false,
					file: '/path/to/workflow.json',
					updatedAt: '2024-01-01T00:00:00.000Z',
					pushed: false,
				},
			];

			const mockGetAggregatedStatus = vi.mocked(vcApi.getAggregatedStatus);
			mockGetAggregatedStatus.mockResolvedValue(mockStatus);

			const result = await sourceControlStore.getAggregatedStatus();

			expect(mockGetAggregatedStatus).toHaveBeenCalledWith({});
			expect(result).toEqual(mockStatus);
		});
	});
});
