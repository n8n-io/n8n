import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, onMounted } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AgentSkillViewer from '../components/AgentSkillViewer.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const N8nFormInputStub = defineComponent({
	name: 'N8nFormInput',
	props: ['modelValue', 'label', 'disabled'],
	emits: ['update:modelValue', 'validate'],
	setup(props, { emit }) {
		onMounted(() => emit('validate', true));
		return () =>
			h('label', [
				props.label,
				h('input', {
					value: props.modelValue,
					disabled: props.disabled,
					onInput: (event: Event) =>
						emit('update:modelValue', (event.target as HTMLInputElement).value),
				}),
			]);
	},
});

describe('AgentSkillViewer', () => {
	beforeEach(() => {
		vi.stubGlobal('crypto', {
			subtle: {
				digest: vi.fn(async () => new Uint8Array(32).fill(1).buffer),
			},
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

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
							'<button type="button" @click="$emit(\'click\')"><slot name="prefix" /><slot /></button>',
						emits: ['click'],
					},
					N8nFormInput: N8nFormInputStub,
					N8nIcon: { template: '<i />' },
					N8nText: { template: '<span><slot /></span>' },
					// N8nMarkdownEditor uses a filename-inferred name (no N8n prefix).
					MarkdownEditor: { props: ['modelValue'], template: '<textarea :value="modelValue" />' },
				},
			},
		});

		const file = makeFile(
			'---\nname: Summarize notes\ndescription: Use for notes\nallowed_tools:\n  - load_workflow\n---\n# Playbook\nFollow these steps.',
			'SKILL.md',
		);
		const input = wrapper.find('[data-testid="agent-skill-skill-md-file-input"]');
		Object.defineProperty(input.element, 'files', {
			value: [file],
			configurable: true,
		});

		await input.trigger('change');
		await flushPromises();

		expect(wrapper.emitted('update:skill')).toContainEqual([
			expect.objectContaining({
				name: 'Summarize notes',
				description: 'Use for notes',
				instructions: '# Playbook\nFollow these steps.',
				allowedTools: ['load_workflow'],
				references: undefined,
			}),
		]);
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
						bytes: 7,
						sha256: '01'.repeat(32),
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
});

function mountViewer() {
	return mount(AgentSkillViewer, {
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
						'<button type="button" @click="$emit(\'click\')"><slot name="prefix" /><slot /></button>',
					emits: ['click'],
				},
				N8nFormInput: N8nFormInputStub,
				N8nIcon: { template: '<i />' },
				N8nText: { template: '<span><slot /></span>' },
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
