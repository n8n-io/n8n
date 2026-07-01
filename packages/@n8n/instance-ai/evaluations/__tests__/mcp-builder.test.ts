import { readFileSync, rmSync, statSync } from 'fs';

import {
	buildAllowedTools,
	buildPromptFromConversation,
	sanitizeServerName,
	stageLaneMcpConfig,
	tailWorkflowId,
	uniqueProjectScopes,
} from '../cli/mcp-builder';
import type { ConversationTurn } from '../types';

const user = (text: string): ConversationTurn => ({ role: 'user', text });
const assistant = (text: string): ConversationTurn => ({ role: 'assistant', text });

describe('buildPromptFromConversation', () => {
	it('returns the single user turn verbatim', () => {
		expect(buildPromptFromConversation([user('Build a contact form')])).toBe(
			'Build a contact form',
		);
	});

	it('ignores assistant turns when picking the request', () => {
		const prompt = buildPromptFromConversation([user('Build a form'), assistant('Sure!')]);
		expect(prompt).toBe('Build a form');
	});

	it('flattens additional user turns as numbered additive requirements', () => {
		const prompt = buildPromptFromConversation([
			user('Build a form'),
			assistant('ok'),
			user('Email me on submit'),
			user('Store in a data table'),
		]);
		expect(prompt).toContain('Build a form');
		expect(prompt).toContain('Additional details from the user:');
		expect(prompt).toContain('1. Email me on submit');
		expect(prompt).toContain('2. Store in a data table');
		expect(prompt).toContain("I'll set them up later");
	});

	it('trims whitespace and drops empty user turns', () => {
		const prompt = buildPromptFromConversation([user('  Build a form  '), user('   ')]);
		expect(prompt).toBe('Build a form');
	});

	it('falls back to the first turn when there is no user turn', () => {
		expect(buildPromptFromConversation([assistant('only assistant')])).toBe('only assistant');
	});

	it('returns empty string for an empty conversation', () => {
		expect(buildPromptFromConversation([])).toBe('');
	});
});

describe('tailWorkflowId', () => {
	it('extracts a WORKFLOW_ID token', () => {
		expect(tailWorkflowId('done\nWORKFLOW_ID=abc123')).toBe('abc123');
	});

	it('returns the LAST id when several are present', () => {
		expect(tailWorkflowId('WORKFLOW_ID=first\n...\nWORKFLOW_ID=second')).toBe('second');
	});

	it('accepts ids with hyphens and underscores', () => {
		expect(tailWorkflowId('WORKFLOW_ID=wf_9-Ab')).toBe('wf_9-Ab');
	});

	it('returns null when no id is present', () => {
		expect(tailWorkflowId('the model forgot to print it')).toBeNull();
	});
});

describe('sanitizeServerName / buildAllowedTools', () => {
	it('replaces non-alphanumeric characters (except hyphen) with underscore', () => {
		expect(sanitizeServerName('n8n-mcp (instance)')).toBe('n8n-mcp__instance_');
		expect(sanitizeServerName('n8n-local')).toBe('n8n-local');
	});

	it('builds the mcp__ tool allowlist prefix', () => {
		expect(buildAllowedTools('n8n-local')).toEqual(['mcp__n8n-local']);
		expect(buildAllowedTools('n8n-mcp (instance)')).toEqual(['mcp__n8n-mcp__instance_']);
	});
});

describe('uniqueProjectScopes', () => {
	it('drops undefined and deduplicates while preserving order', () => {
		expect(uniqueProjectScopes(['/a', undefined, '/b', '/a', undefined, '/c'])).toEqual([
			'/a',
			'/b',
			'/c',
		]);
	});
});

describe('stageLaneMcpConfig', () => {
	it('writes an http MCP server block with a bearer header and 0600 mode', () => {
		const path = stageLaneMcpConfig({
			serverName: 'n8n-local',
			url: 'http://localhost:5678/mcp-server/http',
			apiKey: 'jwt-token',
		});
		try {
			const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'));
			expect(parsed).toEqual({
				mcpServers: {
					'n8n-local': {
						type: 'http',
						url: 'http://localhost:5678/mcp-server/http',
						headers: { Authorization: 'Bearer jwt-token' },
					},
				},
			});
			// Config carries a bearer token — must not be world-readable.
			expect(statSync(path).mode & 0o777).toBe(0o600);
		} finally {
			rmSync(path, { force: true });
		}
	});

	it('stages unique paths for concurrent lanes', () => {
		const base = { serverName: 'n8n-local', url: 'http://localhost:5678/mcp-server/http' };
		const a = stageLaneMcpConfig({ ...base, apiKey: 'a' });
		const b = stageLaneMcpConfig({ ...base, apiKey: 'b' });
		try {
			expect(a).not.toBe(b);
		} finally {
			rmSync(a, { force: true });
			rmSync(b, { force: true });
		}
	});
});
