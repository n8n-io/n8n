import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import { createTestingPinia } from '@pinia/testing';
import InstanceAiMarkdown from '../components/InstanceAiMarkdown.vue';
import type { ThreadRuntime } from '../instanceAi.store';
import { computed } from 'vue';
import { INSTANCE_AI_EMBED_SUBJECT_KEY } from '../embed/instanceAiEmbed.types';
import { createArtifactTestRouter } from './artifactTestRouter';

let thread: ThreadRuntime;
const renderComponent = createThreadComponentRenderer(
	InstanceAiMarkdown,
	{ global: { plugins: [createArtifactTestRouter()] } },
	() => thread,
);

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
			global: {
				provide: {
					openAgentChatPreview,
					[INSTANCE_AI_EMBED_SUBJECT_KEY]: computed(() => ({
						type: 'agent' as const,
						id: 'agent-1',
						projectId: 'project-1',
					})),
				},
			},
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

	it('enhances app links and opens the app preview on left-click', async () => {
		const resource = {
			type: 'app' as const,
			id: 'app-1',
			name: 'Order Tracker',
			projectId: 'project-1',
		};
		thread.resourceNameIndex.set('order tracker', resource);
		const openAppPreview = vi.fn(() => true);
		const { container } = renderComponent({
			props: { content: '[Order Tracker](n8n-resource://app/app-1)' },
			global: { provide: { openAppPreview } },
		});
		await flushPromises();

		const link = container.querySelector('a');
		expect(link?.getAttribute('data-resource-chip')).toBe('app');
		expect(link?.getAttribute('href')).toBe('/projects/project-1/apps/app-1');

		const event = new MouseEvent('click', { cancelable: true, button: 0 });
		link?.dispatchEvent(event);
		expect(openAppPreview).toHaveBeenCalledExactlyOnceWith('app-1');
		expect(event.defaultPrevented).toBe(true);
	});

	it('enhances skill links and opens the skill preview on left-click', async () => {
		const openSkillPreview = vi.fn(() => true);
		const { container } = renderComponent({
			props: { content: '[Draft Email](n8n-resource://skill/skill-1)' },
			global: { provide: { openSkillPreview } },
		});
		await flushPromises();

		const link = container.querySelector('a');
		expect(link?.getAttribute('data-resource-chip')).toBe('skill');

		const event = new MouseEvent('click', { cancelable: true, button: 0 });
		link?.dispatchEvent(event);
		expect(openSkillPreview).toHaveBeenCalledExactlyOnceWith('skill-1');
		expect(event.defaultPrevented).toBe(true);
	});

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

	describe('links with a router base', () => {
		async function renderWithBase(
			content: string,
			{
				base = '/n8n/',
				provide = {},
			}: { base?: string; provide?: Record<string | symbol, unknown> } = {},
		) {
			const { container } = renderComponent({
				props: { content },
				global: { plugins: [createArtifactTestRouter(base)], provide },
			});
			await flushPromises();
			return container;
		}

		it('resolves resource chips with the base', async () => {
			thread.resourceNameIndex.set('credential', {
				type: 'credential',
				id: 'cred-1',
				name: 'Credential',
				projectId: 'project-1',
			});

			const links = (
				await renderWithBase(
					'[Credential](n8n-resource://credential/cred-1) ' +
						'[Skill](n8n-resource://skill/skill%201%26x)',
				)
			).querySelectorAll('a');

			expect(links[0].getAttribute('href')).toBe('/n8n/projects/project-1/credentials/cred-1');
			expect(links[1].getAttribute('href')).toBe(
				'/n8n/settings/context/skills?skillId=skill+1%26x',
			);
			expect(links[1].dataset.resourceId).toBe('skill 1&x');
		});

		it.each([
			{ base: '/n8n/', href: '/workflow/wf-1' },
			{ base: '/n8n/', href: '/n8n/workflow/wf-1' },
			{ base: '/workflow/', href: '/workflow/wf-1' },
			{ base: '/workflow/', href: '/workflow/workflow/wf-1' },
		])('adds the base $base once to the internal link $href', async ({ base, href }) => {
			const query = '?tab=a%20b&x=1+2#node';
			const link = (
				await renderWithBase(`[Workflow](${href}${query})`, {
					base,
				})
			).querySelector('a');

			expect(link?.getAttribute('href')).toBe(`${base}workflow/wf-1${query}`);
			expect(link?.dataset.resourceChip).toBe('workflow');
			expect(link?.target).toBe('_blank');
		});

		it.each([
			'/workflow/settings/context/skills?skillId=skill%201&tab=a+b#details',
			'/workflow/settings/personal?tab=a%20b#details',
		])('keeps the prefixed Settings link %s unchanged', async (path) => {
			const hrefs = [path, `${window.location.origin}${path}`];
			const links = (
				await renderWithBase(hrefs.map((href) => `[Settings](${href})`).join(' '), {
					base: '/workflow/',
				})
			).querySelectorAll('a');

			expect(links).toHaveLength(hrefs.length);
			links.forEach((link, index) => {
				expect(link.getAttribute('href')).toBe(hrefs[index]);
				expect(link.dataset.resourceChip).toBeUndefined();
			});
		});

		it('leaves unrecognized and cross-origin links unchanged', async () => {
			const links = (
				await renderWithBase(
					'[Unknown](/n8n/unknown-page) ' + '[Other site](https://example.com/workflow/wf-1)',
				)
			).querySelectorAll('a');

			expect(links[0].getAttribute('href')).toBe('/n8n/unknown-page');
			expect(links[1].getAttribute('href')).toBe('https://example.com/workflow/wf-1');
			expect(links[0].dataset.resourceChip).toBeUndefined();
			expect(links[1].dataset.resourceChip).toBeUndefined();
		});

		it.each(['credentials', 'credentials/cred-1', 'datatables'])(
			'keeps the home route for %s when the base is /home/',
			async (resourcePath) => {
				const path = `/home/${resourcePath}?tab=details#item`;
				const links = (
					await renderWithBase(`[Resource](${path}) [Based resource](/home${path})`, {
						base: '/home/',
					})
				).querySelectorAll('a');

				expect(links).toHaveLength(2);
				for (const link of links) {
					expect(link.getAttribute('href')).toBe(`/home${path}`);
				}
			},
		);

		it.each([
			{ base: '/n8n/', href: '/projects/project-1/agents/agent-1/preview' },
			{ base: '/n8n/', href: '/n8n/projects/project-1/agents/agent-1?openPreview=true' },
			{ base: '/projects/', href: '/projects/project-1/agents/agent-1/preview' },
			{ base: '/projects/', href: '/projects/projects/project-1/agents/agent-1/preview' },
		])('opens the agent Preview link $href under the base $base', async ({ base, href }) => {
			const openAgentChatPreview = vi.fn(() => true);
			const link = (
				await renderWithBase(`[Preview](${href})`, {
					base,
					provide: { openAgentChatPreview },
				})
			).querySelector('a');
			if (!link) throw new Error('expected Preview anchor');

			expect(link.getAttribute('href')).toBe(
				`${base}projects/project-1/agents/agent-1?openPreview=true`,
			);
			const event = new MouseEvent('click', { bubbles: true, cancelable: true });
			link.dispatchEvent(event);

			expect(openAgentChatPreview).toHaveBeenCalledExactlyOnceWith('agent-1', 'project-1');
			expect(event.defaultPrevented).toBe(true);
		});

		it('keeps a prefixed link to the subject agent', async () => {
			const output = await renderWithBase(
				'[Subject Agent](/n8n/projects/project-1/agents/agent-1)',
				{
					provide: {
						[INSTANCE_AI_EMBED_SUBJECT_KEY as symbol]: computed(() => ({
							type: 'agent',
							id: 'agent-1',
							projectId: 'project-1',
						})),
					},
				},
			);

			expect(output.querySelector('a')?.getAttribute('href')).toBe(
				'/n8n/projects/project-1/agents/agent-1',
			);
			expect(output.textContent?.trim()).toBe('Subject Agent');
		});
	});
});
