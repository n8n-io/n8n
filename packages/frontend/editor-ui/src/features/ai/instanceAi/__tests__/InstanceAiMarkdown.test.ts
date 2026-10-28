import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import { createTestingPinia } from '@pinia/testing';
import InstanceAiMarkdown from '../components/InstanceAiMarkdown.vue';
import type { ThreadRuntime } from '../instanceAi.store';
import { computed } from 'vue';
import { INSTANCE_AI_EMBED_SUBJECT_KEY } from '../embed/instanceAiEmbed.types';

let thread: ThreadRuntime;
const renderComponent = createThreadComponentRenderer(InstanceAiMarkdown, {}, () => thread);

describe('InstanceAiMarkdown with the shared renderer', () => {
	beforeEach(() => {
		createTestingPinia();
		thread = {
			id: 'thread-1',
			resourceNameIndex: new Map(),
			linkableResourceNameIndex: new Map(),
		} as unknown as ThreadRuntime;
	});

	it('renders markdown and filters internal blocks', () => {
		const { container } = renderComponent({
			props: { content: '**Hello** <planning-blueprint>hidden</planning-blueprint>' },
		});
		expect(container.querySelector('strong')?.textContent).toBe('Hello');
		expect(container.textContent).not.toContain('hidden');
	});

	it('decorates linkable resources and uses their project metadata', async () => {
		const resource = {
			type: 'data-table' as const,
			id: 'dt1',
			name: 'Sales Table',
			projectId: 'p1',
		};
		thread.resourceNameIndex.set('sales table', resource);
		thread.linkableResourceNameIndex.set('sales table', resource);
		const { container } = renderComponent({ props: { content: 'Open Sales Table' } });
		await flushPromises();
		const link = container.querySelector('a');
		expect(link?.getAttribute('href')).toBe('/projects/p1/datatables/dt1');
		expect(link?.getAttribute('data-resource-chip')).toBe('data-table');
	});

	it('does not decorate metadata-only resources or streaming text', () => {
		const resource = { type: 'workflow' as const, id: 'wf1', name: 'My Workflow' };
		thread.resourceNameIndex.set('my workflow', resource);
		const { container } = renderComponent({ props: { content: 'My Workflow' } });
		expect(container.querySelector('a')).toBeNull();
	});

	it('passes preview callbacks to the shared resource link', async () => {
		const openWorkflowPreview = vi.fn(() => true);
		const { container } = renderComponent({
			props: { content: '[**Workflow**](n8n-resource://workflow/wf1)' },
			global: { provide: { openWorkflowPreview } },
		});
		await flushPromises();
		expect(container.querySelector('a strong')?.textContent).toBe('Workflow');
		expect(container.querySelector('a')?.getAttribute('href')).toBe('/workflow/wf1');
		const event = new MouseEvent('click', { cancelable: true, button: 0 });
		container.querySelector('a')?.dispatchEvent(event);
		expect(openWorkflowPreview).toHaveBeenCalledWith('wf1');
		expect(event.defaultPrevented).toBe(true);
	});

	it.each([
		'/projects/project-1/agents/agent-1/preview',
		'/projects/project-1/agents/agent-1?openPreview=true',
	])('keeps embedded Test labels and modifier clicks for %s', async (href) => {
		const openAgentChatPreview = vi.fn(() => true);
		const { container } = renderComponent({
			props: { content: `[Preview](${href})` },
			global: { provide: {
				openAgentChatPreview,
				[INSTANCE_AI_EMBED_SUBJECT_KEY]: computed(() => ({
					type: 'agent' as const, id: 'agent-1', projectId: 'project-1',
				})),
			} },
		});
		await flushPromises();
		const link = container.querySelector('a');
		expect(link?.textContent).toBe('Test');
		for (const modifier of [{ metaKey: true }, { ctrlKey: true }]) {
			const event = new MouseEvent('click', { cancelable: true, button: 0, ...modifier });
			link?.dispatchEvent(event);
			expect(event.defaultPrevented).toBe(false);
		}
		expect(openAgentChatPreview).not.toHaveBeenCalled();
	});

	it('passes the artifact Preview target to the shared resource link', async () => {
		const openAgentChatPreview = vi.fn(() => true);
		const { container } = renderComponent({
			props: {
				content:
					'[Preview](/projects/project-1/agents/agent-1/preview?continueSessionId=session-1&source=assistant)',
				agentPreviewTarget: { agentId: 'agent-2', projectId: 'project-2' },
			},
			global: { provide: { openAgentChatPreview } },
		});
		await flushPromises();

		const link = container.querySelector('a');
		if (!link) throw new Error('Expected an agent Preview link');
		expect(link.getAttribute('href')).toBe(
			'/projects/project-2/agents/agent-2?continueSessionId=session-1&source=assistant&openPreview=true',
		);
		const event = new MouseEvent('click', { cancelable: true, button: 0 });
		link.dispatchEvent(event);
		expect(openAgentChatPreview).toHaveBeenCalledExactlyOnceWith('agent-2', 'project-2');
		expect(event.defaultPrevented).toBe(true);
	});

	it('decorates resource names when streaming stops', async () => {
		const resource = { type: 'workflow' as const, id: 'wf1', name: 'My Workflow' };
		thread.linkableResourceNameIndex.set('my workflow', resource);
		const content = 'Open My Workflow';
		const { container, rerender } = renderComponent({ props: { content, streaming: true } });

		expect(container.textContent).toContain(content);
		expect(container.querySelector('a')).toBeNull();

		await rerender({ content, streaming: false });
		await flushPromises();

		expect(container.querySelector('a')?.textContent).toContain('My Workflow');
		expect(container.querySelector('a')?.getAttribute('href')).toBe('/workflow/wf1');
	});

	it('keeps preview click listeners after a same-content render', async () => {
		const openWorkflowPreview = vi.fn(() => true);
		const content = '[Workflow](n8n-resource://workflow/wf1)';
		const { container, rerender } = renderComponent({
			props: { content },
			global: { provide: { openWorkflowPreview } },
		});
		await flushPromises();
		const link = container.querySelector('a');
		if (!link) throw new Error('Expected a workflow link');

		await rerender({ content, streaming: true });
		await flushPromises();

		expect(container.querySelector('a')).toBe(link);
		const event = new MouseEvent('click', { cancelable: true, button: 0 });
		link.dispatchEvent(event);
		expect(openWorkflowPreview).toHaveBeenCalledExactlyOnceWith('wf1');
		expect(event.defaultPrevented).toBe(true);
	});

	it.each(['n8n-resource://agent/agent-1', '/projects/project-1/agents/agent-1'])(
		'keeps the embedded subject icon for %s',
		async (href) => {
			const subject = computed(() => ({
				type: 'agent' as const,
				id: 'agent-1',
				projectId: 'project-1',
			}));
			const { container } = renderComponent({
				props: { content: `[Simple Triggered Assistant](${href})` },
				global: { provide: { [INSTANCE_AI_EMBED_SUBJECT_KEY]: subject } },
			});
			await flushPromises();

			const link = container.querySelector('a');
			expect(link?.getAttribute('data-resource-chip')).toBe('agent');
			expect(link?.getAttribute('href')).toBeTruthy();
			expect(link?.querySelectorAll('svg')).toHaveLength(1);
			expect(link?.textContent).toBe('Simple Triggered Assistant');
		},
	);

	it('keeps code spans and existing links unchanged', () => {
		const resource = { type: 'workflow' as const, id: 'wf1', name: 'My Workflow' };
		thread.linkableResourceNameIndex.set('my workflow', resource);
		const { container } = renderComponent({
			props: { content: '`My Workflow` [My Workflow](https://example.org)' },
		});
		expect(container.querySelector('code')?.textContent).toBe('My Workflow');
		expect(container.querySelectorAll('a')).toHaveLength(1);
		expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.org');
	});
});
