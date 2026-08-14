import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, onMounted } from 'vue';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import {
	AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
} from '@n8n/api-types';

import AgentSkillViewer from '../components/AgentSkillViewer.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) => {
			if (key === 'agents.builder.skills.references.byteCount') {
				return `${options?.interpolate?.count} / ${options?.interpolate?.max} bytes`;
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
	it('imports SKILL.md frontmatter and instructions', async () => {
		const wrapper = mount(AgentSkillViewer, {
			props: {
				skill: {
					name: 'Summarize',
					description: 'Use when summarizing notes',
					instructions: '',
				},
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
					// N8nMarkdownEditor uses a filename-inferred name (no N8n prefix).
					MarkdownEditor: { props: ['modelValue'], template: '<textarea :value="modelValue" />' },
				},
			},
		});

		const file = makeFile(
			'---\nname: Summarize notes\ndescription: Use for notes\nallowed_tools:\n  - load_workflow\nrecommended_tools:\n  - search_docs\n---\n# Playbook\nFollow these steps.',
			'SKILL.md',
		);
		const input = wrapper.find('[data-testid="agent-skill-skill-md-file-input"]');
		Object.defineProperty(input.element, 'files', {
			value: [file],
			configurable: true,
		});

		await input.trigger('change');
		await flushPromises();

		const importedSkill = wrapper.emitted('update:skill')?.at(-1)?.[0] as Record<string, unknown>;
		expect(importedSkill).toEqual(
			expect.objectContaining({
				name: 'Summarize notes',
				description: 'Use for notes',
				instructions: '# Playbook\nFollow these steps.',
				allowedTools: ['load_workflow'],
				references: undefined,
			}),
		);
		expect(importedSkill).not.toHaveProperty('recommendedTools');
	});

	it('imports markdown references from a folder', async () => {
		const wrapper = mountViewer();
		const skillFile = makeFile(
			'---\nname: Research\ndescription: Use for research\n---\nMain instructions',
			'skill-folder/SKILL.md',
		);
		const referenceFile = makeFile('# Guide', 'skill-folder/references/guide.md');
		const input = wrapper.find('[data-testid="agent-skill-folder-file-input"]');
		Object.defineProperty(input.element, 'files', {
			value: [skillFile, referenceFile],
			configurable: true,
		});

		await input.trigger('change');
		await flushPromises();

		expect(wrapper.emitted('update:skill')?.at(-1)).toEqual([
			expect.objectContaining({
				name: 'Research',
				references: [
					{
						path: 'references/guide.md',
						content: '# Guide',
					},
				],
			}),
		]);
	});

	it('rejects scripts in imported folders', async () => {
		const wrapper = mountViewer();
		const skillFile = makeFile(
			'---\nname: Research\ndescription: Use for research\n---\nMain instructions',
			'skill-folder/SKILL.md',
		);
		const scriptFile = makeFile('print("no")', 'skill-folder/scripts/run.py');
		const input = wrapper.find('[data-testid="agent-skill-folder-file-input"]');
		Object.defineProperty(input.element, 'files', {
			value: [skillFile, scriptFile],
			configurable: true,
		});

		await input.trigger('change');
		await flushPromises();

		expect(wrapper.text()).toContain('agents.builder.skills.import.scriptsUnsupported');
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

	it('shows the selected reference byte count', () => {
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

		expect(wrapper.text()).toContain(
			`9 / ${AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES.toLocaleString()} bytes`,
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

	it('updates allowed tools from the picker and chips', async () => {
		const wrapper = mountViewer({
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
			},
			availableTools: [{ name: 'load_workflow', label: 'Load workflow', icon: 'workflow' }],
		});

		await wrapper.find('[data-testid="agent-skill-add-allowed-tool"]').trigger('click');
		await flushPromises();
		await nextTick();

		const option = document.querySelector('[data-testid="agent-skill-allowed-tool-option"]');
		expect(option).toBeInTheDocument();
		await (option as HTMLElement).click();
		await nextTick();

		expect(wrapper.emitted('update:skill')?.at(-1)).toEqual([{ allowedTools: ['load_workflow'] }]);
		await wrapper.setProps({
			skill: {
				name: 'Research',
				description: 'Use for research',
				instructions: 'Main body',
				allowedTools: ['load_workflow'],
			},
		});

		expect(wrapper.find('[data-testid="agent-skill-allowed-tool-chip"]').text()).toContain(
			'Load workflow',
		);

		await wrapper.find('[data-testid="agent-skill-allowed-tool-remove"]').trigger('click');

		expect(wrapper.emitted('update:skill')?.at(-1)).toEqual([{ allowedTools: undefined }]);
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

function makeFile(content: string, path: string): File {
	const file = new File([content], path.split('/').at(-1) ?? 'file.md');
	Object.defineProperty(file, 'webkitRelativePath', {
		value: path,
		configurable: true,
	});
	Object.defineProperty(file, 'text', {
		value: async () => await Promise.resolve(content),
		configurable: true,
	});
	return file;
}

function makeReferences(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		path: index === 0 ? 'references/reference.md' : `references/reference-${index + 1}.md`,
		content: 'Reference',
	}));
}
