import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { SchemaMap } from '../engine';
import { QueryExecutor, type RunQueryResult } from '../query.executor';
import { QueryService } from '../query.service';
import { SchemaMapBuilder } from '../schema-map.builder';

const fakeSchemaMap = (overrides: Partial<SchemaMap> = {}): SchemaMap => ({
	dialect: 'postgresdb',
	resolveWorkflowId: () => null,
	hasReadAccess: (id) => id === 'wf-1',
	accessibleWorkflowIds: ['wf-1'],
	tablePrefix: '',
	...overrides,
});

const makeUser = (): User => ({ id: 'user-1' }) as User;

const makeResult = (overrides: Partial<RunQueryResult> = {}): RunQueryResult => ({
	columns: ['x'],
	rows: [{ x: 1 }],
	durationMs: 5,
	truncated: false,
	...overrides,
});

describe('QueryService', () => {
	const schemaMapBuilder = mock<SchemaMapBuilder>();
	const executor = mock<QueryExecutor>();
	const service = new QueryService(schemaMapBuilder, executor);
	const user = makeUser();

	beforeEach(() => {
		jest.clearAllMocks();
		schemaMapBuilder.forUser.mockResolvedValue(fakeSchemaMap());
		executor.execute.mockResolvedValue(makeResult());
	});

	// ---------------------------------------------------------------- Group 1
	describe('happy path — executions', () => {
		it('returns the executor result', async () => {
			const result = await service.run('SELECT * FROM executions', user);
			expect(result).toEqual(makeResult());
		});

		it('calls executor with a compiled strategy', async () => {
			await service.run('SELECT * FROM executions', user);
			expect(executor.execute).toHaveBeenCalledTimes(1);
			const [strategy] = executor.execute.mock.calls[0];
			expect(strategy.kind).toBe('sql-only');
			expect(strategy.sql).toContain('"execution_entity"');
		});
	});

	// ---------------------------------------------------------------- Group 2
	describe('happy path — nodeOutput (workflow name extraction)', () => {
		beforeEach(() => {
			schemaMapBuilder.forUser.mockResolvedValue(
				fakeSchemaMap({
					resolveWorkflowId: (n) => (n === 'crm' ? 'wf-1' : null),
					hasReadAccess: () => true,
				}),
			);
		});

		it('passes the workflow name to SchemaMapBuilder.forUser before compile fails', async () => {
			await expect(service.run("SELECT * FROM 'crm'.'node'", user)).rejects.toThrow(
				/not yet supported/,
			);
			expect(schemaMapBuilder.forUser).toHaveBeenCalledWith(user, ['crm']);
		});
	});

	// ---------------------------------------------------------------- Group 3
	describe('workflow name extraction', () => {
		it('passes empty names list for system-table sources', async () => {
			await service.run('SELECT * FROM executions', user);
			expect(schemaMapBuilder.forUser).toHaveBeenCalledWith(user, []);
		});

		it('passes empty names list for workflows source', async () => {
			await service.run('SELECT * FROM workflows', user);
			expect(schemaMapBuilder.forUser).toHaveBeenCalledWith(user, []);
		});
	});

	// ---------------------------------------------------------------- Group 4
	describe('builder is called with the request user', () => {
		it('forwards the user object verbatim', async () => {
			const customUser = { id: 'specific-user' } as User;
			await service.run('SELECT * FROM executions', customUser);
			expect(schemaMapBuilder.forUser).toHaveBeenCalledWith(customUser, []);
		});
	});

	// ---------------------------------------------------------------- Group 5
	describe('timeoutMs forwarding', () => {
		it('forwards opts.timeoutMs to the executor', async () => {
			await service.run('SELECT * FROM executions', user, { timeoutMs: 5000 });
			expect(executor.execute).toHaveBeenCalledWith(expect.anything(), { timeoutMs: 5000 });
		});

		it('forwards undefined timeoutMs when caller omits it', async () => {
			await service.run('SELECT * FROM executions', user);
			expect(executor.execute).toHaveBeenCalledWith(expect.anything(), { timeoutMs: undefined });
		});
	});

	// ---------------------------------------------------------------- Group 6
	describe('error propagation', () => {
		it('propagates ParseError (bad SQL) unchanged', async () => {
			let thrown: unknown;
			try {
				await service.run('SELECT FROM x', user);
			} catch (err) {
				thrown = err;
			}
			expect(thrown).toMatchObject({ code: 'PARSE_ERROR' });
		});

		it('propagates ValidationError (unknown column) unchanged', async () => {
			let thrown: unknown;
			try {
				await service.run('SELECT bogus FROM executions', user);
			} catch (err) {
				thrown = err;
			}
			expect(thrown).toMatchObject({ code: 'UNKNOWN_FIELD' });
		});

		it('propagates executor errors unchanged', async () => {
			executor.execute.mockRejectedValue(new Error('boom'));
			await expect(service.run('SELECT * FROM executions', user)).rejects.toThrow('boom');
		});
	});
});
