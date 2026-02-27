import { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';

export const isWebhookHtmlSandboxingDisabled = () => {
	return Container.get(SecurityConfig).disableWebhookHtmlSandboxing;
};

/**
 * Returns the CSP header value that sandboxes the HTML page into a separate origin.
 */
export const getWebhookSandboxCSP = (): string => {
	return 'sandbox allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-scripts allow-top-navigation allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols';
};
