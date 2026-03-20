import { Container } from '@n8n/di';
import type { NextFunction, Request, Response } from 'express';

jest.mock('@/modules/source-control.ee/source-control-preferences.service.ee', () => ({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	SourceControlPreferencesService: class MockSourceControlPreferencesService {},
}));

jest.mock('@/response-helper', () => ({
	sendErrorResponse: jest.fn(),
}));

import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { sendErrorResponse } from '@/response-helper';

import { createBranchWriteAccessMiddleware } from '../branch-write-access.middleware';

describe('createBranchWriteAccessMiddleware', () => {
	const req = {} as Request;
	const res = {} as Response;
	let next: NextFunction;

	beforeEach(() => {
		next = jest.fn();
		jest.clearAllMocks();
	});

	it('should return a middleware function', () => {
		const middleware = createBranchWriteAccessMiddleware('test');
		expect(typeof middleware).toBe('function');
	});

	it('should call next() when branchReadOnly is false', () => {
		jest.spyOn(Container, 'get').mockReturnValue({
			getPreferences: () => ({ branchReadOnly: false }),
		});

		const middleware = createBranchWriteAccessMiddleware('workflows');
		void middleware(req, res, next);

		expect(next).toHaveBeenCalled();
		expect(sendErrorResponse).not.toHaveBeenCalled();
	});

	it('should send 403 error response when branchReadOnly is true', () => {
		jest.spyOn(Container, 'get').mockReturnValue({
			getPreferences: () => ({ branchReadOnly: true }),
		});

		const middleware = createBranchWriteAccessMiddleware('workflows');
		void middleware(req, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(sendErrorResponse).toHaveBeenCalledWith(res, expect.any(Error));
	});

	it('should include resource name in error message', () => {
		jest.spyOn(Container, 'get').mockReturnValue({
			getPreferences: () => ({ branchReadOnly: true }),
		});

		const middleware = createBranchWriteAccessMiddleware('credentials');
		void middleware(req, res, next);

		expect(sendErrorResponse).toHaveBeenCalledWith(
			res,
			expect.objectContaining({
				message:
					'Cannot modify credentials on a protected instance. This instance is in read-only mode.',
			}),
		);
	});

	it('should look up SourceControlPreferencesService from Container', () => {
		const getSpy = jest.spyOn(Container, 'get').mockReturnValue({
			getPreferences: () => ({ branchReadOnly: false }),
		});

		const middleware = createBranchWriteAccessMiddleware('tags');
		void middleware(req, res, next);

		expect(getSpy).toHaveBeenCalledWith(SourceControlPreferencesService);
	});
});
