import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';

import * as vcApi from '@/api/sourceControl';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useRootStore } from '@n8n/stores/useRootStore';

// Mock the API module
vi.mock('@/api/sourceControl');

// Mock the root store properly
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
			// Arrange
			const preferences = {
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				connectionType: 'https' as const,
				httpsUsername: 'testuser',
				httpsPassword: 'testtoken',
			};

			const mockSavePreferences = vi.mocked(vcApi.savePreferences);
			mockSavePreferences.mockResolvedValue({} as any);

			// Act
			await sourceControlStore.savePreferences(preferences);

			// Assert
			expect(mockSavePreferences).toHaveBeenCalledWith(
				{}, // restApiContext
				preferences,
			);
		});

		it('should call API with SSH preferences', async () => {
			// Arrange
			const preferences = {
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
				connectionType: 'ssh' as const,
				keyGeneratorType: 'ed25519' as const,
			};

			const mockSavePreferences = vi.mocked(vcApi.savePreferences);
			mockSavePreferences.mockResolvedValue({} as any);

			// Act
			await sourceControlStore.savePreferences(preferences);

			// Assert
			expect(mockSavePreferences).toHaveBeenCalledWith(
				{}, // restApiContext
				preferences,
			);
		});

		it('should update local preferences after successful API call', async () => {
			// Arrange
			const preferences = {
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				connectionType: 'https' as const,
				connected: true,
			};

			const mockSavePreferences = vi.mocked(vcApi.savePreferences);
			mockSavePreferences.mockResolvedValue(preferences as any);

			// Act
			await sourceControlStore.savePreferences(preferences);

			// Assert
			expect(sourceControlStore.preferences.repositoryUrl).toBe(preferences.repositoryUrl);
			expect(sourceControlStore.preferences.branchName).toBe(preferences.branchName);
			expect(sourceControlStore.preferences.connectionType).toBe(preferences.connectionType);
			expect(sourceControlStore.preferences.connected).toBe(preferences.connected);
		});
	});

	describe('generateKeyPair', () => {
		it('should call API and update public key', async () => {
			// Arrange
			const keyType = 'ed25519';
			const mockKeyPair = {
				publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest',
			};

			const mockGenerateKeyPair = vi.mocked(vcApi.generateKeyPair);
			mockGenerateKeyPair.mockResolvedValue(mockKeyPair as any);

			// Act
			await sourceControlStore.generateKeyPair(keyType);

			// Assert
			expect(mockGenerateKeyPair).toHaveBeenCalledWith(
				{}, // restApiContext
				{ keyGeneratorType: keyType },
			);
			expect(sourceControlStore.preferences.publicKey).toBe(mockKeyPair.publicKey);
			expect(sourceControlStore.preferences.keyGeneratorType).toBe(keyType);
		});

		it('should handle API errors', async () => {
			// Arrange
			const mockGenerateKeyPair = vi.mocked(vcApi.generateKeyPair);
			mockGenerateKeyPair.mockRejectedValue(new Error('API Error'));

			// Act & Assert
			await expect(sourceControlStore.generateKeyPair('rsa')).rejects.toThrow('API Error');
		});
	});

	describe('getBranches', () => {
		it('should call API and update branches list', async () => {
			// Arrange
			const mockBranches = {
				branches: ['main', 'develop', 'feature/test'],
				currentBranch: 'main',
			};

			const mockGetBranches = vi.mocked(vcApi.getBranches);
			mockGetBranches.mockResolvedValue(mockBranches as any);

			// Act
			await sourceControlStore.getBranches();

			// Assert
			expect(mockGetBranches).toHaveBeenCalledWith({});
			expect(sourceControlStore.preferences.branches).toEqual(mockBranches.branches);
		});
	});

	describe('disconnect', () => {
		it('should call API and reset preferences', async () => {
			// Arrange
			sourceControlStore.preferences.connected = true;
			sourceControlStore.preferences.repositoryUrl = 'https://github.com/user/repo.git';
			sourceControlStore.preferences.branchName = 'main';

			const mockDisconnect = vi.mocked(vcApi.disconnect);
			mockDisconnect.mockResolvedValue({
				connected: false,
				repositoryUrl: '',
				branchName: '',
				connectionType: 'ssh',
			} as any);

			// Act
			await sourceControlStore.disconnect();

			// Assert
			expect(mockDisconnect).toHaveBeenCalledWith({});
			expect(sourceControlStore.preferences.connected).toBe(false);
			expect(sourceControlStore.preferences.repositoryUrl).toBe('');
			expect(sourceControlStore.preferences.branchName).toBe('');
			expect(sourceControlStore.preferences.connectionType).toBe('ssh');
		});
	});

	describe('pushWorkfolder', () => {
		it('should call API with correct parameters', async () => {
			// Arrange
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

			// Act
			await sourceControlStore.pushWorkfolder(data);

			// Assert
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
			// Arrange
			const options = {
				force: true,
				variables: 'include' as const,
			};

			const mockResult = {
				statusCode: 200,
				statusResult: 'Success',
			};

			const mockPullWorkfolder = vi.mocked(vcApi.pullWorkfolder);
			mockPullWorkfolder.mockResolvedValue(mockResult as any);

			// Act
			const result = await sourceControlStore.pullWorkfolder(options);

			// Assert
			expect(mockPullWorkfolder).toHaveBeenCalledWith({}, options);
			expect(result).toEqual(mockResult);
		});
	});

	describe('getAggregatedStatus', () => {
		it('should call API and return status', async () => {
			// Arrange
			const mockStatus = [
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

			const mockGetStatus = vi.mocked(vcApi.getStatus);
			mockGetStatus.mockResolvedValue(mockStatus as any);

			// Act
			const result = await sourceControlStore.getAggregatedStatus();

			// Assert
			expect(mockGetStatus).toHaveBeenCalledWith(
				{},
				{
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				},
			);
			expect(result).toEqual(mockStatus);
		});

		it('should allow custom options', async () => {
			// Arrange
			const options = {
				direction: 'pull' as const,
				verbose: false,
				preferLocalVersion: true,
			};

			const mockGetStatus = vi.mocked(vcApi.getStatus);
			mockGetStatus.mockResolvedValue([]);

			// Act
			await sourceControlStore.getAggregatedStatus(options);

			// Assert
			expect(mockGetStatus).toHaveBeenCalledWith({}, options);
		});
	});
});
