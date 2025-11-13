import type { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import {
	isWebhookHtmlSandboxingDisabled,
	getWebhookSandboxCSP,
	isHtmlRenderedContentType,
} from '@/html-sandbox';

const securityConfig = mock<SecurityConfig>();

describe('isWebhookHtmlSandboxingDisabled', () => {
	beforeAll(() => {
		jest.spyOn(Container, 'get').mockReturnValue(securityConfig);
	});
	afterAll(() => {
		jest.restoreAllMocks();
	});

	it('should return false when sandboxing is enabled', () => {
		securityConfig.disableWebhookHtmlSandboxing = false;
		expect(isWebhookHtmlSandboxingDisabled()).toBe(false);
	});

	it('should return true when sandboxing is disabled', () => {
		securityConfig.disableWebhookHtmlSandboxing = true;
		expect(isWebhookHtmlSandboxingDisabled()).toBe(true);
	});
});

describe('isHtmlRenderedContentType', () => {
	it('should return true for text/html content type', () => {
		const contentType = 'text/html';
		expect(isHtmlRenderedContentType(contentType)).toBe(true);
	});

	it('should return true for application/xhtml+xml content type', () => {
		const contentType = 'application/xhtml+xml';
		expect(isHtmlRenderedContentType(contentType)).toBe(true);
	});

	it('should return false for other content types', () => {
		const contentType = 'application/json';
		expect(isHtmlRenderedContentType(contentType)).toBe(false);
	});

	describe('should handle various HTML content types', () => {
		test.each([
			'text/html',
			'TEXT/HTML',
			'text/html; charset=utf-8',
			'text/html; charset=iso-8859-1',
			'application/xhtml+xml',
			'APPLICATION/XHTML+XML',
			'application/xhtml+xml; charset=utf-8',
		])('should return true for %s', (contentType) => {
			expect(isHtmlRenderedContentType(contentType)).toBe(true);
		});
	});

	describe('should handle non-HTML content types', () => {
		test.each([
			'text/plain',
			'application/xml',
			'text/css',
			'application/javascript',
			'image/png',
			'application/pdf',
			'',
			'html',
			'xhtml',
		])('should return false for %s', (contentType) => {
			expect(isHtmlRenderedContentType(contentType)).toBe(false);
		});
	});

	it('should handle edge cases', () => {
		expect(isHtmlRenderedContentType('text/htmlsomething')).toBe(true);
		expect(isHtmlRenderedContentType('application/xhtml+xmlsomething')).toBe(true);
		expect(isHtmlRenderedContentType(' text/html')).toBe(false);
		expect(isHtmlRenderedContentType('text/html ')).toBe(true);
	});
});

describe('getWebhookSandboxCSP', () => {
	it('should return correct CSP sandbox directive', () => {
		const csp = getWebhookSandboxCSP();
		expect(csp).toBe(
			'sandbox allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-scripts allow-top-navigation allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols',
		);
	});

	it('should not include allow-same-origin', () => {
		const csp = getWebhookSandboxCSP();
		expect(csp).not.toContain('allow-same-origin');
	});
});
