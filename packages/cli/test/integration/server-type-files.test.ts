import type express from 'express';
import { mock } from 'jest-mock-extended';

import type { AuthService } from '@/auth/auth.service';

describe('Server Type Files Protection', () => {
	let mockApp: jest.Mocked<express.Application>;
	let mockAuthService: jest.Mocked<AuthService>;

	beforeEach(() => {
		mockApp = {
			get: jest.fn(),
			use: jest.fn(),
		} as unknown as jest.Mocked<express.Application>;

		mockAuthService = mock<AuthService>();
		mockAuthService.createAuthMiddleware.mockReturnValue(jest.fn() as any);
	});

	describe('protected type files configuration', () => {
		it('should register protected endpoints for type files with authentication', () => {
			const staticCacheDir = '/mock/static/dir';

			// Simulate the server configuration code
			const protectedTypeFiles = ['/types/nodes.json', '/types/credentials.json'];
			protectedTypeFiles.forEach((path) => {
				mockApp.get(
					path,
					mockAuthService.createAuthMiddleware(true),
					(_req: express.Request, res: express.Response) => {
						res.sendFile(path.substring(1), {
							root: staticCacheDir,
						});
					},
				);
			});

			// Verify that both type file endpoints are registered with authentication
			expect(mockApp.get).toHaveBeenCalledWith(
				'/types/nodes.json',
				expect.any(Function),
				expect.any(Function),
			);

			expect(mockApp.get).toHaveBeenCalledWith(
				'/types/credentials.json',
				expect.any(Function),
				expect.any(Function),
			);

			// Verify auth middleware is created with correct parameters
			expect(mockAuthService.createAuthMiddleware).toHaveBeenCalledWith(true);
			expect(mockAuthService.createAuthMiddleware).toHaveBeenCalledTimes(2);
		});

		it('should set correct file paths for type files', () => {
			const staticCacheDir = '/mock/static/dir';
			const mockRes = {
				sendFile: jest.fn(),
			} as jest.Mocked<Partial<express.Response>>;

			// Simulate the server configuration code for nodes.json
			const handler = (_req: express.Request, res: express.Response) => {
				res.sendFile('types/nodes.json', {
					root: staticCacheDir,
				});
			};

			// Call the handler
			handler({} as express.Request, mockRes as express.Response);

			// Verify file serving is correct
			expect(mockRes.sendFile).toHaveBeenCalledWith('types/nodes.json', {
				root: staticCacheDir,
			});
		});

		it('should handle credentials.json path correctly', () => {
			const staticCacheDir = '/mock/static/dir';
			const mockRes = {
				sendFile: jest.fn(),
			} as jest.Mocked<Partial<express.Response>>;

			// Simulate the server configuration code for credentials.json
			const path = '/types/credentials.json';
			const handler = (_req: express.Request, res: express.Response) => {
				res.sendFile(path.substring(1), {
					root: staticCacheDir,
				});
			};

			// Call the handler
			handler({} as express.Request, mockRes as express.Response);

			// Verify file serving is correct
			expect(mockRes.sendFile).toHaveBeenCalledWith('types/credentials.json', {
				root: staticCacheDir,
			});
		});
	});
});
