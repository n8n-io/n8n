import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { execute } from '../../../actions/page/create.operation';
import { confluenceApiRequest } from '../../../transport';
import { mockExecuteCtx, testNode } from '../../shared';

vi.mock('../../../transport', async (importOriginal) => ({
	...(await importOriginal<object>()),
	confluenceApiRequest: vi.fn(),
}));

const apiRequest = confluenceApiRequest as unknown as Mock;

const baseParams: Record<string, unknown> = {
	space: { mode: 'list', value: '111' },
	title: 'My Page',
	bodyFormat: 'plainText',
	bodyPlainText: 'Hello',
	parentPage: '',
	options: {},
};

describe('page:create', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		apiRequest.mockResolvedValue({ id: '222', title: 'My Page' });
	});

	it('posts the assembled envelope to the v2 pages endpoint', async () => {
		const result = await execute.call(mockExecuteCtx(baseParams), 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			'/wiki/api/v2/pages',
			{
				spaceId: '111',
				status: 'current',
				title: 'My Page',
				body: { representation: 'storage', value: '<p>Hello</p>' },
			},
			{},
		);
		expect(result).toEqual({ id: '222', title: 'My Page' });
	});

	it.each([
		[
			'includes parentId when a parent page is set',
			{ parentPage: { mode: 'id', value: '98304' } },
			{ parentId: '98304' },
			{},
		],
		[
			'sends root-level and drops the parent when Root Level is on',
			{ parentPage: { mode: 'id', value: '98304' }, options: { rootLevel: true } },
			{},
			{ 'root-level': true },
		],
		[
			'sends the private query param when Private is on',
			{ options: { private: true } },
			{},
			{ private: true },
		],
		[
			'creates a draft when Create as Draft is on',
			{ options: { createAsDraft: true } },
			{ status: 'draft' },
			{},
		],
		['trims the title', { title: '  Padded  ' }, { title: 'Padded' }, {}],
		['coerces a non-string title from an expression', { title: 32 }, { title: '32' }, {}],
		[
			'combines Private, Root Level, and Create as Draft',
			{
				parentPage: { mode: 'id', value: '98304' },
				options: { private: true, rootLevel: true, createAsDraft: true },
			},
			{ status: 'draft' },
			{ private: true, 'root-level': true },
		],
	])('%s', async (_name, overrides, expectedBody, expectedQs) => {
		await execute.call(mockExecuteCtx({ ...baseParams, ...overrides }), 0);

		const [, , body, qs] = apiRequest.mock.calls[0];
		expect(body).toMatchObject(expectedBody);
		if (!('parentId' in expectedBody)) expect(body).not.toHaveProperty('parentId');
		expect(qs).toEqual(expectedQs);
	});

	it.each([
		['space', { ...baseParams, space: { mode: 'list', value: '' } }, 'Space is required'],
		['title', { ...baseParams, title: '   ' }, 'Title is required'],
	])('rejects a missing %s without calling the API', async (_field, params, message) => {
		const ctx = mockExecuteCtx(params);

		await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
		await expect(execute.call(ctx, 0)).rejects.toThrow(message);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects an object title instead of creating a page named [object Object]', async () => {
		const ctx = mockExecuteCtx({ ...baseParams, title: { some: 'object' } });

		await expect(execute.call(ctx, 0)).rejects.toThrow('Title is required');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	// Atlassian masks the failing restriction step behind a bare 404; the node
	// replaces it with guidance only when Private was the requested option
	it('maps a 404 with Private on to an actionable error', async () => {
		apiRequest.mockRejectedValue(
			new NodeApiError(testNode, { message: 'not found' }, { httpCode: '404' }),
		);
		const ctx = mockExecuteCtx({ ...baseParams, options: { private: true } });

		const error = await execute
			.call(ctx, 0)
			.then(() => null)
			.catch((thrown: NodeOperationError) => thrown);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error?.message).toBe('Could not create the page as private');
		expect(error?.description).toContain('Add/Delete restrictions');
	});

	it.each([
		[
			'a 404 without Private',
			{},
			new NodeApiError(testNode, { message: 'x' }, { httpCode: '404' }),
		],
		[
			'a non-404 with Private on',
			{ private: true },
			new NodeApiError(testNode, { message: 'x' }, { httpCode: '400' }),
		],
	])('passes %s through unchanged', async (_name, options, thrown) => {
		apiRequest.mockRejectedValue(thrown);

		await expect(execute.call(mockExecuteCtx({ ...baseParams, options }), 0)).rejects.toBe(thrown);
	});

	it('treats an empty By URL parent as "no parent" instead of failing extraction', async () => {
		await execute.call(
			mockExecuteCtx({ ...baseParams, parentPage: { mode: 'url', value: '' } }),
			0,
		);

		const [, , body] = apiRequest.mock.calls[0];
		expect(body).not.toHaveProperty('parentId');
	});
});
