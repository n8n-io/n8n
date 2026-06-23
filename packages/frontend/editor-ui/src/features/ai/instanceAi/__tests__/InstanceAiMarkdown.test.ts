import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import { createTestingPinia } from '@pinia/testing';
import InstanceAiMarkdown from '../components/InstanceAiMarkdown.vue';
import type { ThreadRuntime } from '../instanceAi.store';
import type { ResourceEntry } from '../useResourceRegistry';

// Stub ChatMarkdownChunk to expose the processed content. v-html mirrors the
// real component (VueMarkdown renders via innerHTML): plain text stays plain
// text for the decoration assertions, HTML content produces real anchors for
// the link-enhancement tests, and unchanged content leaves the DOM untouched
// across re-renders — exactly like production.
vi.mock('@/features/ai/chatHub/components/ChatMarkdownChunk.vue', () => ({
	default: {
		template:
			'<div data-test-id="markdown-output" :data-source-type="source.type" v-html="source.type === \'text\' ? source.content : source.command?.title"></div>',
		props: ['source'],
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

	describe('streaming deferral', () => {
		const registry = () => makeRegistry([{ type: 'workflow', id: 'wf-1', name: 'My Workflow' }]);
		const content = 'Check out My Workflow please';

		it('should render raw content without decoration while streaming', () => {
			thread.resourceNameIndex = registry();
			const { getByTestId } = renderComponent({ props: { content, streaming: true } });

			expect(getByTestId('markdown-output').textContent).toBe(content);
		});

		it('should apply decoration when the block settles (streaming flips false)', async () => {
			thread.resourceNameIndex = registry();
			const { getByTestId, rerender } = renderComponent({ props: { content, streaming: true } });

			expect(getByTestId('markdown-output').textContent).not.toContain('n8n-resource://');

			await rerender({ content, streaming: false });

			expect(getByTestId('markdown-output').textContent).toContain(
				'[My Workflow](n8n-resource://workflow/wf-1)',
			);
		});

		it('should decorate immediately when streaming is not set (history-loaded messages)', () => {
			thread.resourceNameIndex = registry();
			const { getByTestId } = renderComponent({ props: { content } });

			expect(getByTestId('markdown-output').textContent).toContain(
				'[My Workflow](n8n-resource://workflow/wf-1)',
			);
		});
	});

	describe('resource chip clicks', () => {
		// Pre-rendered anchor (as markdown-it would emit for a decorated link);
		// the empty registry keeps decorateResourceNames a no-op so the rendered
		// HTML is stable across re-renders.
		const content = '<a href="n8n-resource://workflow/wf-1">Invoice Processing Pipeline</a>';

		function renderWithPreview(openWorkflowPreview: (id: string) => boolean) {
			const utils = renderComponent({
				props: { content },
				global: { provide: { openWorkflowPreview } },
			});
			const link = utils.getByTestId('markdown-output').querySelector('a');
			if (!link) throw new Error('expected enhanced anchor');
			return { ...utils, link };
		}

		function clickEvent(init: MouseEventInit = {}): MouseEvent {
			return new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
		}

		it('should enhance the anchor into a resource chip', () => {
			const { link } = renderWithPreview(vi.fn(() => true));

			expect(link.dataset.resourceChip).toBe('workflow');
			expect(link.dataset.resourceId).toBe('wf-1');
			expect(link.getAttribute('href')).toBe('/workflow/wf-1');
			expect(link.target).toBe('_blank');
		});

		it('should open the canvas preview on left-click and suppress navigation', () => {
			const openWorkflowPreview = vi.fn(() => true);
			const { link } = renderWithPreview(openWorkflowPreview);

			const event = clickEvent();
			link.dispatchEvent(event);

			expect(openWorkflowPreview).toHaveBeenCalledExactlyOnceWith('wf-1');
			expect(event.defaultPrevented).toBe(true);
		});

		it('should still open the preview after a re-render that leaves the DOM untouched', async () => {
			// Regression: per-link listeners were stripped on same-content
			// re-renders (cleanup removed them, the "already enhanced" skip never
			// re-attached), silently downgrading chips to plain new-tab links.
			const openWorkflowPreview = vi.fn(() => true);
			const { link, rerender } = renderWithPreview(openWorkflowPreview);

			// streaming flip re-renders the component with identical content
			// (empty registry → decoration is a no-op), so the anchor survives.
			await rerender({ content, streaming: true });

			const event = clickEvent();
			link.dispatchEvent(event);

			expect(openWorkflowPreview).toHaveBeenCalledExactlyOnceWith('wf-1');
			expect(event.defaultPrevented).toBe(true);
		});

		it('should let the browser handle Cmd/Ctrl+click', () => {
			const openWorkflowPreview = vi.fn(() => true);
			const { link } = renderWithPreview(openWorkflowPreview);

			// Absorb the unprevented click after it bubbles past the component so
			// jsdom does not attempt a real navigation.
			document.addEventListener('click', (e) => e.preventDefault(), { once: true });
			link.dispatchEvent(clickEvent({ metaKey: true }));

			expect(openWorkflowPreview).not.toHaveBeenCalled();
		});
	});
});
