import { describe, it, expect } from 'vitest';

import { MCP_INSTANCE_SCOPES } from '@n8n/api-types';

import { getClientBrand, isFullAccessGrant } from './clients.utils';

describe('getClientBrand', () => {
	it.each([
		['Claude Code', 'cli'],
		['Claude', 'assistant'],
		['Cursor', 'ide'],
		['Visual Studio Code', 'editor'],
		['Codex CLI', 'cli'],
		['ChatGPT', 'assistant'],
		['Some Unknown Client', null],
	])('derives the type of %s as %s', (name, type) => {
		expect(getClientBrand(name).type).toBe(type);
	});

	it('resolves a logo for recognized brands and none for unknown clients', () => {
		expect(getClientBrand('Claude Code').icon).not.toBeNull();
		expect(getClientBrand('Cursor').icon).not.toBeNull();
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
