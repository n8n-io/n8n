import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { ValidationError, ExecutionError } from '@/modules/query/engine/errors';
import { QueryService } from '@/modules/query/query.service';

const handler = require('../queries.handler');

describe('Queries Handler', () => {
	let mockQueryService: { run: jest.Mock };
	let mockResponse: Partial<Response>;
	const user = { id: 'user-1' };

	const runHandler = (body: unknown) => {
		const req = { user, body } as unknown as AuthenticatedRequest;
		const handlerFn = handler.runQuery[handler.runQuery.length - 1];
		return handlerFn(req, mockResponse as Response);
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockQueryService = {
			run: jest.fn().mockResolvedValue({
				columns: ['id'],
				rows: [{ id: 'wf-1' }],
				durationMs: 3,
				truncated: false,
			}),
		};
		jest.spyOn(Container, 'get').mockImplementation((serviceClass: unknown) => {
			if (serviceClass === QueryService) return mockQueryService as unknown as QueryService;
			return {} as never;
		});
		mockResponse = { json: jest.fn().mockReturnThis() };
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	// ---------------------------------------------------------------- Group 1
	describe('happy path', () => {
		it('calls QueryService.run with query, user, and opts', async () => {
			await runHandler({ query: 'SELECT * FROM workflows', timeoutMs: 5000 });
			expect(mockQueryService.run).toHaveBeenCalledWith('SELECT * FROM workflows', user, {
				timeoutMs: 5000,
			});
		});

		it('returns service result via res.json', async () => {
			await runHandler({ query: 'SELECT * FROM workflows' });
			expect(mockResponse.json).toHaveBeenCalledWith({
				columns: ['id'],
				rows: [{ id: 'wf-1' }],
				durationMs: 3,
				truncated: false,
			});
		});
	});

	// ---------------------------------------------------------------- Group 2
	describe('body validation', () => {
		it('rejects empty string query', async () => {
			let caught: unknown;
			try {
				await runHandler({ query: '' });
			} catch (error) {
				caught = error;
			}
			expect(caught).toBeInstanceOf(BadRequestError);
		});

		it('rejects missing query', async () => {
			let caught: unknown;
			try {
				await runHandler({});
			} catch (error) {
				caught = error;
			}
			expect(caught).toBeInstanceOf(BadRequestError);
		});

		it('rejects non-string query', async () => {
			let caught: unknown;
			try {
				await runHandler({ query: 123 });
			} catch (error) {
				caught = error;
			}
			expect(caught).toBeInstanceOf(BadRequestError);
		});
	});

	// ---------------------------------------------------------------- Group 3
	describe('timeoutMs forwarding', () => {
		it('forwards undefined when omitted', async () => {
			await runHandler({ query: 'SELECT * FROM workflows' });
			expect(mockQueryService.run).toHaveBeenCalledWith(expect.anything(), user, {
				timeoutMs: undefined,
			});
		});

		it('forwards explicit timeoutMs', async () => {
			await runHandler({ query: 'SELECT * FROM workflows', timeoutMs: 250 });
			expect(mockQueryService.run).toHaveBeenCalledWith(expect.anything(), user, {
				timeoutMs: 250,
			});
		});
	});

	// ---------------------------------------------------------------- Group 4
	describe('engine error → HTTP', () => {
		it('maps validation errors to BadRequestError', async () => {
			mockQueryService.run.mockRejectedValue(
				new ValidationError('UNKNOWN_FIELD', "Unknown column 'bogus'"),
			);
			let caught: unknown;
			try {
				await runHandler({ query: 'SELECT bogus FROM workflows' });
			} catch (error) {
				caught = error;
			}
			expect(caught).toBeInstanceOf(BadRequestError);
			expect(caught).toMatchObject({ message: expect.stringContaining('UNKNOWN_FIELD') });
		});

		it('maps execution errors to InternalServerError', async () => {
			mockQueryService.run.mockRejectedValue(
				new ExecutionError('EXECUTION_FAILED', 'connection refused'),
			);
			let caught: unknown;
			try {
				await runHandler({ query: 'SELECT * FROM workflows' });
			} catch (error) {
				caught = error;
			}
			expect(caught).toBeInstanceOf(InternalServerError);
			expect(caught).toMatchObject({ message: expect.stringContaining('EXECUTION_FAILED') });
		});
	});

	// ---------------------------------------------------------------- Group 5
	describe('non-engine error', () => {
		it('rethrows a plain Error unchanged', async () => {
			const plain = new Error('boom');
			mockQueryService.run.mockRejectedValue(plain);
			let caught: unknown;
			try {
				await runHandler({ query: 'SELECT * FROM workflows' });
			} catch (error) {
				caught = error;
			}
			expect(caught).toBe(plain);
		});
	});
});
