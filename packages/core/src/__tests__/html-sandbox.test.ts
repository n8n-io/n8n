import type { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { isWebhookHtmlSandboxingDisabled, getWebhookSandboxCSP } from '@/html-sandbox';

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
