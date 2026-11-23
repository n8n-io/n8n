import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';

import SkillWorkflowMentionPicker from '@/features/agents/components/SkillWorkflowMentionPicker.vue';
import { SKILL_WORKFLOW_MENTION_PAGE_SIZE } from '@/features/agents/composables/useSkillWorkflowMentionSearch';

const searchWorkflows = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));
vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({ searchWorkflows }),
}));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key}:${JSON.stringify(options.interpolate)}` : key,
	}),
}));
vi.mock('@n8n/composables/useDebounce', () => ({ getDebounceTime: () => 0 }));

const highlightFirstItem = vi.fn();
const DropdownMenuStub = defineComponent({
	name: 'N8nDropdownMenu',
	props: ['modelValue', 'items', 'loading', 'emptyText', 'searchMode', 'externalFocusTarget'],
	emits: ['update:modelValue', 'select', 'search'],
	methods: { highlightFirstItem },
	template: '<div><slot name="trigger" /><slot name="footer" /></div>',
});

enableAutoUnmount(afterEach);

function workflowPage(count: number) {
	return Array.from({ length: count }, (_, index) => ({ id: `wf${index}`, name: `Flow ${index}` }));
}

function mountPicker(props: Record<string, unknown> = {}) {
	const wrapper = mount(SkillWorkflowMentionPicker, {
		props: { open: true, mode: 'button', ...props },
		global: {
			stubs: {
				N8nDropdownMenu: DropdownMenuStub,
				DropdownMenu: DropdownMenuStub,
				N8nTooltip: { template: '<span><slot /></span>' },
			},
		},
	});
	return { wrapper, menu: () => wrapper.findComponent(DropdownMenuStub) };
}

function workflowItems(items: Array<{ data?: unknown }>) {
	return items.filter((item) => item.data);
}

describe('SkillWorkflowMentionPicker', () => {
	beforeEach(() => {
		searchWorkflows.mockReset();
		highlightFirstItem.mockReset();
		track.mockReset();
	});

	it('lists the workflows of the project under a group label', async () => {
		searchWorkflows.mockResolvedValue([{ id: 'wf1', name: 'Weekly report' }]);
		const { menu } = mountPicker({ projectId: 'p1', projectName: 'Ops' });
		await flushPromises();

		expect(searchWorkflows).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p1' }));
		expect(menu().props('items')).toEqual([
			expect.objectContaining({
				header: true,
				label: 'agents.builder.skills.workflowMentions.groupLabelInProject:{"project":"Ops"}',
			}),
			expect.objectContaining({ id: 'wf1', label: 'Weekly report', disabled: false }),
		]);
	});

	it('uses a neutral group label for a skill without a project', async () => {
		searchWorkflows.mockResolvedValue([{ id: 'wf1', name: 'Weekly report' }]);
		const { menu } = mountPicker();
		await flushPromises();

		expect(menu().props('items')[0]).toEqual(
			expect.objectContaining({ label: 'agents.builder.skills.workflowMentions.groupLabel' }),
		);
	});

	it('highlights the first result, so Enter selects it', async () => {
		searchWorkflows.mockResolvedValue([{ id: 'wf1', name: 'Weekly report' }]);
		mountPicker();
		await flushPromises();

		expect(highlightFirstItem).toHaveBeenCalledTimes(1);
	});

	describe('button mode', () => {
		it('searches in its own search field and shows the @ hint', async () => {
			searchWorkflows.mockResolvedValue([]);
			const { wrapper, menu } = mountPicker();
			await flushPromises();

			menu().vm.$emit('search', 'invoice');
			await flushPromises();

			expect(menu().props('searchMode')).toBe('internal');
			expect(searchWorkflows).toHaveBeenLastCalledWith(
				expect.objectContaining({ query: 'invoice' }),
			);
			expect(wrapper.find('[data-testid="skill-workflow-mention-button"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="skill-workflow-mention-footer"]').text()).toBe(
				'agents.builder.skills.workflowMentions.hint',
			);
		});

		it('disables the workflows that the skill already mentions', async () => {
			searchWorkflows.mockResolvedValue([
				{ id: 'wf1', name: 'Weekly report' },
				{ id: 'wf2', name: 'Archive' },
			]);
			const { menu } = mountPicker({ mentionedWorkflowIds: ['wf1'] });
			await flushPromises();

			expect(workflowItems(menu().props('items'))).toEqual([
				expect.objectContaining({ id: 'wf1', disabled: true }),
				expect.objectContaining({ id: 'wf2', disabled: false }),
			]);
		});
	});

	describe('typed mode', () => {
		it('searches with the text after @ and keeps focus in the editor', async () => {
			searchWorkflows.mockResolvedValue([]);
			const focusTarget = document.createElement('div');
			const { wrapper, menu } = mountPicker({ mode: 'typed', query: 'wee', focusTarget });
			await flushPromises();

			await wrapper.setProps({ query: 'week' });
			await vi.waitFor(() =>
				expect(searchWorkflows).toHaveBeenLastCalledWith(
					expect.objectContaining({ query: 'week' }),
				),
			);
			expect(searchWorkflows).toHaveBeenCalledWith(expect.objectContaining({ query: 'wee' }));
			expect(menu().props('searchMode')).toBe('external');
			expect(menu().props('externalFocusTarget')).toBe(focusTarget);
			expect(wrapper.find('[data-testid="skill-workflow-mention-button"]').exists()).toBe(false);
			expect(wrapper.find('[data-testid="skill-workflow-mention-footer"]').text()).toBe(
				'agents.builder.skills.workflowMentions.keyboardHint',
			);
		});

		it('does not disable workflows that the skill already mentions', async () => {
			searchWorkflows.mockResolvedValue([{ id: 'wf1', name: 'Weekly report' }]);
			const { menu } = mountPicker({ mode: 'typed', mentionedWorkflowIds: ['wf1'] });
			await flushPromises();

			expect(workflowItems(menu().props('items'))).toEqual([
				expect.objectContaining({ id: 'wf1', disabled: false }),
			]);
		});
	});

	it('emits the selected workflow', async () => {
		searchWorkflows.mockResolvedValue([{ id: 'wf1', name: 'Weekly report' }]);
		const { wrapper, menu } = mountPicker();
		await flushPromises();

		menu().vm.$emit('select', 'wf1');

		expect(wrapper.emitted('select')).toEqual([[{ workflowId: 'wf1', name: 'Weekly report' }]]);
	});

	it.each([
		{
			name: 'with the + button in an instance skill',
			props: {},
			payload: { source: 'button', scope: 'instance', project_id: undefined },
		},
		{
			name: 'with @ in a project skill',
			props: { mode: 'typed', projectId: 'p1' },
			payload: { source: 'typed', scope: 'project', project_id: 'p1' },
		},
	])('tracks a workflow added $name', async ({ props, payload }) => {
		searchWorkflows.mockResolvedValue([{ id: 'wf1', name: 'Weekly report' }]);
		const { menu } = mountPicker(props);
		await flushPromises();

		menu().vm.$emit('select', 'wf1');

		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_ADDED_SKILL_WORKFLOW_MENTION,
			payload,
		);
	});

	it('loads the next page from the show more row', async () => {
		searchWorkflows.mockResolvedValue(workflowPage(SKILL_WORKFLOW_MENTION_PAGE_SIZE));
		const { wrapper, menu } = mountPicker();
		await flushPromises();

		expect(menu().props('items').at(-1)).toEqual(
			expect.objectContaining({ id: 'show-more', keepOpen: true }),
		);

		menu().vm.$emit('select', 'show-more');
		await flushPromises();

		expect(searchWorkflows).toHaveBeenLastCalledWith(
			expect.objectContaining({
				options: expect.objectContaining({ skip: SKILL_WORKFLOW_MENTION_PAGE_SIZE }),
			}),
		);
		expect(wrapper.emitted('select')).toBeUndefined();
		expect(track).not.toHaveBeenCalled();
	});

	it('shows an error message when the workflows cannot load', async () => {
		searchWorkflows.mockRejectedValue(new Error('offline'));
		const { menu } = mountPicker();
		await flushPromises();

		expect(menu().props('emptyText')).toBe('agents.builder.skills.workflowMentions.loadError');
	});

	it('does not load workflows while closed', () => {
		mountPicker({ open: false });

		expect(searchWorkflows).not.toHaveBeenCalled();
	});
});
