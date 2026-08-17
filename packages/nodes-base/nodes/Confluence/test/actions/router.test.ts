import { NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { router } from '../../actions/router';
import { confluenceApiRequest } from '../../transport';
import { mockExecuteCtx } from '../shared';

vi.mock('../../transport', async (importOriginal) => ({
	...(await importOriginal<object>()),
	confluenceApiRequest: vi.fn(),
}));

const apiRequest = confluenceApiRequest as unknown as Mock;

const createParams: Record<string, unknown> = {
	resource: 'page',
	operation: 'create',
	space: { mode: 'list', value: '111' },
	title: 'My Page',
	bodyFormat: 'plainText',
	bodyPlainText: 'Hello',
	parentPage: '',
	options: {},
};

describe('Confluence router', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		apiRequest.mockResolvedValue({ id: '222', title: 'My Page' });
	});

	it('dispatches page:create per item and pairs outputs to their inputs', async () => {
		const result = await router.call(mockExecuteCtx(createParams, 2));

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(result).toEqual([
			[
				{ json: { id: '222', title: 'My Page' }, pairedItem: { item: 0 } },
				{ json: { id: '222', title: 'My Page' }, pairedItem: { item: 1 } },
			],
		]);
	});

	it('emits an error item and continues with later items when continue-on-fail is on', async () => {
		const ctx = mockExecuteCtx(createParams, 2);
		ctx.continueOnFail.mockReturnValue(true);
		apiRequest.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ id: '333' });

		expect(await router.call(ctx)).toEqual([
			[
				{ json: { error: 'boom' }, pairedItem: { item: 0 } },
				{ json: { id: '333' }, pairedItem: { item: 1 } },
			],
		]);
	});

	it('rethrows when continue-on-fail is off', async () => {
		const ctx = mockExecuteCtx(createParams);
		ctx.continueOnFail.mockReturnValue(false);
		apiRequest.mockRejectedValue(new Error('boom'));

		await expect(router.call(ctx)).rejects.toThrow('boom');
	});

	it.each([
		['constructor', 'create'],
		['__proto__', 'create'],
		['page', 'constructor'],
		['page', 'hasOwnProperty'],
	])('rejects inherited-property lookups (%s:%s) as unsupported', async (resource, operation) => {
		const ctx = mockExecuteCtx({ ...createParams, resource, operation });

		await expect(router.call(ctx)).rejects.toThrow(NodeOperationError);
		await expect(router.call(ctx)).rejects.toThrow(
			`The operation "${resource}:${operation}" is not supported`,
		);
		expect(apiRequest).not.toHaveBeenCalled();
	});
});
