/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import AgentSessionIdleTimeoutField from '../components/AgentSessionIdleTimeoutField.vue';

/** The component's own fallback when the timeout is switched on: one day. */
const DEFAULT_MINUTES = 60 * 24;

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/design-system', async () => {
	const { defineComponent } = await import('vue');

	// Both stand-ins render a single root element and set no data-testid of
	// their own, so the production test ids fall through — the queries below
	// exercise the real selectors.
	const N8nInputNumber = defineComponent({
		props: {
			modelValue: { type: Number, default: undefined },
			min: { type: Number, default: undefined },
			disabled: { type: Boolean, default: false },
		},
		emits: ['update:modelValue'],
		setup(_props, { emit }) {
			function onInput(event: Event) {
				emit('update:modelValue', Number((event.target as HTMLInputElement).value));
			}
			return { onInput };
		},
		template: `
			<input
				:value="modelValue"
				:data-min="min"
				:data-disabled="String(disabled)"
				@input="onInput"
			/>
		`,
	});

	const N8nSwitch2 = defineComponent({
		props: {
			modelValue: { type: Boolean, default: false },
			disabled: { type: Boolean, default: false },
		},
		emits: ['update:modelValue'],
		setup(props, { emit }) {
			function toggle() {
				emit('update:modelValue', !props.modelValue);
			}
			return { toggle };
		},
		template: `
			<button
				type="button"
				:data-on="String(modelValue)"
				:data-disabled="String(disabled)"
				@click="toggle"
			/>
		`,
	});

	return {
		N8nText: { template: '<span><slot /></span>' },
		N8nInputNumber,
		N8nSwitch2,
	};
});

function renderField(props: { modelValue: number | null | undefined; disabled?: boolean }) {
	return mount(AgentSessionIdleTimeoutField, { props });
}

const MINUTES = '[data-testid="session-idle-timeout-minutes"]';
const TOGGLE = '[data-testid="session-idle-timeout-toggle"]';

const UNSET_VALUES: Array<[label: string, modelValue: number | null | undefined]> = [
	['null', null],
	['undefined', undefined],
];

describe('AgentSessionIdleTimeoutField', () => {
	it.each(UNSET_VALUES)('hides the minute input while the timeout is %s', (_label, modelValue) => {
		const wrapper = renderField({ modelValue });

		expect(wrapper.find(MINUTES).exists()).toBe(false);
		expect(wrapper.find(TOGGLE).attributes('data-on')).toBe('false');
	});

	it('shows the configured minutes once the timeout is set', () => {
		const wrapper = renderField({ modelValue: 30 });

		const minutes = wrapper.find(MINUTES);
		expect(minutes.attributes('value')).toBe('30');
		expect(minutes.attributes('data-min')).toBe('1');
		expect(wrapper.find(TOGGLE).attributes('data-on')).toBe('true');
	});

	it('switching on falls back to a one-day timeout', async () => {
		const wrapper = renderField({ modelValue: null });

		await wrapper.find(TOGGLE).trigger('click');

		expect(wrapper.emitted('update:modelValue')).toEqual([[DEFAULT_MINUTES]]);
	});

	it('switching off clears the timeout', async () => {
		const wrapper = renderField({ modelValue: 30 });

		await wrapper.find(TOGGLE).trigger('click');

		expect(wrapper.emitted('update:modelValue')).toEqual([[null]]);
	});

	it('rounds a fractional minute value to whole minutes', async () => {
		const wrapper = renderField({ modelValue: 30 });

		await wrapper.find(MINUTES).setValue('2.6');

		expect(wrapper.emitted('update:modelValue')).toEqual([[3]]);
	});

	it.each(['0', '-5', 'not-a-number', ''])(
		'keeps the current timeout when the minute input is %s',
		async (value) => {
			const wrapper = renderField({ modelValue: 30 });

			await wrapper.find(MINUTES).setValue(value);

			// A cleared or invalid input is a keystroke on the way to a real
			// value, not an instruction to store 0 (which would expire every
			// session immediately) or NaN.
			expect(wrapper.emitted('update:modelValue')).toBeUndefined();
		},
	);

	it('disables both controls when the field is disabled', () => {
		const wrapper = renderField({ modelValue: 30, disabled: true });

		expect(wrapper.find(MINUTES).attributes('data-disabled')).toBe('true');
		expect(wrapper.find(TOGGLE).attributes('data-disabled')).toBe('true');
	});
});
