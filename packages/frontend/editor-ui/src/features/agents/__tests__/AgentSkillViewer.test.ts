import { mount } from '@vue/test-utils';
import { defineComponent, h, onMounted } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
} from '@n8n/api-types';

import AgentSkillViewer from '../components/AgentSkillViewer.vue';
import { saveAs } from 'file-saver';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) => {
			if (
				key === 'agents.builder.skills.instructions.characterCount' ||
				key === 'agents.builder.skills.references.characterCount'
			) {
				return `${options?.interpolate?.count} / ${options?.interpolate?.max} characters`;
			}
			if (key === 'agents.builder.skills.references.maxCount') {
				return `Skills can have up to ${options?.interpolate?.max} reference files.`;
			}
			return key;
		},
	}),
}));

const N8nFormInputStub = defineComponent({
	name: 'N8nFormInput',
	props: ['modelValue', 'label', 'disabled'],
	emits: ['update:model-value', 'validate'],
	setup(props, { emit, attrs }) {
		onMounted(() => emit('validate', true));
		return () =>
			h('label', [
				props.label,
				h('input', {
					...attrs,
					value: props.modelValue,
					disabled: props.disabled,
					onInput: (event: Event) =>
						emit('update:model-value', (event.target as HTMLInputElement).value),
				}),
			]);
	},
});

describe('AgentSkillViewer', () => {
	it('shows script files as plain text and offers binary assets for download', async () => {
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
				references: [
					{ path: 'scripts/example.js', content: 'const label = "<b>Example</b>";' },
					{ path: 'assets/logo.png', content: 'AP8K', isBinary: true },
				],
			},
			selectedPath: 'scripts/example.js',
		});

		expect(wrapper.get('pre').text()).toBe('const label = "<b>Example</b>";');
		await wrapper.setProps({ selectedPath: 'assets/logo.png' });
		expect(wrapper.text()).not.toContain('AP8K');
		await wrapper.get('button').trigger('click');
		expect(saveAs).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'logo.png', size: 3 }),
			'logo.png',
		);
	});

	it('renames the selected reference without changing its directory', async () => {
		const wrapper = mountViewer({
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
				references: [
					{
						path: 'references/guide.md',
						content: '# Guide',
					},
				],
			},
			selectedPath: 'references/guide.md',
		});

		const input = wrapper.find<HTMLInputElement>(
			'[data-testid="agent-skill-reference-name-input"] input',
		);
		expect(input.element.value).toBe('guide');

		await input.setValue('overview');

		expect(wrapper.emitted('update:skill')?.at(-1)).toEqual([
			{
				references: [
					{
						path: 'references/overview.md',
						content: '# Guide',
					},
				],
			},
		]);
		expect(wrapper.emitted('select:path')?.at(-1)).toEqual(['references/overview.md']);
	});

	it('does not rename references to invalid or duplicate file names', async () => {
		const wrapper = mountViewer({
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
				references: [
					{
						path: 'references/guide.md',
						content: '# Guide',
					},
					{
						path: 'references/overview.md',
						content: '# Overview',
					},
				],
			},
			selectedPath: 'references/guide.md',
		});

		const input = wrapper.find<HTMLInputElement>(
			'[data-testid="agent-skill-reference-name-input"] input',
		);
		const initialUpdateCount = wrapper.emitted('update:skill')?.length ?? 0;

		await input.setValue('../bad');
		await input.setValue('overview');

		expect(wrapper.emitted('update:skill')?.length ?? 0).toBe(initialUpdateCount);
		expect(wrapper.emitted('select:path')).toBeUndefined();
	});

	it('shows a read-only skill as text, without form fields', () => {
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: 'Check the SLA first.',
				references: [{ path: 'references/labels.md', content: 'Use needs-repro.' }],
			},
		});

		expect(wrapper.find('[data-testid="agent-skill-description-text"]').text()).toBe(
			'Use for triage',
		);
		expect(wrapper.find('[data-testid="agent-skill-instructions-text"]').text()).toContain(
			'Check the SLA first.',
		);
		expect(wrapper.find('[data-testid="agent-skill-description-input"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-skill-instructions-editor"]').exists()).toBe(false);
		expect(wrapper.text()).not.toContain('characters');
	});

	it('shows the task lists of a read-only skill as disabled checkboxes', () => {
		const wrapper = mountViewer({
			readOnly: true,
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: '- [ ] Check the SLA',
			},
		});

		const checkbox = wrapper.find('[data-testid="agent-skill-instructions-text"] input');
		expect(checkbox.attributes('type')).toBe('checkbox');
		expect(checkbox.attributes('disabled')).toBeDefined();
	});

	it('shows a read-only reference as text', () => {
		const wrapper = mountViewer({
			readOnly: true,
			selectedPath: 'references/labels.md',
			skill: {
				name: 'Triage',
				description: 'Use for triage',
				instructions: 'Check the SLA first.',
				references: [{ path: 'references/labels.md', content: 'Use needs-repro.' }],
			},
		});

		expect(wrapper.find('[data-testid="agent-skill-reference-text"]').text()).toContain(
			'Use needs-repro.',
		);
		expect(wrapper.find('[data-testid="agent-skill-reference-name-input"]').exists()).toBe(false);
	});

	it('shows the instructions character count, not their byte size', () => {
		const wrapper = mountViewer({
			skill: {
				name: 'Research',
				description: 'Use for research',
				// Each of these is 3 UTF-8 bytes, so a byte counter would read 9.
				instructions: '日本語',
			},
		});

		expect(wrapper.text()).toContain(
			`3 / ${AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH.toLocaleString()} characters`,
		);
	});

	it('shows the selected reference character count, not its byte size', () => {
		const wrapper = mountViewer({
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
				references: [
					{
						path: 'references/guide.md',
						content: '€€€',
					},
				],
			},
			selectedPath: 'references/guide.md',
		});

		// '€' is 3 UTF-8 bytes but one character — the counter shows characters.
		expect(wrapper.text()).toContain(
			`3 / ${AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH.toLocaleString()} characters`,
		);
	});

	it('marks skills with too many references invalid', () => {
		const wrapper = mountViewer({
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
				references: makeReferences(AGENT_SKILL_REFERENCE_MAX_COUNT + 1),
			},
		});

		expect(wrapper.text()).toContain(
			`Skills can have up to ${AGENT_SKILL_REFERENCE_MAX_COUNT.toLocaleString()} reference files.`,
		);
		expect(wrapper.emitted('update:valid')?.at(-1)).toEqual([false]);
	});
});

