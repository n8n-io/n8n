/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { describe, it, expect } from 'vitest';
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
				N8nText: { template: '<p><slot/></p>' },
			},
		},
	});
}

describe('AskQuestionCard', () => {
	it('renders the question and all options', () => {
		const wrapper = mountCard();
		expect(wrapper.text()).toContain('Which option?');
		expect(wrapper.text()).toContain('Option A');
		expect(wrapper.text()).toContain('Option B');
		expect(wrapper.text()).toContain('Extra info');
	});

	it('emits submit with selected value on submit click (single choice)', async () => {
		const wrapper = mountCard();
		const buttons = wrapper.findAll('button[aria-pressed]');
		await buttons[0].trigger('click'); // select Option A
		const submitBtn = wrapper.find(
			'[data-testid="ask-question-card"] > button:not([aria-pressed])',
		);
		await submitBtn.trigger('click');
		expect(wrapper.emitted('submit')).toBeTruthy();
		expect((wrapper.emitted('submit') as unknown[][])[0][0]).toEqual({ values: ['a'] });
	});

	it('does not emit if nothing is selected', async () => {
		const wrapper = mountCard();
		const buttons = wrapper.findAll('button');
		const submitBtn = buttons[buttons.length - 1]; // last button is submit
		await submitBtn.trigger('click');
		expect(wrapper.emitted('submit')).toBeFalsy();
	});

	it('does not emit when disabled', async () => {
		const wrapper = mountCard({ disabled: true });
		const buttons = wrapper.findAll('button[aria-pressed]');
		await buttons[0].trigger('click');
		expect(wrapper.emitted('submit')).toBeFalsy();
	});

	it('allows selecting multiple values when allowMultiple=true', async () => {
		const wrapper = mountCard({ allowMultiple: true });
		const optionBtns = wrapper.findAll('button[aria-pressed]');
		await optionBtns[0].trigger('click');
		await optionBtns[1].trigger('click');
		const allBtns = wrapper.findAll('button');
		const submitBtn = allBtns[allBtns.length - 1];
		await submitBtn.trigger('click');
		const emitted = wrapper.emitted('submit') as unknown[][];
		expect(emitted[0][0]).toEqual({ values: ['a', 'b'] });
	});
});
