import { describe, it, expect } from 'vitest';

import { MCP_INSTANCE_SCOPES } from '@n8n/api-types';
import { i18n } from '@n8n/i18n';

import { getAccessSummary, getClientBrand, isFullAccessGrant } from './clients.utils';

describe('getClientBrand', () => {
	it.each([
		['Claude Code', 'cli'],
		['Claude', 'assistant'],
		['Cursor', 'ide'],
		['Visual Studio Code', 'editor'],
		['Codex CLI', 'cli'],
		['ChatGPT', 'assistant'],
		['Mistral Vibe', 'assistant'],
		['Vibe', 'assistant'],
		['Some Unknown Client', null],
	])('derives the type of %s as %s', (name, type) => {
		expect(getClientBrand(name).type).toBe(type);
	});

	it('resolves a logo for recognized brands and none for unknown clients', () => {
		expect(getClientBrand('Claude Code').icon).not.toBeNull();
		expect(getClientBrand('Cursor').icon).not.toBeNull();
		expect(getClientBrand('Mistral Vibe').icon).not.toBeNull();
		expect(getClientBrand('Some Unknown Client').icon).toBeNull();
	});
});

describe('isFullAccessGrant', () => {
	const nonAgentScopes = MCP_INSTANCE_SCOPES.filter((scope) => !scope.startsWith('agent:'));

	it('treats a grant covering every scope as full access', () => {
		expect(isFullAccessGrant([...MCP_INSTANCE_SCOPES])).toBe(true);
	});

	it('treats an empty or partial grant as not full access', () => {
		expect(isFullAccessGrant([])).toBe(false);
		expect(isFullAccessGrant(['workflow:read'])).toBe(false);
	});

	it('counts a grant as full access when it covers every scope the instance offers', () => {
		expect(isFullAccessGrant(nonAgentScopes, nonAgentScopes)).toBe(true);
	});

	it('still reports missing scopes that the instance does offer', () => {
		expect(isFullAccessGrant(['workflow:read'], nonAgentScopes)).toBe(false);
	});
});

describe('getAccessSummary', () => {
	it('reports a grant with no scopes as no access', () => {
		expect(getAccessSummary(i18n, { scopes: [] })).toBe('No access');
	});

	it('reports a grant covering every offered scope as full access', () => {
		expect(getAccessSummary(i18n, { scopes: [...MCP_INSTANCE_SCOPES] })).toBe('Full access');
		expect(
			getAccessSummary(i18n, { scopes: ['workflow:read', 'execution:read'] }, [
				'workflow:read',
				'execution:read',
			]),
		).toBe('Full access');
	});

	it('lists up to two scope labels verbatim', () => {
		expect(getAccessSummary(i18n, { scopes: ['workflow:read'] })).toBe('List workflows');
		expect(getAccessSummary(i18n, { scopes: ['workflow:read', 'execution:read'] })).toBe(
			'List workflows, Get execution details',
		);
	});

	it('collapses the remaining scopes into a +N overflow', () => {
		expect(
			getAccessSummary(i18n, {
				scopes: ['workflow:read', 'execution:read', 'workflow:write', 'workflow:execute'],
			}),
		).toBe('List workflows, Get execution details +2');
	});

	it('renders unknown scopes verbatim', () => {
		expect(getAccessSummary(i18n, { scopes: ['custom:thing'] })).toBe('custom:thing');
	});
});
