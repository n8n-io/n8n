import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import InstanceAiMarkdown from '../components/InstanceAiMarkdown.vue';
import { useInstanceAiStore } from '../instanceAi.store';
import type { ResourceEntry } from '../useResourceRegistry';

// Stub ChatMarkdownChunk to expose the processed content as plain text
vi.mock('@/features/ai/chatHub/components/ChatMarkdownChunk.vue', () => ({
	default: {
		template: '<div data-test-id="markdown-output">{{ source.content }}</div>',
		props: ['source'],
	},
}));

const renderComponent = createComponentRenderer(InstanceAiMarkdown);

function makeRegistry(
	entries: Array<{ type: string; id: string; name: string; projectId?: string }>,
): Map<string, ResourceEntry> {
	const map = new Map<string, ResourceEntry>();
	for (const e of entries) {
		map.set(e.name.toLowerCase(), e as ResourceEntry);
	}
	return map;
}

describe('InstanceAiMarkdown', () => {
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;

	beforeEach(() => {
		createTestingPinia();
		store = mockedStore(useInstanceAiStore);
	});

	function getProcessedContent(content: string, registry?: Map<string, ResourceEntry>): string {
		if (registry) {
			store.resourceRegistry = registry;
		}
		const { getByTestId } = renderComponent({ props: { content } });
		return getByTestId('markdown-output').textContent ?? '';
	}

	it('should return content unchanged when registry is empty', () => {
		const result = getProcessedContent('Hello world');
		expect(result).toBe('Hello world');
	});

	it('should replace resource name with n8n-resource link', () => {
		const registry = makeRegistry([{ type: 'workflow', id: 'wf-1', name: 'My Workflow' }]);
		const result = getProcessedContent('Check out My Workflow please', registry);
		expect(result).toContain('[My Workflow](n8n-resource://workflow/wf-1)');
	});

	it('should NOT replace names shorter than 3 characters', () => {
		const registry = makeRegistry([{ type: 'workflow', id: 'wf-1', name: 'AB' }]);
		const result = getProcessedContent('Check AB here', registry);
		expect(result).toBe('Check AB here');
	});

	it('should NOT replace names inside backtick code spans', () => {
		const registry = makeRegistry([{ type: 'workflow', id: 'wf-1', name: 'My Workflow' }]);
		const result = getProcessedContent('Use `My Workflow` for this', registry);
		// The name is surrounded by backticks — lookbehind/lookahead should prevent replacement
		expect(result).not.toContain('n8n-resource://');
		expect(result).toContain('`My Workflow`');
	});

	it('should replace longest name first to avoid partial matches', () => {
		const registry = makeRegistry([
			{ type: 'workflow', id: 'wf-1', name: 'Slack' },
			{ type: 'workflow', id: 'wf-2', name: 'Slack Integration' },
		]);
		const result = getProcessedContent('Use the Slack Integration for notifications', registry);
		// "Slack Integration" should be matched as a whole, not "Slack" alone
		expect(result).toContain('[Slack Integration](n8n-resource://workflow/wf-2)');
		// "Slack" alone should NOT be replaced inside the already-replaced link
		expect(result).not.toContain('[Slack](n8n-resource://workflow/wf-1)');
	});

	it('should escape special regex characters in resource names', () => {
		const registry = makeRegistry([{ type: 'workflow', id: 'wf-1', name: 'Test (v2.0)' }]);
		// BUG: \b word boundary fails for names containing non-word characters
		// like parentheses and dots. The regex \bTest \(v2\.0\)\b will never match
		// because \b after ) requires a word-char neighbor, but ) is non-word.
		const result = getProcessedContent('Use Test (v2.0) for this', registry);
		expect(result).toContain('[Test (v2.0)](n8n-resource://workflow/wf-1)');
	});

	it('should replace resource name appearing multiple times', () => {
		const registry = makeRegistry([{ type: 'workflow', id: 'wf-1', name: 'My Workflow' }]);
		const result = getProcessedContent('Open My Workflow and then close My Workflow', registry);
		const matches = result.match(/n8n-resource:\/\/workflow\/wf-1/g);
		expect(matches).toHaveLength(2);
	});

	it('should handle different resource types', () => {
		const registry = makeRegistry([
			{ type: 'credential', id: 'cred-1', name: 'Slack API Key' },
			{ type: 'data-table', id: 'dt-1', name: 'User Data' },
		]);
		const result = getProcessedContent('Connect Slack API Key to User Data', registry);
		expect(result).toContain('n8n-resource://credential/cred-1');
		expect(result).toContain('n8n-resource://data-table/dt-1');
	});

	it('should NOT replace names that are inside existing markdown links', () => {
		const registry = makeRegistry([{ type: 'workflow', id: 'wf-1', name: 'My Workflow' }]);
		const result = getProcessedContent(
			'See [My Workflow](https://example.com) for details',
			registry,
		);
		// The name inside [...] is preceded by [ — lookbehind should block replacement
		expect(result).not.toContain('n8n-resource://');
	});
});
