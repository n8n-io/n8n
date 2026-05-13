import type { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import {
	isWebhookHtmlSandboxingDisabled,
	isFormHtmlSandboxingDisabled,
	getHtmlSandboxCSP,
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

describe('isFormHtmlSandboxingDisabled', () => {
	beforeAll(() => {
		jest.spyOn(Container, 'get').mockReturnValue(securityConfig);
	});
	afterAll(() => {
		jest.restoreAllMocks();
	});

	it('should return false when sandboxing is enabled', () => {
		securityConfig.disableFormHtmlSandboxing = false;
		expect(isFormHtmlSandboxingDisabled()).toBe(false);
	});

	it('should return true when sandboxing is disabled', () => {
		securityConfig.disableFormHtmlSandboxing = true;
		expect(isFormHtmlSandboxingDisabled()).toBe(true);
	});
});

describe('getHtmlSandboxCSP', () => {
	it('should return correct sandbox CSP with base directives', () => {
		const csp = getHtmlSandboxCSP();
		expect(csp).toBe(
			'sandbox allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-scripts allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols',
		);
	});

	it('should not include allow-same-origin', () => {
		const csp = getHtmlSandboxCSP();
		expect(csp).not.toContain('allow-same-origin');
	});

	it('should merge sandbox directives with base CSP when nonce is given', () => {
		securityConfig.contentSecurityPolicy = '{}';
		const csp = getHtmlSandboxCSP('abc123');
		expect(csp).toContain('sandbox allow-downloads');
		expect(csp).toContain("script-src 'nonce-abc123' 'strict-dynamic' 'unsafe-eval'");
		expect(csp).toContain("base-uri 'none'");
	});

	it('should preserve base CSP directives when sandbox is disabled', () => {
		securityConfig.contentSecurityPolicy = '{}';
		const csp = getHtmlSandboxCSP(undefined, false);
		expect(csp).not.toContain('sandbox');
		expect(csp).toContain("object-src 'none'");
		expect(csp).toContain("base-uri 'none'");
	});
});
