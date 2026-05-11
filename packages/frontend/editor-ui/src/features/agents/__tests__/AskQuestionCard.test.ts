/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { afterEach, describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AskQuestionCard from '../components/interactive/AskQuestionCard.vue';

const OPTIONS = [
	{ label: 'Option A', value: 'a' },
	{ label: 'Option B', value: 'b', description: 'Extra info' },
];

function mountCard(props = {}) {
	return mount(AskQuestionCard, {
		props: {
			question: 'Which option?',
			options: OPTIONS,
			...props,
		},
		global: {
			stubs: {
				N8nButton: {
					template:
						'<button v-bind="$attrs" :disabled="$attrs.disabled" @click="$emit(\'click\')"><slot/></button>',
				},
				N8nCheckbox: {
					props: ['modelValue', 'disabled'],
					template:
						'<button type="button" data-testid="n8n-checkbox" :aria-checked="String(modelValue)" :disabled="disabled" @click="$emit(\'update:modelValue\', !modelValue)"></button>',
				},
				N8nInput: {
					props: ['modelValue', 'disabled', 'placeholder'],
					template:
						'<input :value="modelValue" :disabled="disabled" :placeholder="placeholder" v-bind="$attrs" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown="$emit(\'keydown\', $event)" />',
				},
				N8nInputLabel: {
					props: ['label'],
					template: '<label><span>{{ label }}</span><slot /></label>',
				},
				N8nText: { template: '<p><slot/></p>' },
			},
		},
	});
}

afterEach(() => {
	vi.useRealTimers();
});

describe('AskQuestionCard', () => {
	it('renders the question and all options', () => {
		const wrapper = mountCard();
		expect(wrapper.text()).toContain('Which option?');
		expect(wrapper.text()).toContain('Option A');
		expect(wrapper.text()).toContain('Option B');
		expect(wrapper.text()).toContain('Extra info');
		expect(wrapper.find('[data-testid="ask-question-other-input"]').exists()).toBe(true);
	});

	it('emits submit with selected value after clicking a single-choice option', async () => {
		vi.useFakeTimers();
		const wrapper = mountCard();
		const buttons = wrapper.findAll('button[aria-pressed]');
		await buttons[0].trigger('click'); // select Option A
		expect(wrapper.find('[data-testid="ask-question-submit"]').exists()).toBe(false);
		expect(wrapper.emitted('submit')).toBeFalsy();

		vi.advanceTimersByTime(250);

		expect(wrapper.emitted('submit')).toBeTruthy();
		expect((wrapper.emitted('submit') as unknown[][])[0][0]).toEqual({ values: ['a'] });
	});

	it('only submits the latest single-choice option when clicks happen quickly', async () => {
		vi.useFakeTimers();
		const wrapper = mountCard();
		const buttons = wrapper.findAll('button[aria-pressed]');

		await buttons[0].trigger('click');
		vi.advanceTimersByTime(100);
		await buttons[1].trigger('click');
		vi.advanceTimersByTime(249);
		expect(wrapper.emitted('submit')).toBeFalsy();

		vi.advanceTimersByTime(1);

		expect(wrapper.emitted('submit')).toHaveLength(1);
		expect((wrapper.emitted('submit') as unknown[][])[0][0]).toEqual({ values: ['b'] });
	});

	it('does not emit if nothing is selected', async () => {
		const wrapper = mountCard({ allowMultiple: true });
		await wrapper.find('[data-testid="ask-question-submit"]').trigger('click');
		expect(wrapper.emitted('submit')).toBeFalsy();
	});

	it('does not emit when disabled', async () => {
		const wrapper = mountCard({ disabled: true });
		const buttons = wrapper.findAll('button[aria-pressed]');
		await buttons[0].trigger('click');
		await wrapper.find('[data-testid="ask-question-other-input"]').setValue('Different option');
		await wrapper.find('[data-testid="ask-question-other-submit"]').trigger('click');
		expect(wrapper.emitted('submit')).toBeFalsy();
	});

	it('submits typed Other text in single-choice mode', async () => {
		const wrapper = mountCard();
		await wrapper.find('[data-testid="ask-question-other-input"]').setValue('Use Microsoft Teams');
		await wrapper.find('[data-testid="ask-question-other-submit"]').trigger('click');

		const emitted = wrapper.emitted('submit') as unknown[][];
		expect(emitted[0][0]).toEqual({ values: ['Use Microsoft Teams'] });
	});

	it('allows selecting multiple values when allowMultiple=true', async () => {
		const wrapper = mountCard({ allowMultiple: true });
		const checkboxes = wrapper.findAll('[data-testid="ask-question-checkbox"]');
		await checkboxes[0].trigger('click');
		await checkboxes[1].trigger('click');
		expect(checkboxes[0].attributes('aria-checked')).toBe('true');
		expect(checkboxes[1].attributes('aria-checked')).toBe('true');
		const allBtns = wrapper.findAll('button');
		const submitBtn = allBtns[allBtns.length - 1];
		await submitBtn.trigger('click');
		const emitted = wrapper.emitted('submit') as unknown[][];
		expect(emitted[0][0]).toEqual({ values: ['a', 'b'] });
	});

	it('submits selected multiple values plus typed Other text', async () => {
		const wrapper = mountCard({ allowMultiple: true });
		const checkboxes = wrapper.findAll('[data-testid="ask-question-checkbox"]');
		await checkboxes[0].trigger('click');
		await wrapper.find('[data-testid="ask-question-other-input"]').setValue('Use Discord too');
		await wrapper.find('[data-testid="ask-question-submit"]').trigger('click');

		const emitted = wrapper.emitted('submit') as unknown[][];
		expect(emitted[0][0]).toEqual({ values: ['a', 'Use Discord too'] });
	});

	it('allows typed Other text as the only multiple-choice value', async () => {
		const wrapper = mountCard({ allowMultiple: true });
		await wrapper.find('[data-testid="ask-question-other-input"]').setValue('Use Linear');
		await wrapper.find('[data-testid="ask-question-submit"]').trigger('click');

		const emitted = wrapper.emitted('submit') as unknown[][];
		expect(emitted[0][0]).toEqual({ values: ['Use Linear'] });
	});
});
