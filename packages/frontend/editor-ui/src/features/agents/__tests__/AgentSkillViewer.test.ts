import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h, nextTick, onMounted } from 'vue';
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

let fileReaderText = '';

class MockFileReader {
	result: string | ArrayBuffer | null = null;
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;

	readAsText() {
		queueMicrotask(() => {
			this.result = fileReaderText;
			this.onload?.();
		});
	}
}

describe('AgentSkillViewer', () => {
	beforeEach(() => {
		vi.stubGlobal('FileReader', MockFileReader);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('reads a local markdown file into the instructions field', async () => {
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
				},
			},
		});

		fileReaderText = '# Playbook\nFollow these steps.';
		const file = new File([fileReaderText], 'playbook.md', {
			type: 'text/markdown',
		});
		const input = wrapper.find('[data-testid="agent-skill-instructions-file-input"]');
		Object.defineProperty(input.element, 'files', {
			value: [file],
			configurable: true,
		});

		await input.trigger('change');
		await flushPromises();
		await nextTick();

		expect(wrapper.emitted('update:skill')).toContainEqual([
			{ instructions: '# Playbook\nFollow these steps.' },
		]);
	});
});
