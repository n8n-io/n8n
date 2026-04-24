import type { SearchableNodeDescription } from '../../types';
import { formatNodeCatalogLine } from '../sandbox-setup';

describe('formatNodeCatalogLine', () => {
	it('should format a basic node with a string version', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.httpRequest',
			displayName: 'HTTP Request',
			description: 'Makes an HTTP request and returns the response data',
			version: 1,
			inputs: ['main'],
			outputs: ['main'],
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe(
			'n8n-nodes-base.httpRequest | HTTP Request | Makes an HTTP request and returns the response data | v1',
		);
	});

	it('should pick the last element when version is an array', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.slack',
			displayName: 'Slack',
			description: 'Send messages to Slack',
			version: [1, 2, 3],
			inputs: ['main'],
			outputs: ['main'],
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe('n8n-nodes-base.slack | Slack | Send messages to Slack | v3');
	});

	it('should append aliases when codex.alias is present and non-empty', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.gmail',
			displayName: 'Gmail',
			description: 'Send and receive emails via Gmail',
			version: 2,
			inputs: ['main'],
			outputs: ['main'],
			codex: { alias: ['email', 'google mail'] },
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe(
			'n8n-nodes-base.gmail | Gmail | Send and receive emails via Gmail | v2 | aliases: email, google mail',
		);
	});

	it('should not append aliases when codex.alias is an empty array', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.set',
			displayName: 'Set',
			description: 'Sets values on items',
			version: 1,
			inputs: ['main'],
			outputs: ['main'],
			codex: { alias: [] },
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe('n8n-nodes-base.set | Set | Sets values on items | v1');
	});

	it('should not append aliases when codex is present but alias is undefined', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.noOp',
			displayName: 'No Operation',
			description: 'Does nothing',
			version: 1,
			inputs: ['main'],
			outputs: ['main'],
			codex: {},
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe('n8n-nodes-base.noOp | No Operation | Does nothing | v1');
	});

	it('should handle pipe characters in description (documents current behavior)', () => {
		// The pipe character in the description is not escaped, which means
		// the catalog line becomes ambiguous when parsed by splitting on " | ".
		// This test documents the current behavior.
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.ifNode',
			displayName: 'IF',
			description: 'Route items based on true | false condition',
			version: 1,
			inputs: ['main'],
			outputs: ['main'],
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe(
			'n8n-nodes-base.ifNode | IF | Route items based on true | false condition | v1',
		);

		// Splitting on ' | ' yields 5 parts instead of 4 due to unescaped pipe in description
		const parts = result.split(' | ');
		expect(parts).toHaveLength(5);
	});

	it('should handle a single-element version array', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.code',
			displayName: 'Code',
			description: 'Run custom JavaScript code',
			version: [2],
			inputs: ['main'],
			outputs: ['main'],
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe('n8n-nodes-base.code | Code | Run custom JavaScript code | v2');
	});
});
