import type { IRequestOptions, PaginationOptions } from 'n8n-workflow';

import { applyPaginationRequestData } from '../pagination';

describe('applyPaginationRequestData', () => {
	test('should merge pagination request data with original request options', () => {
		const originalRequestOptions: IRequestOptions = {
			uri: 'https://original.com/api',
			method: 'GET',
			qs: { page: 1 },
			headers: { 'X-Original-Header': 'original' },
		};

		const paginationRequestData: PaginationOptions['request'] = {
			url: 'https://pagination.com/api',
			body: { key: 'value' },
			headers: { 'X-Pagination-Header': 'pagination' },
		};

		const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

		expect(result).toEqual({
			uri: 'https://pagination.com/api',
			url: 'https://pagination.com/api',
			method: 'GET',
			qs: { page: 1 },
			headers: {
				'X-Original-Header': 'original',
				'X-Pagination-Header': 'pagination',
			},
			body: { key: 'value' },
		});
	});

	test('should handle formData correctly', () => {
		const originalRequestOptions: IRequestOptions = {
			uri: 'https://original.com/api',
			method: 'POST',
			formData: { original: 'data' },
		};

		const paginationRequestData: PaginationOptions['request'] = {
			url: 'https://pagination.com/api',
			body: { key: 'value' },
		};

		const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

		expect(result).toEqual({
			uri: 'https://pagination.com/api',
			url: 'https://pagination.com/api',
			method: 'POST',
			formData: { key: 'value', original: 'data' },
		});
	});

	test('should handle form data correctly', () => {
		const originalRequestOptions: IRequestOptions = {
			uri: 'https://original.com/api',
			method: 'POST',
			form: { original: 'data' },
		};

		const paginationRequestData: PaginationOptions['request'] = {
			url: 'https://pagination.com/api',
			body: { key: 'value' },
		};

		const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

		expect(result).toEqual({
			uri: 'https://pagination.com/api',
			url: 'https://pagination.com/api',
			method: 'POST',
			form: { key: 'value', original: 'data' },
		});
	});

	test('should prefer pagination body over original body', () => {
		const originalRequestOptions: IRequestOptions = {
			uri: 'https://original.com/api',
			method: 'POST',
			body: { original: 'data' },
		};

		const paginationRequestData: PaginationOptions['request'] = {
			url: 'https://pagination.com/api',
			body: { key: 'value' },
		};

		const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

		expect(result).toEqual({
			uri: 'https://pagination.com/api',
			url: 'https://pagination.com/api',
			method: 'POST',
			body: { key: 'value', original: 'data' },
		});
	});

	test('should merge complex request options', () => {
		const originalRequestOptions: IRequestOptions = {
			uri: 'https://original.com/api',
			method: 'GET',
			qs: { page: 1, limit: 10 },
			headers: { 'X-Original-Header': 'original' },
			body: { filter: 'active' },
		};

		const paginationRequestData: PaginationOptions['request'] = {
			url: 'https://pagination.com/api',
			body: { key: 'value' },
			headers: { 'X-Pagination-Header': 'pagination' },
			qs: { offset: 20 },
		};

		const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

		expect(result).toEqual({
			uri: 'https://pagination.com/api',
			url: 'https://pagination.com/api',
			method: 'GET',
			qs: { offset: 20, limit: 10, page: 1 },
			headers: {
				'X-Original-Header': 'original',
				'X-Pagination-Header': 'pagination',
			},
			body: { key: 'value', filter: 'active' },
		});
	});

	test('should handle edge cases with empty pagination data', () => {
		const originalRequestOptions: IRequestOptions = {
			uri: 'https://original.com/api',
			method: 'GET',
		};

		const paginationRequestData: PaginationOptions['request'] = {};

		const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

		expect(result).toEqual({
			uri: 'https://original.com/api',
			method: 'GET',
		});
	});
});
