import type {
	PullWorkFolderRequestDto,
	PushWorkFolderRequestDto,
	SourceControlPreferencesResponse,
} from '@n8n/api-types';
import { SourceControlPreferencesRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Request, Response, NextFunction } from 'express';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { EventService } from '@/events/event.service';

import type { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import { SourceControlController } from '../source-control.controller.ee';
import type { SourceControlService } from '../source-control.service.ee';
import type { SourceControlRequest } from '../types/requests';
import type { SourceControlGetStatus } from '../types/source-control-get-status';
import type { SourceControlPreferences } from '../types/source-control-preferences';

describe('SourceControlController', () => {
	let controller: SourceControlController;
	let sourceControlService: SourceControlService;
	let sourceControlPreferencesService: SourceControlPreferencesService;
	let eventService: EventService;

	beforeEach(() => {
		sourceControlService = {
			pushWorkfolder: jest.fn().mockResolvedValue({ statusCode: 200 }),
			pullWorkfolder: jest.fn().mockResolvedValue({ statusCode: 200 }),
			getStatus: jest.fn().mockResolvedValue([]),
			setGitUserDetails: jest.fn(),
			initializeRepository: jest.fn().mockResolvedValue(undefined),
			init: jest.fn().mockResolvedValue(undefined),
			setBranch: jest.fn().mockResolvedValue(undefined),
			disconnect: jest.fn().mockResolvedValue(undefined),
		} as unknown as SourceControlService;

		sourceControlPreferencesService = mock<SourceControlPreferencesService>();
		eventService = mock<EventService>();

		controller = new SourceControlController(
			sourceControlService,
			sourceControlPreferencesService,
			mock(),
			eventService,
		);
	});

	describe('pushWorkfolder', () => {
		it('should push workfolder with expected parameters', async () => {
			const req = mock<AuthenticatedRequest>({
				user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
			});
			const res = mock<Response>();
			const payload = { force: true } as PushWorkFolderRequestDto;

			await controller.pushWorkfolder(req, res, payload);
			expect(sourceControlService.setGitUserDetails).toHaveBeenCalledWith(
				'John Doe',
				'john.doe@example.com',
			);
			expect(sourceControlService.pushWorkfolder).toHaveBeenCalledWith(req.user, payload);
		});
	});

	describe('pullWorkfolder', () => {
		it('should pull workfolder with expected parameters', async () => {
			const req = mock<AuthenticatedRequest>({
				user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
			});
			const res = mock<Response>();
			const payload = { force: true } as PullWorkFolderRequestDto;

			await controller.pullWorkfolder(req, res, payload);
			expect(sourceControlService.pullWorkfolder).toHaveBeenCalledWith(req.user, payload);
		});
	});

	describe('getStatus', () => {
		it('should call getStatus with expected parameters', async () => {
			const user = { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' };
			const query = {
				direction: 'pull',
				preferLocalVersion: true,
				verbose: false,
			} as SourceControlGetStatus;
			const req = mock<SourceControlRequest.GetStatus>({
				query,
				user,
			});

			await controller.getStatus(req);
			expect(sourceControlService.getStatus).toHaveBeenCalledWith(user, query);
		});
	});

	describe('status', () => {
		it('should call getStatus with expected parameters', async () => {
			const user = { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' };
			const query = {
				direction: 'pull',
				preferLocalVersion: true,
				verbose: false,
			} as SourceControlGetStatus;
			const req = mock<SourceControlRequest.GetStatus>({
				query,
				user,
			});

			await controller.status(req);
			expect(sourceControlService.getStatus).toHaveBeenCalledWith(user, query);
		});
	});

	describe('Preferences Management with HTTPS Authentication', () => {
		describe('getPreferences', () => {
			it('should return sanitized preferences with public key', async () => {
				const mockPreferences = {
					protocol: 'https',
					username: 'testuser',
					repositoryUrl: 'https://github.com/user/repo.git',
					branchName: 'main',
					branchReadOnly: false,
					connected: true,
				};
				const publicKey = 'ssh-rsa AAAAB3NzaC1yc2E...';

				sourceControlPreferencesService.getPreferencesForResponse.mockReturnValue(mockPreferences);
				sourceControlPreferencesService.getPublicKey.mockResolvedValue(publicKey);

				const result = await controller.getPreferences();

				expect(result).toEqual({
					...mockPreferences,
					publicKey,
				});
				expect(sourceControlPreferencesService.getPreferencesForResponse).toHaveBeenCalled();
				expect(sourceControlPreferencesService.getPublicKey).toHaveBeenCalled();
			});

			it('should return SSH preferences without sensitive data', async () => {
				const mockPreferences = {
					protocol: 'ssh',
					repositoryUrl: 'git@github.com:user/repo.git',
					branchName: 'develop',
					branchReadOnly: true,
					connected: true,
				};
				const publicKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5...';

				sourceControlPreferencesService.getPreferencesForResponse.mockReturnValue(mockPreferences);
				sourceControlPreferencesService.getPublicKey.mockResolvedValue(publicKey);

				const result = await controller.getPreferences();

				expect(result.protocol).toBe('ssh');
				expect(result.publicKey).toBe(publicKey);
				expect('personalAccessToken' in result).toBe(false);
			});
		});

		describe('setPreferences', () => {
			const mockUser = { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' };

			beforeEach(() => {
				sourceControlPreferencesService.isSourceControlConnected.mockReturnValue(false);
				sourceControlPreferencesService.validateSourceControlPreferences.mockResolvedValue([]);
				sourceControlPreferencesService.setPreferences.mockImplementation(
					async (prefs) =>
						({
							...prefs,
							connected: false,
							branchName: prefs.branchName || 'main',
						}) as SourceControlPreferences,
				);
				sourceControlPreferencesService.getPreferences.mockReturnValue({
					connected: true,
					branchName: 'main',
					repositoryUrl: 'https://github.com/user/repo.git',
				} as SourceControlPreferences);
				sourceControlPreferencesService.getPreferencesForResponse.mockReturnValue({
					connected: true,
					branchName: 'main',
				});
				sourceControlPreferencesService.getPublicKey.mockResolvedValue('mock-public-key');
				// sourceControlService methods are already mocked in beforeEach
			});

			it('should successfully set HTTPS preferences', async () => {
				const httpsPreferences = {
					protocol: 'https',
					username: 'testuser',
					personalAccessToken: 'ghp_test123',
					repositoryUrl: 'https://github.com/user/repo.git',
					branchName: 'main',
					initRepo: true,
				};

				const req = mock<SourceControlRequest.UpdatePreferences>({
					body: httpsPreferences,
					user: mockUser,
				});

				const result = await controller.setPreferences(req);

				expect(
					sourceControlPreferencesService.validateSourceControlPreferences,
				).toHaveBeenCalledWith(
					expect.objectContaining({
						protocol: 'https',
						username: 'testuser',
						personalAccessToken: 'ghp_test123',
						initRepo: true,
					}),
				);
				expect(sourceControlService.initializeRepository).toHaveBeenCalled();
				expect(result).toBeDefined();
			});

			it('should successfully set SSH preferences', async () => {
				const sshPreferences = {
					protocol: 'ssh',
					repositoryUrl: 'git@github.com:user/repo.git',
					branchName: 'develop',
					initRepo: true,
				};

				const req = mock<SourceControlRequest.UpdatePreferences>({
					body: sshPreferences,
					user: mockUser,
				});

				const result = await controller.setPreferences(req);

				expect(
					sourceControlPreferencesService.validateSourceControlPreferences,
				).toHaveBeenCalledWith(
					expect.objectContaining({
						protocol: 'ssh',
						initRepo: true,
					}),
				);
				expect(sourceControlService.initializeRepository).toHaveBeenCalled();
				expect(result).toBeDefined();
			});

			it('should prevent changing preferences while connected', async () => {
				sourceControlPreferencesService.isSourceControlConnected.mockReturnValue(true);

				const req = mock<SourceControlRequest.UpdatePreferences>({
					body: {
						repositoryUrl: 'https://github.com/new/repo.git',
						branchReadOnly: undefined, // This triggers the check in the controller
					},
					user: mockUser,
				});

				await expect(controller.setPreferences(req)).rejects.toThrow(BadRequestError);
				await expect(controller.setPreferences(req)).rejects.toThrow(
					'Cannot change preferences while connected to a source control provider',
				);
			});

			it('should allow changing branchReadOnly while connected', async () => {
				sourceControlPreferencesService.isSourceControlConnected.mockReturnValue(true);

				const req = mock<SourceControlRequest.UpdatePreferences>({
					body: {
						branchReadOnly: true,
					},
					user: mockUser,
				});

				const result = await controller.setPreferences(req);

				expect(sourceControlPreferencesService.validateSourceControlPreferences).toHaveBeenCalled();
				expect(result).toBeDefined();
			});

			it('should handle initialization failure and cleanup', async () => {
				const initError = new Error('Repository initialization failed');
				sourceControlService.initializeRepository.mockRejectedValue(initError);
				sourceControlService.disconnect.mockResolvedValue(undefined);

				const req = mock<SourceControlRequest.UpdatePreferences>({
					body: {
						protocol: 'https',
						username: 'testuser',
						personalAccessToken: 'token',
						repositoryUrl: 'https://github.com/user/repo.git',
						initRepo: true,
					},
					user: mockUser,
				});

				await expect(controller.setPreferences(req)).rejects.toThrow(initError);
				expect(sourceControlService.disconnect).toHaveBeenCalledWith({ keepKeyPair: true });
			});

			it('should emit tracking event after setting preferences', async () => {
				const preferences = {
					protocol: 'https',
					username: 'testuser',
					personalAccessToken: 'token',
					repositoryUrl: 'https://github.com/user/repo.git',
					initRepo: false,
				};

				sourceControlPreferencesService.getPreferences.mockReturnValue({
					...preferences,
					connected: true,
					branchName: 'main',
					branchReadOnly: false,
				} as SourceControlPreferences);

				const req = mock<SourceControlRequest.UpdatePreferences>({
					body: preferences,
					user: mockUser,
				});

				await controller.setPreferences(req);

				expect(eventService.emit).toHaveBeenCalledWith('source-control-settings-updated', {
					branchName: 'main',
					connected: true,
					readOnlyInstance: false,
					repoType: 'github',
				});
			});
		});

		describe('updatePreferences', () => {
			const mockUser = { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' };

			beforeEach(() => {
				sourceControlPreferencesService.validateSourceControlPreferences.mockResolvedValue([]);
				sourceControlPreferencesService.getPreferences.mockReturnValue({
					branchName: 'main',
					connected: true,
					repositoryUrl: 'https://github.com/user/repo.git',
				} as SourceControlPreferences);
				sourceControlPreferencesService.setPreferences.mockResolvedValue(
					{} as SourceControlPreferences,
				);
				sourceControlPreferencesService.getPreferencesForResponse.mockReturnValue({
					branchName: 'main',
					connected: true,
				});
				sourceControlPreferencesService.getPublicKey.mockResolvedValue('mock-public-key');
				// sourceControlService methods are already mocked in beforeEach
			});

			it('should update branch name and call setBranch', async () => {
				const req = mock<SourceControlRequest.UpdatePreferences>({
					body: {
						branchName: 'feature-branch',
					},
					user: mockUser,
				});

				await controller.updatePreferences(req);

				expect(sourceControlService.setBranch).toHaveBeenCalledWith('feature-branch');
				expect(
					sourceControlPreferencesService.validateSourceControlPreferences,
				).toHaveBeenCalledWith(
					expect.objectContaining({
						branchName: 'feature-branch',
						initRepo: false,
						connected: undefined,
						publicKey: undefined,
						repositoryUrl: undefined,
					}),
				);
			});

			it('should update branch color and readonly status', async () => {
				const req = mock<SourceControlRequest.UpdatePreferences>({
					body: {
						branchColor: '#ff5733',
						branchReadOnly: true,
					},
					user: mockUser,
				});

				await controller.updatePreferences(req);

				expect(sourceControlPreferencesService.setPreferences).toHaveBeenCalledWith(
					{
						branchColor: '#ff5733',
						branchReadOnly: true,
					},
					true,
				);
			});

			it('should not call setBranch if branch name unchanged', async () => {
				sourceControlPreferencesService.getPreferences.mockReturnValue({
					branchName: 'main',
					connected: true,
					repositoryUrl: 'https://github.com/user/repo.git',
				} as SourceControlPreferences);

				const req = mock<SourceControlRequest.UpdatePreferences>({
					body: {
						branchName: 'main', // Same as current
						branchColor: '#ff5733',
					},
					user: mockUser,
				});

				await controller.updatePreferences(req);

				expect(sourceControlService.setBranch).not.toHaveBeenCalled();
			});

			it('should sanitize preferences and exclude sensitive fields', async () => {
				const req = mock<SourceControlRequest.UpdatePreferences>({
					body: {
						branchName: 'feature',
						// These should be filtered out
						repositoryUrl: 'https://evil.com/repo.git',
						connected: true,
						publicKey: 'fake-key',
						personalAccessToken: 'should-not-be-updated-here',
					},
					user: mockUser,
				});

				await controller.updatePreferences(req);

				expect(
					sourceControlPreferencesService.validateSourceControlPreferences,
				).toHaveBeenCalledWith(
					expect.objectContaining({
						branchName: 'feature',
						initRepo: false,
						connected: undefined,
						publicKey: undefined,
						repositoryUrl: undefined,
						// personalAccessToken should still be present but filtered fields are overridden
					}),
				);

				// Check that the sanitized preferences exclude the filtered repositoryUrl field
				const callArgs =
					sourceControlPreferencesService.validateSourceControlPreferences.mock.calls[0][0];
				expect(callArgs.repositoryUrl).toBeUndefined();
				expect(callArgs.connected).toBeUndefined();
				expect(callArgs.publicKey).toBeUndefined();
			});

			it('should emit tracking event after updating preferences', async () => {
				sourceControlPreferencesService.getPreferences.mockReturnValue({
					branchName: 'updated-branch',
					connected: true,
					branchReadOnly: true,
					repositoryUrl: 'https://github.com/user/repo.git',
				} as SourceControlPreferences);

				const req = mock<SourceControlRequest.UpdatePreferences>({
					body: {
						branchColor: '#33ff57',
					},
					user: mockUser,
				});

				await controller.updatePreferences(req);

				expect(eventService.emit).toHaveBeenCalledWith('source-control-settings-updated', {
					branchName: 'updated-branch',
					connected: true,
					readOnlyInstance: true,
					repoType: 'github',
				});
			});
		});
	});

	describe('Validation Middleware', () => {
		let req: Request;
		let res: Response;
		let next: NextFunction;

		beforeEach(() => {
			req = mock<Request>();
			res = mock<Response>();
			next = jest.fn();
		});

		// Import and test the validation middleware directly
		const validateSourceControlPreferences = (req: Request, res: Response, next: NextFunction) => {
			const validationResult = SourceControlPreferencesRequestDto.validate(req.body);

			if (!validationResult.success) {
				const errorMessages = validationResult.error.errors
					.map((err) => `${err.path.join('.')}: ${err.message}`)
					.join(', ');

				throw new BadRequestError(`Invalid source control preferences: ${errorMessages}`);
			}

			req.body = validationResult.data;
			next();
		};

		it('should pass valid SSH preferences through middleware', () => {
			req.body = {
				protocol: 'ssh',
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
			};

			validateSourceControlPreferences(req, res, next);

			expect(next).toHaveBeenCalled();
			expect(req.body).toEqual({
				protocol: 'ssh',
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
			});
		});

		it('should pass valid HTTPS preferences through middleware', () => {
			req.body = {
				protocol: 'https',
				username: 'testuser',
				personalAccessToken: 'ghp_test123',
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
			};

			validateSourceControlPreferences(req, res, next);

			expect(next).toHaveBeenCalled();
			expect(req.body.protocol).toBe('https');
			expect(req.body.username).toBe('testuser');
			expect(req.body.personalAccessToken).toBe('ghp_test123');
		});

		it('should reject HTTPS preferences missing username', () => {
			req.body = {
				protocol: 'https',
				personalAccessToken: 'ghp_test123',
				repositoryUrl: 'https://github.com/user/repo.git',
			};

			expect(() => validateSourceControlPreferences(req, res, next)).toThrow(BadRequestError);
			expect(() => validateSourceControlPreferences(req, res, next)).toThrow(
				'Username is required when using HTTPS protocol',
			);
			expect(next).not.toHaveBeenCalled();
		});

		it('should reject HTTPS preferences missing personal access token', () => {
			req.body = {
				protocol: 'https',
				username: 'testuser',
				repositoryUrl: 'https://github.com/user/repo.git',
			};

			expect(() => validateSourceControlPreferences(req, res, next)).toThrow(BadRequestError);
			expect(() => validateSourceControlPreferences(req, res, next)).toThrow(
				'Personal access token is required when using HTTPS protocol',
			);
			expect(next).not.toHaveBeenCalled();
		});

		it('should reject invalid repository URL', () => {
			req.body = {
				repositoryUrl: 'not-a-valid-url',
				branchName: 'main',
			};

			expect(() => validateSourceControlPreferences(req, res, next)).toThrow(BadRequestError);
			expect(() => validateSourceControlPreferences(req, res, next)).toThrow(
				'Invalid source control preferences',
			);
			expect(next).not.toHaveBeenCalled();
		});

		it('should reject invalid branch color', () => {
			req.body = {
				repositoryUrl: 'https://github.com/user/repo.git',
				branchColor: 'invalid-color',
			};

			expect(() => validateSourceControlPreferences(req, res, next)).toThrow(BadRequestError);
			expect(() => validateSourceControlPreferences(req, res, next)).toThrow(
				'Branch color must be a valid hex color',
			);
			expect(next).not.toHaveBeenCalled();
		});

		it('should handle multiple validation errors', () => {
			req.body = {
				protocol: 'https',
				// Missing username and personalAccessToken
				repositoryUrl: 'invalid-url',
				branchColor: 'invalid-color',
			};

			expect(() => validateSourceControlPreferences(req, res, next)).toThrow(BadRequestError);

			try {
				validateSourceControlPreferences(req, res, next);
			} catch (error) {
				const errorMessage = (error as BadRequestError).message;
				expect(errorMessage).toContain('Invalid source control preferences');
				// Should contain multiple error messages
				expect(errorMessage.split(',').length).toBeGreaterThan(1);
			}

			expect(next).not.toHaveBeenCalled();
		});

		it('should accept partial updates without protocol validation', () => {
			req.body = {
				branchName: 'feature-branch',
				branchColor: '#ff5733',
			};

			validateSourceControlPreferences(req, res, next);

			expect(next).toHaveBeenCalled();
			expect(req.body.branchName).toBe('feature-branch');
			expect(req.body.branchColor).toBe('#ff5733');
		});
	});

	describe('Error Handling', () => {
		const mockUser = { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' };

		it('should wrap service errors in BadRequestError for setPreferences', async () => {
			const serviceError = new Error('Service validation failed');
			sourceControlPreferencesService.validateSourceControlPreferences.mockRejectedValue(
				serviceError,
			);

			const req = mock<SourceControlRequest.UpdatePreferences>({
				body: { repositoryUrl: 'https://github.com/user/repo.git' },
				user: mockUser,
			});

			await expect(controller.setPreferences(req)).rejects.toThrow(BadRequestError);
			await expect(controller.setPreferences(req)).rejects.toThrow('Service validation failed');
		});

		it('should wrap service errors in BadRequestError for updatePreferences', async () => {
			const serviceError = new Error('Update service failed');
			sourceControlPreferencesService.validateSourceControlPreferences.mockRejectedValue(
				serviceError,
			);

			const req = mock<SourceControlRequest.UpdatePreferences>({
				body: { branchName: 'new-branch' },
				user: mockUser,
			});

			await expect(controller.updatePreferences(req)).rejects.toThrow(BadRequestError);
			await expect(controller.updatePreferences(req)).rejects.toThrow('Update service failed');
		});

		it('should handle repository initialization errors correctly', async () => {
			sourceControlPreferencesService.isSourceControlConnected.mockReturnValue(false);
			sourceControlPreferencesService.validateSourceControlPreferences.mockResolvedValue([]);
			sourceControlPreferencesService.setPreferences.mockResolvedValue({
				branchName: 'main',
			} as SourceControlPreferences);

			const initError = new Error('Git repository not found');
			// Override the mock to throw error
			(sourceControlService.initializeRepository as jest.Mock).mockRejectedValue(initError);

			const req = mock<SourceControlRequest.UpdatePreferences>({
				body: {
					protocol: 'https',
					username: 'user',
					personalAccessToken: 'token',
					repositoryUrl: 'https://github.com/user/nonexistent.git',
					initRepo: true,
				},
				user: mockUser,
			});

			await expect(controller.setPreferences(req)).rejects.toThrow(initError);
			expect(sourceControlService.disconnect).toHaveBeenCalledWith({ keepKeyPair: true });
		});
	});
});
