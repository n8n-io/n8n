import { describe, it, expect } from 'vitest';

import { EMPTY_OAUTH_CLIENT_FILTERS, filterOAuthClients, getClientBrand } from './clients.utils';
import { createOAuthClient } from './mcp.test.utils';

const NOW = new Date('2025-10-01T00:00:00.000Z').getTime();
const DAY = 24 * 60 * 60 * 1000;

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
});

describe('filterOAuthClients', () => {
	it('returns all clients when no filters are set', () => {
		const clients = [createOAuthClient({ id: 'a' }), createOAuthClient({ id: 'b' })];

		expect(filterOAuthClients(clients, EMPTY_OAUTH_CLIENT_FILTERS, NOW)).toEqual(clients);
	});

	it('matches the client name case-insensitively, ignoring surrounding whitespace', () => {
		const clients = [
			createOAuthClient({ id: 'a', name: 'Claude Code' }),
			createOAuthClient({ id: 'b', name: 'Cursor' }),
		];

		const result = filterOAuthClients(
			clients,
			{ ...EMPTY_OAUTH_CLIENT_FILTERS, search: '  claude ' },
			NOW,
		);

		expect(result.map((client) => client.id)).toEqual(['a']);
	});

	it('buckets ide and editor brands under the IDE type filter', () => {
		const clients = [
			createOAuthClient({ id: 'cursor', name: 'Cursor' }),
			createOAuthClient({ id: 'vscode', name: 'VS Code' }),
			createOAuthClient({ id: 'cli', name: 'Claude Code' }),
		];

		const result = filterOAuthClients(clients, { ...EMPTY_OAUTH_CLIENT_FILTERS, type: 'ide' }, NOW);

		expect(result.map((client) => client.id)).toEqual(['cursor', 'vscode']);
	});

	it('buckets assistant brands under the Web type filter', () => {
		const clients = [
			createOAuthClient({ id: 'chatgpt', name: 'ChatGPT' }),
			createOAuthClient({ id: 'claude', name: 'Claude' }),
			createOAuthClient({ id: 'cursor', name: 'Cursor' }),
		];

		const result = filterOAuthClients(clients, { ...EMPTY_OAUTH_CLIENT_FILTERS, type: 'web' }, NOW);

		expect(result.map((client) => client.id)).toEqual(['chatgpt', 'claude']);
	});

	it('excludes unrecognized clients from every type bucket', () => {
		const clients = [createOAuthClient({ id: 'unknown', name: 'Some Client' })];

		expect(
			filterOAuthClients(clients, { ...EMPTY_OAUTH_CLIENT_FILTERS, type: 'cli' }, NOW),
		).toEqual([]);
	});

	it('narrows by consent owner', () => {
		const clients = [
			createOAuthClient({
				id: 'a',
				owner: { id: 'user-1', firstName: 'A', lastName: 'B', email: 'a@n8n.io' },
			}),
			createOAuthClient({
				id: 'b',
				owner: { id: 'user-2', firstName: 'C', lastName: 'D', email: 'c@n8n.io' },
			}),
			createOAuthClient({ id: 'c' }),
		];

		const result = filterOAuthClients(
			clients,
			{ ...EMPTY_OAUTH_CLIENT_FILTERS, ownerId: 'user-1' },
			NOW,
		);

		expect(result.map((client) => client.id)).toEqual(['a']);
	});

	it.each([
		['last7' as const, ['recent']],
		['last30' as const, ['recent', 'monthOld']],
		['older' as const, ['ancient']],
	])('applies the %s connected bucket', (connected, expected) => {
		const clients = [
			createOAuthClient({ id: 'recent', grantedAt: NOW - 2 * DAY }),
			createOAuthClient({ id: 'monthOld', grantedAt: NOW - 20 * DAY }),
			createOAuthClient({ id: 'ancient', grantedAt: NOW - 60 * DAY }),
		];

		const result = filterOAuthClients(clients, { ...EMPTY_OAUTH_CLIENT_FILTERS, connected }, NOW);

		expect(result.map((client) => client.id)).toEqual(expected);
	});

	it('combines all filter dimensions', () => {
		const clients = [
			createOAuthClient({
				id: 'match',
				name: 'Claude Code',
				grantedAt: NOW - DAY,
				owner: { id: 'user-1', firstName: 'A', lastName: 'B', email: 'a@n8n.io' },
			}),
			createOAuthClient({
				id: 'wrong-owner',
				name: 'Claude Code CI',
				grantedAt: NOW - DAY,
				owner: { id: 'user-2', firstName: 'C', lastName: 'D', email: 'c@n8n.io' },
			}),
			createOAuthClient({
				id: 'too-old',
				name: 'Claude Code Legacy',
				grantedAt: NOW - 90 * DAY,
				owner: { id: 'user-1', firstName: 'A', lastName: 'B', email: 'a@n8n.io' },
			}),
		];

		const result = filterOAuthClients(
			clients,
			{ search: 'claude', type: 'cli', ownerId: 'user-1', connected: 'last7' },
			NOW,
		);

		expect(result.map((client) => client.id)).toEqual(['match']);
	});
});
