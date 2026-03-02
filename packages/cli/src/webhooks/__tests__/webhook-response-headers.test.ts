import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { WebhookResponseHeaders } from '@/webhooks/webhook-response-headers';

describe('WebhookResponseHeaders', () => {
	describe('set()', () => {
		it('should store and apply valid headers', () => {
			const headers = new WebhookResponseHeaders();
			headers.set('X-Custom', 'value');

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).toHaveBeenCalledWith(new Map([['x-custom', 'value']]));
		});

		it('should silently skip invalid header names containing HTML', () => {
			const headers = new WebhookResponseHeaders();
			headers.set('<img src=x onerror=alert(1)>', 'value');

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).not.toHaveBeenCalled();
		});

		it('should silently skip header names with control characters', () => {
			const headers = new WebhookResponseHeaders();
			headers.set('invalid\x00name', 'value');

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).not.toHaveBeenCalled();
		});

		it('should silently skip invalid header values', () => {
			const headers = new WebhookResponseHeaders();
			headers.set('x-valid-name', 'invalid\x00value');

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).not.toHaveBeenCalled();
		});

		it('should block content-security-policy header', () => {
			const headers = new WebhookResponseHeaders();
			headers.set('Content-Security-Policy', "default-src 'none'");

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).not.toHaveBeenCalled();
		});

		it('should block content-security-policy regardless of case', () => {
			const headers = new WebhookResponseHeaders();
			headers.set('CONTENT-SECURITY-POLICY', "default-src 'none'");

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).not.toHaveBeenCalled();
		});

		it('should lower-case header names', () => {
			const headers = new WebhookResponseHeaders();
			headers.set('X-My-Header', 'test');

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).toHaveBeenCalledWith(new Map([['x-my-header', 'test']]));
		});
	});

	describe('fromObject()', () => {
		it('should create an instance with valid headers from an object', () => {
			const headers = WebhookResponseHeaders.fromObject({
				'x-valid': 'value1',
				'x-also-valid': 'value2',
			});

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).toHaveBeenCalledWith(
				new Map([
					['x-valid', 'value1'],
					['x-also-valid', 'value2'],
				]),
			);
		});

		it('should skip invalid entries and keep valid ones', () => {
			const headers = WebhookResponseHeaders.fromObject({
				'x-valid': 'value',
				'<script>': 'xss',
				'content-security-policy': "default-src 'none'",
			});

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).toHaveBeenCalledTimes(1);
			expect(res.setHeaders).toHaveBeenCalledWith(new Map([['x-valid', 'value']]));
		});

		it('should convert non-string values to strings', () => {
			const headers = WebhookResponseHeaders.fromObject({
				'x-number': 42,
				'x-bool': true,
			});

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).toHaveBeenCalledWith(
				new Map([
					['x-number', '42'],
					['x-bool', 'true'],
				]),
			);
		});
	});

	describe('addFromObject()', () => {
		it('should add valid entries from an object', () => {
			const headers = new WebhookResponseHeaders();
			headers.addFromObject({
				'x-valid': 'value1',
				'x-also-valid': 'value2',
			});

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).toHaveBeenCalledWith(
				new Map([
					['x-valid', 'value1'],
					['x-also-valid', 'value2'],
				]),
			);
		});

		it('should skip invalid entries and keep valid ones', () => {
			const headers = new WebhookResponseHeaders();
			headers.addFromObject({
				'x-valid': 'value',
				'<script>': 'xss',
				'content-security-policy': "default-src 'none'",
			});

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).toHaveBeenCalledTimes(1);
			expect(res.setHeaders).toHaveBeenCalledWith(new Map([['x-valid', 'value']]));
		});

		it('should convert non-string values to strings', () => {
			const headers = new WebhookResponseHeaders();
			headers.addFromObject({
				'x-number': 42,
				'x-bool': true,
			});

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).toHaveBeenCalledWith(
				new Map([
					['x-number', '42'],
					['x-bool', 'true'],
				]),
			);
		});
	});

	describe('addFromNodeHeaders()', () => {
		it('should add valid entries from node response headers', () => {
			const headers = new WebhookResponseHeaders();
			headers.addFromNodeHeaders({
				entries: [
					{ name: 'X-Custom', value: 'test' },
					{ name: 'X-Another', value: 'value' },
				],
			});

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).toHaveBeenCalledWith(
				new Map([
					['x-custom', 'test'],
					['x-another', 'value'],
				]),
			);
		});

		it('should skip invalid entries from node response headers', () => {
			const headers = new WebhookResponseHeaders();
			headers.addFromNodeHeaders({
				entries: [
					{ name: '<img src=x onerror=alert(1)>', value: 'xss' },
					{ name: 'x-valid', value: 'ok' },
				],
			});

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).toHaveBeenCalledTimes(1);
			expect(res.setHeaders).toHaveBeenCalledWith(new Map([['x-valid', 'ok']]));
		});

		it('should handle undefined entries gracefully', () => {
			const headers = new WebhookResponseHeaders();
			headers.addFromNodeHeaders({});

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).not.toHaveBeenCalled();
		});

		it('should block CSP from node response headers', () => {
			const headers = new WebhookResponseHeaders();
			headers.addFromNodeHeaders({
				entries: [{ name: 'Content-Security-Policy', value: "default-src 'unsafe-inline'" }],
			});

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).not.toHaveBeenCalled();
		});
	});

	describe('applyToResponse()', () => {
		it('should be a no-op for an empty instance', () => {
			const headers = new WebhookResponseHeaders();
			const res = mock<Response>();

			headers.applyToResponse(res);

			expect(res.setHeaders).not.toHaveBeenCalled();
		});

		it('should call setHeader for each valid header', () => {
			const headers = new WebhookResponseHeaders();
			headers.set('x-one', '1');
			headers.set('x-two', '2');
			headers.set('x-three', '3');

			const res = mock<Response>();
			headers.applyToResponse(res);

			expect(res.setHeaders).toHaveBeenCalledWith(
				new Map([
					['x-one', '1'],
					['x-two', '2'],
					['x-three', '3'],
				]),
			);
		});
	});
});