describe('AgentSkillViewer relative links', () => {
	const skill = {
		name: 'Research',
		description: 'Use for research',
		instructions: [
			'[Bare](reference/guide.md)',
			'[Dot](./reference/degraded/fallback.md)',
			'[Outside](../other/SKILL.md)',
			'[Missing](reference/none.md)',
			'[Web](https://example.com/docs)',
		].join('\n\n'),
		references: [
			{
				path: 'reference/degraded/fallback.md',
				content: '[Up](../guide.md) [Main](../../SKILL.md)',
			},
			{ path: 'reference/guide.md', content: '# Guide' },
		],
	};

	async function clickLink(selectedPath: string, text: string) {
		const wrapper = mountViewer({ readOnly: true, skill, selectedPath });
		const link = wrapper.findAll('a').find((anchor) => anchor.text() === text);
		const event = new MouseEvent('click', { bubbles: true, cancelable: true });
		link?.element.dispatchEvent(event);
		await wrapper.vm.$nextTick();
		return { wrapper, link, event };
	}

	it.each([
		['a bare link', 'SKILL.md', 'Bare', 'reference/guide.md'],
		['a ./ link', 'SKILL.md', 'Dot', 'reference/degraded/fallback.md'],
		['a ../ link from a nested file', 'reference/degraded/fallback.md', 'Up', 'reference/guide.md'],
		['a link back to SKILL.md', 'reference/degraded/fallback.md', 'Main', 'SKILL.md'],
	])('selects the linked file for %s and stays on the page', async (_case, from, text, path) => {
		const { wrapper, link, event } = await clickLink(from, text);

		expect(link?.exists()).toBe(true);
		expect(wrapper.emitted('select:path')).toEqual([[path]]);
		expect(event.defaultPrevented).toBe(true);
	});

	it.each([
		['a file outside the skill', 'Outside'],
		['a file that the skill does not have', 'Missing'],
	])('selects nothing and stays on the page for a link to %s', async (_case, text) => {
		const { wrapper, link, event } = await clickLink('SKILL.md', text);

		expect(link?.exists()).toBe(true);
		expect(wrapper.emitted('select:path')).toBeUndefined();
		expect(event.defaultPrevented).toBe(true);
	});

	it('leaves a web link to the browser', async () => {
		const { wrapper, link, event } = await clickLink('SKILL.md', 'Web');

		expect(link?.attributes('href')).toBe('https://example.com/docs');
		expect(wrapper.emitted('select:path')).toBeUndefined();
		expect(event.defaultPrevented).toBe(false);
	});
});

function mountViewer(props: Partial<InstanceType<typeof AgentSkillViewer>['$props']> = {}) {
	return mount(AgentSkillViewer, {
		props: {
			skill: {
				name: 'Summarize',
				description: 'Use when summarizing notes',
				instructions: '',
			},
			...props,
		},
		global: {
			stubs: {
				N8nButton: {
					template:
						'<button type="button" v-bind="$attrs" @click="$emit(\'click\')"><slot name="prefix" /><slot name="icon" /><slot /></button>',
					emits: ['click'],
				},
				N8nDialog: { props: ['open'], template: '<div v-if="open"><slot /></div>' },
				N8nDialogHeader: { template: '<div><slot /></div>' },
				N8nDialogTitle: { template: '<h3><slot /></h3>' },
				N8nFormInput: N8nFormInputStub,
				N8nIcon: { template: '<i />' },
				N8nText: { template: '<span><slot /></span>' },
				N8nTooltip: { template: '<span><slot /></span>' },
				MarkdownEditor: { props: ['modelValue'], template: '<textarea :value="modelValue" />' },
			},
		},
	});
}

function makeReferences(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		path: index === 0 ? 'references/reference.md' : `references/reference-${index + 1}.md`,
		content: 'Reference',
	}));
}
