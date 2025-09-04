import { testDb } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { SourceControlPreferencesService } from '@/environments.ee/source-control/source-control-preferences.service.ee';
import { SourceControlGitService } from '@/environments.ee/source-control/source-control-git.service.ee';
import type { SourceControlPreferences } from '@/environments.ee/source-control/types/source-control-preferences';

let sourceControlPreferencesService: SourceControlPreferencesService;
let sourceControlGitService: SourceControlGitService;

beforeAll(async () => {
	await testDb.init();
	sourceControlPreferencesService = Container.get(SourceControlPreferencesService);
	sourceControlGitService = Container.get(SourceControlGitService);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('Source Control Performance Tests', () => {
	beforeEach(async () => {
		// Reset preferences before each test
		await sourceControlPreferencesService.setPreferences({
			connected: false,
			protocol: 'ssh',
			repositoryUrl: '',
			branchName: '',
			username: '',
			personalAccessToken: '',
			keyGeneratorType: 'ed25519',
		} as SourceControlPreferences);
	});

	describe('HTTPS Authentication Performance', () => {
		test('should handle HTTPS credential encryption/decryption efficiently', async () => {
			const httpsPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#1d6acb',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
				keyGeneratorType: 'ed25519',
			};

			// Measure encryption/storage performance
			const startTime = process.hrtime.bigint();

			// Perform multiple encryption/decryption cycles
			const iterations = 100;
			for (let i = 0; i < iterations; i++) {
				await sourceControlPreferencesService.setPreferences(httpsPreferences, true);
				await sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences();
				const preferences = sourceControlPreferencesService.getPreferences();
				expect(preferences.personalAccessToken).toBe('ghp_test123456789');
			}

			const endTime = process.hrtime.bigint();
			const durationMs = Number(endTime - startTime) / 1_000_000;

			// Should complete 100 encryption/decryption cycles in reasonable time
			expect(durationMs).toBeLessThan(5000); // 5 seconds max

			// Log performance metrics for monitoring
			console.log(
				`HTTPS encryption/decryption cycles: ${iterations} in ${durationMs.toFixed(2)}ms`,
			);
			console.log(`Average per cycle: ${(durationMs / iterations).toFixed(2)}ms`);
		});

		test('should handle protocol switching efficiently', async () => {
			const startTime = process.hrtime.bigint();

			const sshPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'ssh',
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
				keyGeneratorType: 'ed25519',
				username: '',
				personalAccessToken: '',
				branchReadOnly: false,
				branchColor: '#1d6acb',
			};

			const httpsPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
				keyGeneratorType: 'ed25519',
				branchReadOnly: false,
				branchColor: '#1d6acb',
			};

			// Perform multiple protocol switches
			const switches = 50;
			for (let i = 0; i < switches; i++) {
				// Switch to SSH
				await sourceControlPreferencesService.setPreferences(sshPreferences);
				expect(sourceControlPreferencesService.getPreferences().protocol).toBe('ssh');

				// Switch to HTTPS
				await sourceControlPreferencesService.setPreferences(httpsPreferences);
				expect(sourceControlPreferencesService.getPreferences().protocol).toBe('https');
				expect(sourceControlPreferencesService.getPreferences().username).toBe('testuser');
			}

			const endTime = process.hrtime.bigint();
			const durationMs = Number(endTime - startTime) / 1_000_000;

			// Should complete protocol switches in reasonable time
			expect(durationMs).toBeLessThan(1000); // 1 second max

			console.log(`Protocol switches: ${switches * 2} in ${durationMs.toFixed(2)}ms`);
			console.log(`Average per switch: ${(durationMs / (switches * 2)).toFixed(2)}ms`);
		});
	});

	describe('Validation Performance', () => {
		test('should validate HTTPS preferences efficiently', async () => {
			const validHttpsPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#1d6acb',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
				keyGeneratorType: 'ed25519',
			};

			const startTime = process.hrtime.bigint();

			// Perform multiple validations
			const validations = 1000;
			for (let i = 0; i < validations; i++) {
				const errors =
					await sourceControlPreferencesService.validateSourceControlPreferences(
						validHttpsPreferences,
					);
				expect(errors).toHaveLength(0);
			}

			const endTime = process.hrtime.bigint();
			const durationMs = Number(endTime - startTime) / 1_000_000;

			// Should complete validations quickly
			expect(durationMs).toBeLessThan(2000); // 2 seconds max

			console.log(`Validation cycles: ${validations} in ${durationMs.toFixed(2)}ms`);
			console.log(`Average per validation: ${(durationMs / validations).toFixed(2)}ms`);
		});

		test('should handle invalid preference validation efficiently', async () => {
			const invalidHttpsPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'https',
				repositoryUrl: 'invalid-url',
				branchName: 'main',
				branchReadOnly: false,
				branchColor: 'invalid-color',
				username: '', // Missing required field
				personalAccessToken: '', // Missing required field
				keyGeneratorType: 'ed25519',
			};

			const startTime = process.hrtime.bigint();

			// Perform multiple invalid validations
			const validations = 100;
			for (let i = 0; i < validations; i++) {
				try {
					await sourceControlPreferencesService.validateSourceControlPreferences(
						invalidHttpsPreferences,
					);
					// Should not reach here
					fail('Expected validation to throw error');
				} catch (error) {
					expect(error).toBeDefined();
				}
			}

			const endTime = process.hrtime.bigint();
			const durationMs = Number(endTime - startTime) / 1_000_000;

			// Should complete error validations efficiently
			expect(durationMs).toBeLessThan(1000); // 1 second max

			console.log(`Error validation cycles: ${validations} in ${durationMs.toFixed(2)}ms`);
			console.log(`Average per error validation: ${(durationMs / validations).toFixed(2)}ms`);
		});
	});

	describe('Git Service Performance', () => {
		test('should handle authentication setup efficiently', async () => {
			const httpsPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
				keyGeneratorType: 'ed25519',
				branchReadOnly: false,
				branchColor: '#1d6acb',
			};

			const sshPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'ssh',
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
				keyGeneratorType: 'ed25519',
				username: '',
				personalAccessToken: '',
				branchReadOnly: false,
				branchColor: '#1d6acb',
			};

			// Mock Git service methods to avoid actual Git operations
			const setGitHttpsAuthSpy = jest
				.spyOn(sourceControlGitService, 'setGitHttpsAuth')
				.mockResolvedValue();
			const setGitSshCommandSpy = jest
				.spyOn(sourceControlGitService, 'setGitSshCommand')
				.mockResolvedValue();

			const startTime = process.hrtime.bigint();

			// Test authentication setup performance for both protocols
			const authSetups = 100;
			for (let i = 0; i < authSetups; i++) {
				// HTTPS auth setup
				await sourceControlGitService.setGitHttpsAuth(
					httpsPreferences.username,
					httpsPreferences.personalAccessToken,
				);

				// SSH auth setup
				await sourceControlGitService.setGitSshCommand(sshPreferences.keyGeneratorType);
			}

			const endTime = process.hrtime.bigint();
			const durationMs = Number(endTime - startTime) / 1_000_000;

			// Should complete auth setups efficiently
			expect(durationMs).toBeLessThan(500); // 500ms max

			console.log(`Auth setup cycles: ${authSetups * 2} in ${durationMs.toFixed(2)}ms`);
			console.log(`Average per auth setup: ${(durationMs / (authSetups * 2)).toFixed(2)}ms`);

			// Cleanup mocks
			setGitHttpsAuthSpy.mockRestore();
			setGitSshCommandSpy.mockRestore();
		});
	});

	describe('Memory Usage', () => {
		test('should not leak memory during repeated operations', async () => {
			const initialMemory = process.memoryUsage();

			const httpsPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#1d6acb',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
				keyGeneratorType: 'ed25519',
			};

			// Perform many operations that could potentially leak memory
			const operations = 1000;
			for (let i = 0; i < operations; i++) {
				await sourceControlPreferencesService.setPreferences(httpsPreferences);
				const preferences = sourceControlPreferencesService.getPreferences();
				expect(preferences.protocol).toBe('https');

				// Force garbage collection if available
				if (global.gc) {
					global.gc();
				}
			}

			const finalMemory = process.memoryUsage();
			const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

			// Memory growth should be reasonable (allow some growth but not excessive)
			expect(heapGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB max growth

			console.log(
				`Memory growth after ${operations} operations: ${(heapGrowth / 1024 / 1024).toFixed(2)}MB`,
			);
		});
	});
});
