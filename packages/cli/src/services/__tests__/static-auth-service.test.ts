import { StaticAuthService } from '../static-auth-service';
import type { Request, Response, NextFunction } from 'express';

describe('StaticAuthService', () => {
	describe('getStaticAuthMiddleware', () => {
		it('should return null if endpointAuthToken is not provided', () => {
			const middleware = StaticAuthService.getStaticAuthMiddleware('');
			expect(middleware).toBeNull();
		});

		it('should return a middleware function, if endpointAuthToken is provided', () => {
			const middleware = StaticAuthService.getStaticAuthMiddleware('test-token');
			expect(typeof middleware).toBe('function');
		});

		describe('middleware', () => {
			let next: () => void;
			let send: () => void;
			let status: () => {
				send: () => void;
			};
			let middleware: null | ((req: Request, res: Response, next: NextFunction) => void);
			beforeEach(() => {
				next = jest.fn();
				send = jest.fn();
				status = jest.fn().mockImplementation(() => {
					return {
						send,
					};
				});

				middleware = StaticAuthService.getStaticAuthMiddleware('test-token');
			});

			it('should call next with correct credentials', () => {
				middleware!(
					{
						headers: {
							authorization: 'Bearer test-token',
						},
					} as any as Request,
					{
						status,
					} as any as Response,
					next,
				);
				expect(next).toHaveBeenCalled();
				expect(status).not.toHaveBeenCalled();
				expect(send).not.toHaveBeenCalled();
			});

			it('should respond with 401 with invalid token', () => {
				middleware!(
					{
						headers: {
							authorization: 'Bearer invalid-token',
						},
					} as any as Request,
					{
						status,
					} as any as Response,
					next,
				);
				expect(next).not.toHaveBeenCalled();
				expect(status).toHaveBeenCalledWith(401);
				expect(send).toHaveBeenCalled();
			});

			it('should respond with 401 without token', () => {
				middleware!(
					{
						headers: {},
					} as any as Request,
					{
						status,
					} as any as Response,
					next,
				);
				expect(next).not.toHaveBeenCalled();
				expect(status).toHaveBeenCalledWith(401);
				expect(send).toHaveBeenCalled();
			});
		});
	});
});
