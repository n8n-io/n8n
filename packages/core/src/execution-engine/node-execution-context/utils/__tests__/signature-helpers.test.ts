import type { Request } from 'express';
import { mock } from 'jest-mock-extended';

import { WAITING_TOKEN_QUERY_PARAM } from '../../../../constants';
import { generateSignatureToken, validateSignatureInRequest } from '../signature-helpers';

describe('signature-helpers', () => {
	const secret = 'test-secret';
	const baseUrl = 'http://localhost:5678';

	describe('generateSignatureToken', () => {
		it('should generate a signature token', () => {
			const url = `${baseUrl}/webhook/abc`;
			const token = generateSignatureToken(url, secret);
			expect(token).toBe('fe7f1e4c11f875b2d24681e0b28d0bfed6d66381af5b0ab9633da2202a895243');
		});

		it('should generate a different token for a different url', () => {
			const url = `${baseUrl}/webhook/def`;
			const token = generateSignatureToken(url, secret);
			expect(token).toBe('ab8e72e7a0e47689596a6550283cbef9e2797b7370b0d6d99c89ee7c2394ea8f');
		});

		it('should generate a different token for a different secret', () => {
			const url = `${baseUrl}/webhook/abc`;
			const token = generateSignatureToken(url, 'different-secret');
			expect(token).toBe('84a99b6950e12ffcf1fcf8e0fc0986c0c8a46df331932efd79b17e0c11801bd2');
		});
	});

	describe('validateSignatureInRequest', () => {
		it('should return true if the signature is valid', () => {
			const url = `${baseUrl}/webhook/abc`;
			const token = generateSignatureToken(url, secret);
			const req = mock<Request>({
				url: `${url}?${WAITING_TOKEN_QUERY_PARAM}=${token}`,
				protocol: 'http',
				headers: {
					host: 'localhost:5678',
				},
				query: {
					[WAITING_TOKEN_QUERY_PARAM]: token,
				},
			});
			const isValid = validateSignatureInRequest(req, secret);
			expect(isValid).toBe(true);
		});

		it('should return false if the signature is invalid', () => {
			const url = `${baseUrl}/webhook/abc`;
			const req = mock<Request>({
				url: `${url}?waitingToken=invalid-token`,
				protocol: 'http',
				headers: {
					host: 'localhost:5678',
				},
				query: {
					[WAITING_TOKEN_QUERY_PARAM]: 'invalid-token',
				},
			});
			const isValid = validateSignatureInRequest(req, secret);
			expect(isValid).toBe(false);
		});

		it('should return false if the token is missing', () => {
			const url = `${baseUrl}/webhook/abc`;
			const req = mock<Request>({
				url,
				protocol: 'http',
				headers: {
					host: 'localhost:5678',
				},
				query: {},
			});
			const isValid = validateSignatureInRequest(req, secret);
			expect(isValid).toBe(false);
		});

		it('should return false if the url is invalid', () => {
			const req = mock<Request>({
				url: 'invalid-url',
				protocol: 'http',
				headers: {
					host: 'localhost:5678',
				},
				query: {
					[WAITING_TOKEN_QUERY_PARAM]: 'invalid-token',
				},
			});
			const isValid = validateSignatureInRequest(req, secret);
			expect(isValid).toBe(false);
		});

		it('should return true if the signature is valid with other query parameters', () => {
			const url = `${baseUrl}/webhook/abc?param1=value1&param2=value2`;
			const token = generateSignatureToken(url, secret);
			const req = mock<Request>({
				url: `${url}&${WAITING_TOKEN_QUERY_PARAM}=${token}`,
				protocol: 'http',
				headers: {
					host: 'localhost:5678',
				},
				query: {
					param1: 'value1',
					param2: 'value2',
					[WAITING_TOKEN_QUERY_PARAM]: token,
				},
			});
			const isValid = validateSignatureInRequest(req, secret);
			expect(isValid).toBe(true);
		});

		it('should return true if the signature is valid and waitingToken is the first query parameter', () => {
			const url = `${baseUrl}/webhook/abc?${WAITING_TOKEN_QUERY_PARAM}=token&param1=value1&param2=value2`;
			const token = generateSignatureToken(
				`${baseUrl}/webhook/abc?param1=value1&param2=value2`,
				secret,
			);
			const req = mock<Request>({
				url,
				protocol: 'http',
				headers: {
					host: 'localhost:5678',
				},
				query: {
					[WAITING_TOKEN_QUERY_PARAM]: token,
					param1: 'value1',
					param2: 'value2',
				},
			});
			const isValid = validateSignatureInRequest(req, secret);
			expect(isValid).toBe(true);
		});
	});
});
