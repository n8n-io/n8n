import { describe, expect, it } from 'vitest';
import { decorateResourceNames } from './ChatMarkdown.utils';

describe('decorateResourceNames', () => {
	const resources = [{ type: 'workflow', id: 'wf/1', name: 'My Workflow' }];

	it('decorates names and encodes resource ids', () => {
		expect(decorateResourceNames('Open My Workflow', resources)).toBe(
			'Open [My Workflow](n8n-resource://workflow/wf%2F1)',
		);
	});

	it.each([
		'`My Workflow`',
		'```\nMy Workflow\n```',
		'[My Workflow](https://example.com)',
		'[Open My Workflow now](https://example.com/path_(nested))',
		'[My Workflow](n8n-resource://workflow/abc)',
	])('protects code and existing links: %s', (content) => {
		expect(decorateResourceNames(content, resources)).toBe(content);
	});

	it('ignores names shorter than three characters', () => {
		expect(decorateResourceNames('Go AB', [{ type: 'workflow', id: '1', name: 'AB' }])).toBe(
			'Go AB',
		);
	});

	it('replaces the longest name first without nesting links', () => {
		const result = decorateResourceNames('My Workflow My Workflow Extra', [
			...resources,
			{ type: 'workflow', id: 'long', name: 'My Workflow Extra' },
		]);
		expect(result).toBe(
			'[My Workflow](n8n-resource://workflow/wf%2F1) [My Workflow Extra](n8n-resource://workflow/long)',
		);
	});

	it('replaces each occurrence', () => {
		expect(decorateResourceNames('My Workflow, My Workflow!', resources)).toBe(
			'[My Workflow](n8n-resource://workflow/wf%2F1), [My Workflow](n8n-resource://workflow/wf%2F1)!',
		);
	});

	it.each(['[Sales]', '(Sales)', 'Sales+'])('handles non-word characters in %s', (name) => {
		const escaped = name.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
		expect(decorateResourceNames(`Open ${name}!`, [{ type: 'workflow', id: '1', name }])).toBe(
			`Open [${escaped}](n8n-resource://workflow/1)!`,
		);
	});

	it('does not replace partial words or URL path segments', () => {
		const content = 'My Workflows https://example.com/My Workflow';
		expect(decorateResourceNames(content, resources)).toBe(content);
	});

	it('protects generated links with escaped brackets from overlapping names', () => {
		expect(
			decorateResourceNames('[Sales] Report', [
				{ type: 'workflow', id: 'long', name: '[Sales] Report' },
				{ type: 'workflow', id: 'short', name: 'Sales' },
			]),
		).toBe('[\\[Sales\\] Report](n8n-resource://workflow/long)');
	});
});
