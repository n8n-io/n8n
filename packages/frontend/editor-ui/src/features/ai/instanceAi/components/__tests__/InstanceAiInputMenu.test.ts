import { fireEvent } from '@testing-library/vue';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiInputMenu from '../InstanceAiInputMenu.vue';

const { action, track } = vi.hoisted(() => ({ action: vi.fn(), track: vi.fn() }));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	const { defineComponent, h } = await import('vue');

	return {
		...actual,
		N8nDropdownMenu: defineComponent({
			props: { disabled: Boolean },
			emits: ['select'],
			setup(props, { emit, slots }) {
				return () =>
					h('div', [
						slots.trigger?.(),
						h(
							'button',
							{
								'data-test-id': 'menu-action',
								disabled: props.disabled,
								onClick: () => emit('select', 'action'),
							},
							'Action',
						),
					]);
			},
		}),
	};
});

vi.mock('../../composables/useInstanceAiInputMenuItems', async () => {
	const { ref } = await import('vue');

	return {
		useInstanceAiInputMenuItems: () => ({
			menuItems: ref([{ id: 'action', label: 'Action', data: { action } }]),
			hasDisconnectedConnection: ref(false),
		}),
	};
});

const renderComponent = createComponentRenderer(InstanceAiInputMenu);

describe('InstanceAiInputMenu', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('tracks clicking the plus button', async () => {
		const { getByRole } = renderComponent();

		await fireEvent.click(getByRole('button', { name: /Add .*files/ }));

		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_CLICKED_AI_ASSISTANT_INPUT_PLUS_BUTTON,
			{},
		);
	});

	it('runs the selected menu action once', async () => {
		const { getByTestId } = renderComponent();

		await fireEvent.click(getByTestId('menu-action'));

		expect(action).toHaveBeenCalledOnce();
	});

	it('disables both the trigger and menu interaction', () => {
		const { getByRole, getByTestId } = renderComponent({ props: { disabled: true } });
		const trigger = getByRole('button', { name: /Add .*files/ });
		const menuAction = getByTestId('menu-action');

		expect(trigger).toBeDisabled();
		expect(menuAction).toBeDisabled();
	});
});
