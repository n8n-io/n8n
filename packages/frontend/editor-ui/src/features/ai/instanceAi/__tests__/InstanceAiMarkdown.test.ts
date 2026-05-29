import { fireEvent } from '@testing-library/vue';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import { createTestingPinia } from '@pinia/testing';
import InstanceAiMarkdown from '../components/InstanceAiMarkdown.vue';
import type { ThreadRuntime } from '../instanceAi.store';
import type { ResourceEntry } from '../useResourceRegistry';

vi.mock('../components/InstanceAiMarkdownChunk.vue', () => ({
	default: {
		props: ['source'],
		computed: {
			markdownLink(): { text: string; href: string } | undefined {
				const source = (this as unknown as { source: { type: string; content?: string } }).source;
				if (source.type !== 'text' || !source.content) return undefined;
				const match = /\[([^\]]+)\]\(([^)]+)\)/.exec(source.content);
				return match ? { text: match[1], href: match[2] } : undefined;
			},
		},
		template: `
			<div>
				<div data-test-id="markdown-output" :data-source-type="source.type">{{ source.type === "text" ? source.content : source.command?.title }}</div>
				<a v-if="markdownLink" :href="markdownLink.href">{{ markdownLink.text }}</a>
			</div>
		`,
	},
}));

let thread: ThreadRuntime;
const renderComponent = createThreadComponentRenderer(InstanceAiMarkdown, {}, () => thread);

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
	beforeEach(() => {
		createTestingPinia();
		thread = {
			id: 'thread-1',
			resourceNameIndex: new Map<string, ResourceEntry>(),
		} as unknown as ThreadRuntime;
	});

	function getProcessedContent(content: string, registry?: Map<string, ResourceEntry>): string {
		if (registry) {
			thread.resourceNameIndex = registry;
		}
		const { getByTestId } = renderComponent({ props: { content } });
		return getByTestId('markdown-output').textContent ?? '';
	}

	it('should return content unchanged when registry is empty', () => {
		const result = getProcessedContent('Hello world');
		expect(result).toBe('Hello world');
	});

	it('should parse artifact commands instead of exposing raw command markup', () => {
		const { getAllByTestId } = renderComponent({
			props: {
				content: `Summary first.
<command:artifact-create>
<title>Workflow audit</title>
<type>md</type>
<content># Full audit</content>
</command:artifact-create>`,
			},
		});
		const chunks = getAllByTestId('markdown-output');

		expect(chunks.map((chunk) => chunk.getAttribute('data-source-type'))).toEqual([
			'text',
			'artifact-create',
		]);
		expect(chunks[0]).toHaveTextContent('Summary first.');
		expect(chunks[1]).toHaveTextContent('Workflow audit');
		expect(chunks.map((chunk) => chunk.textContent).join('')).not.toContain(
			'<command:artifact-create>',
		);
	});

	it('should only decorate parsed text chunks, not artifact command content', () => {
		thread.resourceNameIndex = makeRegistry([
			{ type: 'workflow', id: 'wf-1', name: 'My Workflow' },
		]);

		const { getAllByTestId } = renderComponent({
			props: {
				content: `See My Workflow.
<command:artifact-create>
<title>My Workflow audit</title>
<type>md</type>
<content># My Workflow</content>
</command:artifact-create>`,
			},
		});
		const chunks = getAllByTestId('markdown-output');

		expect(chunks[0]).toHaveTextContent('[My Workflow](n8n-resource://workflow/wf-1)');
		expect(chunks[1]).toHaveTextContent('My Workflow audit');
		expect(chunks[1]).not.toHaveTextContent('n8n-resource://workflow/wf-1');
	});

	it('should strip internal blocks before rendering markdown chunks', () => {
		const result = getProcessedContent(
			'Visible summary.\n<planning-blueprint>{"items":[]}</planning-blueprint>',
		);

		expect(result).toBe('Visible summary.');
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

	it('should escape markdown link text and encode resource ids', () => {
		const registry = makeRegistry([{ type: 'workflow', id: 'wf/1', name: 'Name [prod]' }]);
		const result = getProcessedContent('Open Name [prod] now', registry);
		expect(result).toContain('[Name \\[prod\\]](n8n-resource://workflow/wf%2F1)');
	});

	it('should not replace overlapping names inside generated links with escaped link text', () => {
		const registry = makeRegistry([
			{ type: 'workflow', id: 'wf-full', name: 'Name [prod]' },
			{ type: 'workflow', id: 'wf-name', name: 'Name' },
			{ type: 'workflow', id: 'wf-prod', name: 'prod' },
		]);

		const result = getProcessedContent('Open Name [prod] now', registry);

		expect(result).toBe('Open [Name \\[prod\\]](n8n-resource://workflow/wf-full) now');
		expect(result).not.toContain('wf-name');
		expect(result).not.toContain('wf-prod');
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
		expect(result).not.toContain('n8n-resource://');
	});

	it('should NOT replace names inside longer existing markdown link text', () => {
		const registry = makeRegistry([{ type: 'workflow', id: 'wf-1', name: 'My Workflow' }]);
		const result = getProcessedContent(
			'See [the My Workflow docs](https://example.com) for details',
			registry,
		);
		expect(result).toContain('[the My Workflow docs](https://example.com)');
		expect(result).not.toContain('n8n-resource://');
	});

	it('keeps resource preview click handlers after component updates', async () => {
		thread.resourceNameIndex = makeRegistry([
			{ type: 'workflow', id: 'wf-1', name: 'My Workflow' },
		]);
		const openWorkflowPreview = vi.fn(() => true);
		const { container, rerender } = renderComponent({
			props: { content: 'Open My Workflow' },
			global: {
				provide: { openWorkflowPreview },
			},
		});

		const firstLink = container.querySelector('a');
		expect(firstLink).not.toBeNull();
		await fireEvent.click(firstLink as HTMLAnchorElement);

		const removeListenerSpy = vi.spyOn(HTMLAnchorElement.prototype, 'removeEventListener');
		await rerender({ content: 'Open My Workflow' });
		const updatedLink = container.querySelector('a');
		expect(updatedLink).not.toBeNull();
		expect(updatedLink?.querySelectorAll('svg')).toHaveLength(1);
		expect(removeListenerSpy).not.toHaveBeenCalled();
		removeListenerSpy.mockRestore();
		await fireEvent.click(updatedLink as HTMLAnchorElement);

		expect(openWorkflowPreview).toHaveBeenCalledTimes(2);
		expect(openWorkflowPreview).toHaveBeenCalledWith('wf-1');
	});

	it('opens inline workflow preview for standard workflow route links', async () => {
		const openWorkflowPreview = vi.fn(() => true);
		const { container } = renderComponent({
			props: { content: 'Open [workflow](/workflow/wf-1)' },
			global: {
				provide: { openWorkflowPreview },
			},
		});

		const link = container.querySelector('a');
		expect(link).not.toBeNull();
		await fireEvent.click(link as HTMLAnchorElement);

		expect(link?.dataset.resourceId).toBe('wf-1');
		expect(openWorkflowPreview).toHaveBeenCalledWith('wf-1');
	});

	it('opens inline data-table preview for standard project data-table route links', async () => {
		const openDataTablePreview = vi.fn(() => true);
		const { container } = renderComponent({
			props: { content: 'Open [table](/projects/project-1/datatables/table-1)' },
			global: {
				provide: { openDataTablePreview },
			},
		});

		const link = container.querySelector('a');
		expect(link).not.toBeNull();
		await fireEvent.click(link as HTMLAnchorElement);

		expect(link?.dataset.resourceId).toBe('table-1');
		expect(link?.dataset.resourceProjectId).toBe('project-1');
		expect(openDataTablePreview).toHaveBeenCalledWith('table-1', 'project-1');
	});
});
