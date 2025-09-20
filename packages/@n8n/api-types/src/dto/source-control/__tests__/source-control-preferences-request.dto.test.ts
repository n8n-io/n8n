import { SourceControlPreferencesRequestDto } from '../source-control-preferences-request.dto';

describe('SourceControlPreferencesRequestDto', () => {
	describe('Valid SSH preferences', () => {
		test.each([
			{
				name: 'minimal SSH preferences with git@ URL',
				request: {
					protocol: 'ssh',
					repositoryUrl: 'git@github.com:user/repo.git',
					branchName: 'main',
				},
				shouldValidate: true,
			},
			{
				name: 'complete SSH preferences with git@ URL',
				request: {
					protocol: 'ssh',
					repositoryUrl: 'git@github.com:user/repo.git',
					branchName: 'main',
					branchReadOnly: true,
					branchColor: '#ff5733',
					keyGeneratorType: 'ed25519',
					initRepo: false,
				},
				shouldValidate: true,
			},
			{
				name: 'SSH with RSA key type and GitLab',
				request: {
					protocol: 'ssh',
					repositoryUrl: 'git@gitlab.com:user/repo.git',
					branchName: 'develop',
					keyGeneratorType: 'rsa',
				},
				shouldValidate: true,
			},
		])('should validate $name', ({ request, shouldValidate }) => {
			const result = SourceControlPreferencesRequestDto.validate(request);
			expect(result.success).toBe(shouldValidate);
			if (shouldValidate) {
				expect(result.data).toMatchObject(request);
			}
		});
	});

	describe('Valid HTTPS preferences', () => {
		test.each([
			{
				name: 'minimal HTTPS preferences with required fields',
				request: {
					protocol: 'https',
					username: 'testuser',
					personalAccessToken: 'pat_abcd1234',
					repositoryUrl: 'https://github.com/user/repo.git',
					branchName: 'main',
				},
				shouldValidate: true,
			},
			{
				name: 'complete HTTPS preferences',
				request: {
					protocol: 'https',
					username: 'testuser',
					personalAccessToken: 'ghp_abcd1234567890',
					repositoryUrl: 'https://github.com/user/repo.git',
					branchName: 'feature-branch',
					branchReadOnly: false,
					branchColor: '#33ff57',
					initRepo: true,
				},
				shouldValidate: true,
			},
			{
				name: 'HTTPS with GitLab URL',
				request: {
					protocol: 'https',
					username: 'gitlab-user',
					personalAccessToken: 'glpat_xyz789',
					repositoryUrl: 'https://gitlab.com/group/project.git',
					branchName: 'staging',
				},
				shouldValidate: true,
			},
		])('should validate $name', ({ request, shouldValidate }) => {
			const result = SourceControlPreferencesRequestDto.validate(request);
			expect(result.success).toBe(shouldValidate);
			if (shouldValidate) {
				expect(result.data).toMatchObject(request);
			}
		});
	});

	describe('Protocol validation', () => {
		test('should accept valid protocol values', () => {
			const sshRequest = { protocol: 'ssh' };
			const httpsRequest = { protocol: 'https', username: 'user', personalAccessToken: 'token' };

			expect(SourceControlPreferencesRequestDto.validate(sshRequest).success).toBe(true);
			expect(SourceControlPreferencesRequestDto.validate(httpsRequest).success).toBe(true);
		});

		test('should reject invalid protocol values', () => {
			const request = { protocol: 'ftp' };
			const result = SourceControlPreferencesRequestDto.validate(request);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues).toHaveLength(1);
				expect(result.error.issues[0].path).toEqual(['protocol']);
			}
		});
	});

	describe('HTTPS cross-field validation', () => {
		test('should require username when protocol is https', () => {
			const request = {
				protocol: 'https',
				personalAccessToken: 'token123',
				repositoryUrl: 'https://github.com/user/repo.git',
			};

			const result = SourceControlPreferencesRequestDto.validate(request);

			expect(result.success).toBe(false);
			if (!result.success) {
				const usernameError = result.error.issues.find((issue) => issue.path.includes('username'));
				expect(usernameError).toBeDefined();
				expect(usernameError?.message).toBe('Username is required when using HTTPS protocol');
			}
		});

		test('should require personalAccessToken when protocol is https', () => {
			const request = {
				protocol: 'https',
				username: 'testuser',
				repositoryUrl: 'https://github.com/user/repo.git',
			};

			const result = SourceControlPreferencesRequestDto.validate(request);

			expect(result.success).toBe(false);
			if (!result.success) {
				const tokenError = result.error.issues.find((issue) =>
					issue.path.includes('personalAccessToken'),
				);
				expect(tokenError).toBeDefined();
				expect(tokenError?.message).toBe(
					'Personal access token is required when using HTTPS protocol',
				);
			}
		});

		test('should require both username and personalAccessToken when protocol is https', () => {
			const request = {
				protocol: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
			};

			const result = SourceControlPreferencesRequestDto.validate(request);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues).toHaveLength(2);

				const errorPaths = result.error.issues.map((issue) => issue.path[0]);
				expect(errorPaths).toContain('username');
				expect(errorPaths).toContain('personalAccessToken');
			}
		});

		test('should not require HTTPS fields when protocol is ssh', () => {
			const request = {
				protocol: 'ssh',
				repositoryUrl: 'git@github.com:user/repo.git',
			};

			const result = SourceControlPreferencesRequestDto.validate(request);
			expect(result.success).toBe(true);
		});

		test('should not require HTTPS fields when protocol is undefined', () => {
			const request = {
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
			};

			const result = SourceControlPreferencesRequestDto.validate(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Repository URL validation', () => {
		test.each([
			'https://github.com/user/repo.git',
			'https://gitlab.com/group/project.git',
			'git@github.com:user/repo.git', // SSH format now supported
			'git@gitlab.com:group/project.git',
			'git@bitbucket.org:workspace/repo.git',
		])('should accept valid Git URL: %s', (url) => {
			const request = { repositoryUrl: url };
			const result = SourceControlPreferencesRequestDto.validate(request);
			expect(result.success).toBe(true);
		});

		test.each([
			'invalid-url',
			'not-a-url',
			'',
			'ftp://example.com/repo', // FTP URLs not allowed for Git
			'ssh://git@github.com/user/repo.git', // SSH URLs with ssh:// protocol not supported
			'git@github.com/user/repo', // Missing .git extension or colon separator
		])('should reject invalid Git URL: %s', (url) => {
			const request = { repositoryUrl: url };
			const result = SourceControlPreferencesRequestDto.validate(request);

			expect(result.success).toBe(false);
			if (!result.success) {
				const urlError = result.error.issues.find((issue) => issue.path.includes('repositoryUrl'));
				expect(urlError).toBeDefined();
				expect(urlError?.message).toBe('Repository URL must be a valid Git SSH or HTTPS URL');
			}
		});
	});

	describe('Branch name validation', () => {
		test('should accept valid branch names', () => {
			const validNames = ['main', 'develop', 'feature/new-feature', 'release-v1.0'];

			validNames.forEach((branchName) => {
				const request = { branchName };
				const result = SourceControlPreferencesRequestDto.validate(request);
				expect(result.success).toBe(true);
			});
		});

		test('should reject empty branch name', () => {
			const request = { branchName: '' };
			const result = SourceControlPreferencesRequestDto.validate(request);

			expect(result.success).toBe(false);
			if (!result.success) {
				const branchError = result.error.issues.find((issue) => issue.path.includes('branchName'));
				expect(branchError).toBeDefined();
			}
		});
	});

	describe('Branch color validation', () => {
		test.each(['#ff5733', '#FF5733', '#000000', '#ffffff', '#123ABC'])(
			'should accept valid hex color: %s',
			(color) => {
				const request = { branchColor: color };
				const result = SourceControlPreferencesRequestDto.validate(request);
				expect(result.success).toBe(true);
			},
		);

		test.each([
			'ff5733', // missing #
			'#ff573', // too short
			'#ff57333', // too long
			'#gg5733', // invalid characters
			'red', // named color
			'rgb(255,87,51)', // rgb format
		])('should reject invalid hex color: %s', (color) => {
			const request = { branchColor: color };
			const result = SourceControlPreferencesRequestDto.validate(request);

			expect(result.success).toBe(false);
			if (!result.success) {
				const colorError = result.error.issues.find((issue) => issue.path.includes('branchColor'));
				expect(colorError).toBeDefined();
				expect(colorError?.message).toBe('Branch color must be a valid hex color');
			}
		});
	});

	describe('Key generator type validation', () => {
		test('should accept valid key generator types', () => {
			const validTypes = ['ed25519', 'rsa'];

			validTypes.forEach((keyGeneratorType) => {
				const request = { keyGeneratorType };
				const result = SourceControlPreferencesRequestDto.validate(request);
				expect(result.success).toBe(true);
			});
		});

		test('should reject invalid key generator type', () => {
			const request = { keyGeneratorType: 'invalid' };
			const result = SourceControlPreferencesRequestDto.validate(request);

			expect(result.success).toBe(false);
			if (!result.success) {
				const keyError = result.error.issues.find((issue) =>
					issue.path.includes('keyGeneratorType'),
				);
				expect(keyError).toBeDefined();
			}
		});
	});

	describe('Username validation', () => {
		test('should accept valid usernames', () => {
			const validUsernames = ['user', 'test-user', 'user123', 'user_name'];

			validUsernames.forEach((username) => {
				const request = { username };
				const result = SourceControlPreferencesRequestDto.validate(request);
				expect(result.success).toBe(true);
			});
		});

		test('should reject empty username', () => {
			const request = { username: '' };
			const result = SourceControlPreferencesRequestDto.validate(request);

			expect(result.success).toBe(false);
			if (!result.success) {
				const usernameError = result.error.issues.find((issue) => issue.path.includes('username'));
				expect(usernameError).toBeDefined();
			}
		});
	});

	describe('Personal access token validation', () => {
		test('should accept valid tokens', () => {
			const validTokens = [
				'ghp_1234567890abcdef',
				'glpat_xyz789',
				'pat_abcd1234',
				'simple-token-123',
			];

			validTokens.forEach((personalAccessToken) => {
				const request = { personalAccessToken };
				const result = SourceControlPreferencesRequestDto.validate(request);
				expect(result.success).toBe(true);
			});
		});

		test('should reject empty token', () => {
			const request = { personalAccessToken: '' };
			const result = SourceControlPreferencesRequestDto.validate(request);

			expect(result.success).toBe(false);
			if (!result.success) {
				const tokenError = result.error.issues.find((issue) =>
					issue.path.includes('personalAccessToken'),
				);
				expect(tokenError).toBeDefined();
			}
		});
	});

	describe('Complex validation scenarios', () => {
		test('should validate complex HTTPS configuration with all fields', () => {
			const request = {
				protocol: 'https',
				username: 'developer',
				personalAccessToken: 'ghp_abcdef123456',
				repositoryUrl: 'https://github.com/company/project.git',
				branchName: 'feature/https-auth',
				branchReadOnly: false,
				branchColor: '#4a90e2',
				keyGeneratorType: 'ed25519',
				initRepo: true,
			};

			const result = SourceControlPreferencesRequestDto.validate(request);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toMatchObject(request);
			}
		});

		test('should handle partial updates correctly', () => {
			const request = {
				branchColor: '#ff0000',
				branchReadOnly: true,
			};

			const result = SourceControlPreferencesRequestDto.validate(request);
			expect(result.success).toBe(true);
		});

		test('should reject invalid combinations', () => {
			const request = {
				protocol: 'https',
				username: '', // empty username
				personalAccessToken: 'valid-token',
				branchColor: 'invalid-color', // invalid color format
			};

			const result = SourceControlPreferencesRequestDto.validate(request);
			expect(result.success).toBe(false);

			if (!result.success) {
				expect(result.error.issues.length).toBeGreaterThan(1);

				const errorPaths = result.error.issues.map((issue) => issue.path[0]);
				expect(errorPaths).toContain('username');
				expect(errorPaths).toContain('branchColor');
			}
		});
	});
});
