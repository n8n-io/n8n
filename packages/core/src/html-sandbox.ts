import { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

const buildCspHeader = (directives: Record<string, string[]>) =>
	Object.entries(directives)
		.map(([directive, values]) => `${directive} ${values.join(' ')}`)
		.join('; ');

const normalizeCspDirectives = (directives: Record<string, Iterable<string>> | undefined) => {
	const normalized: Record<string, string[]> = {};
	if (!directives) return normalized;

	for (const [directive, values] of Object.entries(directives)) {
		normalized[directive] = Array.isArray(values)
			? [...values]
			: Array.from(values as Iterable<string>);
	}

	return normalized;
};

const getDefaultBaseCspDirectives = (nonce?: string): Record<string, string[]> => {
	const directives: Record<string, string[]> = {
		'object-src': ["'none'"],
		'base-uri': ["'none'"],
	};

	if (nonce) {
		directives['script-src'] = [`'nonce-${nonce}'`, "'strict-dynamic'", "'unsafe-eval'"];
	}

	return directives;
};

export const getCspHeaderName = (reportOnly = false) =>
	reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

export const getBaseCspDirectives = (nonce?: string) => {
	const rawContentSecurityPolicy = Container.get(SecurityConfig).contentSecurityPolicy;
	const rawDirectives =
		typeof rawContentSecurityPolicy === 'string' && rawContentSecurityPolicy.trim().length > 0
			? jsonParse(rawContentSecurityPolicy, {
					errorMessage: 'The contentSecurityPolicy is not valid JSON.',
				})
			: {};
	const directives = normalizeCspDirectives(
		rawDirectives as Record<string, Iterable<string>> | undefined,
	);

	if (Object.keys(directives).length === 0) {
		return getDefaultBaseCspDirectives(nonce);
	}

	if (nonce && !directives['script-src']) {
		directives['script-src'] = [`'nonce-${nonce}'`, "'strict-dynamic'", "'unsafe-eval'"];
	}

	return directives;
};

export const isWebhookHtmlSandboxingDisabled = () => {
	return Container.get(SecurityConfig).disableWebhookHtmlSandboxing;
};

export const isFormHtmlSandboxingDisabled = () => {
	return Container.get(SecurityConfig).disableFormHtmlSandboxing;
};

export const getHtmlSandboxCspDirectives = (includeSandbox = true): Record<string, string[]> => {
	if (!includeSandbox) {
		return {};
	}

	return {
		sandbox: [
			'allow-downloads',
			'allow-forms',
			'allow-modals',
			'allow-orientation-lock',
			'allow-pointer-lock',
			'allow-popups',
			'allow-popups-to-escape-sandbox',
			'allow-presentation',
			'allow-scripts',
			'allow-top-navigation-by-user-activation',
			'allow-top-navigation-to-custom-protocols',
		],
	};
};

const mergeUniqueValues = (existing: string[], additions: string[]) => [
	...existing,
	...additions.filter((value) => !existing.includes(value)),
];

export const mergeCspDirectives = (
	base: Record<string, string[]>,
	additional: Record<string, string[]>,
) => {
	const merged: Record<string, string[]> = { ...base };

	for (const [directive, values] of Object.entries(additional)) {
		merged[directive] = merged[directive]
			? mergeUniqueValues(merged[directive], values)
			: [...values];
	}

	return merged;
};

export const getHtmlSandboxCSP = (nonce?: string, includeSandbox = true): string =>
	includeSandbox && !nonce
		? buildCspHeader(getHtmlSandboxCspDirectives(includeSandbox))
		: buildCspHeader(
				mergeCspDirectives(
					getHtmlSandboxCspDirectives(includeSandbox),
					getBaseCspDirectives(nonce),
				),
			);
