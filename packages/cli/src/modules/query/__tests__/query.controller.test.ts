import type { AuthenticatedRequest, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { RunQueryDto } from '../dto/run-query.dto';
import {
	EngineError,
	ExecutionError,
	ParseError,
	ValidationError,
	type EngineErrorCode,
} from '../engine/errors';
import { QueryController } from '../query.controller';
import { QueryService } from '../query.service';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';

const makeBody = (overrides: Partial<RunQueryDto> = {}): RunQueryDto =>
	({ query: 'SELECT * FROM executions', ...overrides }) as RunQueryDto;

const makeResult = () => ({
	columns: ['x'],
	rows: [{ x: 1 }],
	durationMs: 5,
	truncated: false,
});

describe('QueryController', () => {
	const queryService = mock<QueryService>();
	const controller = new QueryController(queryService);
	const user = { id: 'user-1' } as User;
	const req = { user } as AuthenticatedRequest;

	beforeEach(() => {
		jest.clearAllMocks();
		queryService.run.mockResolvedValue(makeResult());
	});

	// ---------------------------------------------------------------- Group 1
	describe('happy path', () => {
		it('forwards query, user, and opts to the service', async () => {
			await controller.run(req, null, makeBody({ timeoutMs: 5000 }));
			expect(queryService.run).toHaveBeenCalledWith('SELECT * FROM executions', req.user, {
				timeoutMs: 5000,
			});
		});

		it('returns the service result', async () => {
			const result = await controller.run(req, null, makeBody());
			expect(result).toEqual(makeResult());
		});
	});

	// ---------------------------------------------------------------- Group 2
	describe('timeoutMs pass-through', () => {
		it('forwards undefined when body has no timeoutMs', async () => {
			await controller.run(req, null, makeBody());
			expect(queryService.run).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
				timeoutMs: undefined,
			});
		});
	});

	// ---------------------------------------------------------------- Group 3-10
	describe('engine code → 400 BadRequestError', () => {
		const badRequestCodes: EngineErrorCode[] = [
			'PARSE_ERROR',
			'JOINS_NOT_SUPPORTED',
			'ALIASES_NOT_SUPPORTED',
			'UNKNOWN_FIELD',
			'UNKNOWN_SOURCE',
			'UNKNOWN_WORKFLOW',
			'AGGREGATE_IN_WHERE',
			'INVALID_WINDOW',
		];

		it.each(badRequestCodes)('maps %s to BadRequestError', async (code) => {
			queryService.run.mockRejectedValue(new EngineError(code, 'msg'));
			let thrown: unknown;
			try {
				await controller.run(req, null, makeBody());
			} catch (err) {
				thrown = err;
			}
			expect(thrown).toBeInstanceOf(BadRequestError);
			expect(thrown).toMatchObject({ message: expect.stringContaining(code) });
		});

		it('preserves the engine message in the response message', async () => {
			queryService.run.mockRejectedValue(new ParseError("Unexpected character '@'", 7));
			let thrown: unknown;
			try {
				await controller.run(req, null, makeBody());
			} catch (err) {
				thrown = err;
			}
			expect((thrown as Error).message).toContain('PARSE_ERROR');
			expect((thrown as Error).message).toContain("Unexpected character '@'");
		});
	});

	// ---------------------------------------------------------------- Group 11
	describe('FORBIDDEN_WORKFLOW → 403 ForbiddenError', () => {
		it('maps FORBIDDEN_WORKFLOW to ForbiddenError', async () => {
			queryService.run.mockRejectedValue(new ValidationError('FORBIDDEN_WORKFLOW', 'No access'));
			let thrown: unknown;
			try {
				await controller.run(req, null, makeBody());
			} catch (err) {
				thrown = err;
			}
			expect(thrown).toBeInstanceOf(ForbiddenError);
			expect(thrown).toMatchObject({ message: expect.stringContaining('FORBIDDEN_WORKFLOW') });
		});
	});

	// ---------------------------------------------------------------- Group 12-14
	describe('engine code → 500 InternalServerError', () => {
		const internalCodes: EngineErrorCode[] = [
			'DB_UNSUPPORTED',
			'STATEMENT_TIMEOUT',
			'EXECUTION_FAILED',
			'RESULT_TOO_LARGE',
		];

		it.each(internalCodes)('maps %s to InternalServerError', async (code) => {
			queryService.run.mockRejectedValue(new ExecutionError(code, 'msg'));
			let thrown: unknown;
			try {
				await controller.run(req, null, makeBody());
			} catch (err) {
				thrown = err;
			}
			expect(thrown).toBeInstanceOf(InternalServerError);
			expect(thrown).toMatchObject({ message: expect.stringContaining(code) });
		});
	});

	// ---------------------------------------------------------------- Group 16
	describe('non-engine errors', () => {
		it('rethrows a plain Error unchanged', async () => {
			const plainErr = new Error('plain boom');
			queryService.run.mockRejectedValue(plainErr);
			let thrown: unknown;
			try {
				await controller.run(req, null, makeBody());
			} catch (err) {
				thrown = err;
			}
			expect(thrown).toBe(plainErr);
		});
	});
});
