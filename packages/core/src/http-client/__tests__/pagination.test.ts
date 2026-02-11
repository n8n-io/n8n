import type { IHttpRequestOptions } from 'n8n-workflow';

import { paginateOffset } from '../pagination/offset';
import { paginateCursor } from '../pagination/cursor';
import { paginateLinkHeader } from '../pagination/link-header';
import { paginateToken } from '../pagination/token';
import type { PaginationOptions, RequestExecutor } from '../types';

describe('Pagination Strategies', () => {
	describe('offset (Airtable pattern)', () => {
		it('should follow offset token chain', async () => {
			const execute: RequestExecutor = jest
				.fn()
				.mockResolvedValueOnce({ records: [{ id: 1 }, { id: 2 }], offset: 'abc123' })
				.mockResolvedValueOnce({ records: [{ id: 3 }] });

			const opts: PaginationOptions = {
				strategy: 'offset',
				itemsPath: 'records',
				pageSize: 2,
			};

			const results = await paginateOffset({ url: '/test', method: 'GET' }, opts, execute);

			expect(results).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
			expect(execute).toHaveBeenCalledTimes(2);
		});

		it('should stop when offset token is missing', async () => {
			const execute: RequestExecutor = jest.fn().mockResolvedValueOnce({ records: [{ id: 1 }] });

			const opts: PaginationOptions = {
				strategy: 'offset',
				itemsPath: 'records',
			};

			const results = await paginateOffset({ url: '/test', method: 'GET' }, opts, execute);

			expect(results).toEqual([{ id: 1 }]);
			expect(execute).toHaveBeenCalledTimes(1);
		});

		it('should stop when items array is empty', async () => {
			const execute: RequestExecutor = jest
				.fn()
				.mockResolvedValueOnce({ records: [], offset: 'abc' });

			const opts: PaginationOptions = {
				strategy: 'offset',
				itemsPath: 'records',
			};

			const results = await paginateOffset({ url: '/test', method: 'GET' }, opts, execute);

			expect(results).toEqual([]);
			expect(execute).toHaveBeenCalledTimes(1);
		});

		it('should use custom query param names', async () => {
			const execute: RequestExecutor = jest
				.fn()
				.mockResolvedValueOnce({ data: [{ id: 1 }], next: 'token1' })
				.mockResolvedValueOnce({ data: [{ id: 2 }] });

			const opts: PaginationOptions = {
				strategy: 'offset',
				itemsPath: 'data',
				offsetResponsePath: 'next',
				offsetQueryParam: 'start',
				pageSizeParam: 'limit',
				pageSize: 10,
			};

			await paginateOffset({ url: '/test', method: 'GET' }, opts, execute);

			const firstCall = (execute as jest.Mock).mock.calls[0][0] as IHttpRequestOptions;
			expect(firstCall.qs).toEqual({ limit: 10 });

			const secondCall = (execute as jest.Mock).mock.calls[1][0] as IHttpRequestOptions;
			expect(secondCall.qs).toEqual({ limit: 10, start: 'token1' });
		});
	});

	describe('cursor (Slack pattern)', () => {
		it('should follow cursor chain', async () => {
			const execute: RequestExecutor = jest
				.fn()
				.mockResolvedValueOnce({
					channels: [{ id: 'C1' }],
					response_metadata: { next_cursor: 'cursor1' },
				})
				.mockResolvedValueOnce({
					channels: [{ id: 'C2' }],
					response_metadata: { next_cursor: '' },
				});

			const opts: PaginationOptions = {
				strategy: 'cursor',
				itemsPath: 'channels',
				pageSize: 1,
			};

			const results = await paginateCursor({ url: '/test', method: 'GET' }, opts, execute);

			expect(results).toEqual([{ id: 'C1' }, { id: 'C2' }]);
			expect(execute).toHaveBeenCalledTimes(2);
		});

		it('should stop when cursor is empty', async () => {
			const execute: RequestExecutor = jest.fn().mockResolvedValueOnce({
				channels: [{ id: 'C1' }],
				response_metadata: { next_cursor: '' },
			});

			const opts: PaginationOptions = {
				strategy: 'cursor',
				itemsPath: 'channels',
			};

			const results = await paginateCursor({ url: '/test', method: 'GET' }, opts, execute);

			expect(results).toEqual([{ id: 'C1' }]);
			expect(execute).toHaveBeenCalledTimes(1);
		});
	});

	describe('link-header (GitHub pattern)', () => {
		it('should follow Link header pagination', async () => {
			const execute: RequestExecutor = jest
				.fn()
				.mockResolvedValueOnce({
					body: [{ id: 1 }, { id: 2 }],
					headers: { link: '<https://api.github.com/repos?page=2>; rel="next"' },
					statusCode: 200,
				})
				.mockResolvedValueOnce({
					body: [{ id: 3 }],
					headers: { link: '<https://api.github.com/repos?page=1>; rel="prev"' },
					statusCode: 200,
				});

			const opts: PaginationOptions = {
				strategy: 'link-header',
				itemsPath: '',
				pageSize: 2,
			};

			const results = await paginateLinkHeader({ url: '/repos', method: 'GET' }, opts, execute);

			expect(results).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
			expect(execute).toHaveBeenCalledTimes(2);
		});

		it('should stop when no next link', async () => {
			const execute: RequestExecutor = jest.fn().mockResolvedValueOnce({
				body: [{ id: 1 }],
				headers: {},
				statusCode: 200,
			});

			const opts: PaginationOptions = {
				strategy: 'link-header',
				itemsPath: '',
			};

			const results = await paginateLinkHeader({ url: '/repos', method: 'GET' }, opts, execute);

			expect(results).toEqual([{ id: 1 }]);
			expect(execute).toHaveBeenCalledTimes(1);
		});

		it('should set returnFullResponse in request options', async () => {
			const execute: RequestExecutor = jest.fn().mockResolvedValueOnce({
				body: [],
				headers: {},
				statusCode: 200,
			});

			const opts: PaginationOptions = {
				strategy: 'link-header',
				itemsPath: '',
			};

			await paginateLinkHeader({ url: '/test', method: 'GET' }, opts, execute);

			const calledOptions = (execute as jest.Mock).mock.calls[0][0] as IHttpRequestOptions;
			expect(calledOptions.returnFullResponse).toBe(true);
		});
	});

	describe('token (GraphQL pattern)', () => {
		it('should inject pagination variables and follow pages', async () => {
			const execute: RequestExecutor = jest
				.fn()
				.mockResolvedValueOnce({
					data: {
						issues: {
							nodes: [{ id: '1' }],
							pageInfo: { hasNextPage: true, endCursor: 'cur1' },
						},
					},
				})
				.mockResolvedValueOnce({
					data: {
						issues: {
							nodes: [{ id: '2' }],
							pageInfo: { hasNextPage: false, endCursor: 'cur2' },
						},
					},
				});

			const opts: PaginationOptions = {
				strategy: 'token',
				itemsPath: 'data.issues.nodes',
				tokenPath: 'data.issues.pageInfo.endCursor',
				hasMorePath: 'data.issues.pageInfo.hasNextPage',
				pageSize: 50,
			};

			const baseOptions: IHttpRequestOptions = {
				url: '/graphql',
				method: 'POST',
				body: {
					query: '{ issues { nodes { id } pageInfo { hasNextPage endCursor } } }',
					variables: {},
				},
			};

			const results = await paginateToken(baseOptions, opts, execute);

			expect(results).toEqual([{ id: '1' }, { id: '2' }]);
			expect(execute).toHaveBeenCalledTimes(2);

			// Verify pagination variables were injected
			const secondCall = (execute as jest.Mock).mock.calls[1][0] as IHttpRequestOptions;
			const body = secondCall.body as Record<string, unknown>;
			const variables = body.variables as Record<string, unknown>;
			expect(variables.first).toBe(50);
			expect(variables.after).toBe('cur1');
		});

		it('should throw when tokenPath or hasMorePath is missing', async () => {
			const execute: RequestExecutor = jest.fn();

			const opts: PaginationOptions = {
				strategy: 'token',
				itemsPath: 'data',
			};

			await expect(paginateToken({ url: '/test', method: 'POST' }, opts, execute)).rejects.toThrow(
				'tokenPath and hasMorePath',
			);
		});
	});

	describe('maxPages safety limit', () => {
		it('should stop at maxPages even if more data exists', async () => {
			const execute: RequestExecutor = jest.fn().mockResolvedValue({
				items: [{ id: 1 }],
				response_metadata: { next_cursor: 'always_has_more' },
			});

			const opts: PaginationOptions = {
				strategy: 'cursor',
				itemsPath: 'items',
				maxPages: 3,
				pageSize: 1,
			};

			const results = await paginateCursor({ url: '/test', method: 'GET' }, opts, execute);

			expect(results).toHaveLength(3);
			expect(execute).toHaveBeenCalledTimes(3);
		});
	});
});
