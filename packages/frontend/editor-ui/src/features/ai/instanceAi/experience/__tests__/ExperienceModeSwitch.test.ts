import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { ExperienceMode } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import ExperienceModeSwitch from '../ExperienceModeSwitch.vue';

const state = await vi.hoisted(async () => {
	const { ref: hoistedRef } = await import('vue');
	return {
		enabled: hoistedRef(true),
		mode: hoistedRef<ExperienceMode>('simple'),
		setMode: vi.fn(),
	};
});

vi.mock('../useExperienceMode', () => ({
	useExperienceMode: () => ({
		isEnabled: computed(() => state.enabled.value),
		mode: computed(() => state.mode.value),
		isSimple: computed(() => state.mode.value === 'simple'),
		setMode: state.setMode,
	}),
}));

const SIMPLE_HELP = 'Just chat. n8n picks the settings and checks with you before anything risky.';
const POWER_HELP = 'See every thread, plan and change. Choose where each task runs.';

const renderComponent = createComponentRenderer(ExperienceModeSwitch);

function render(props: { isCollapsed: boolean; variant?: 'sidebar' | 'settings' }) {
	return renderComponent({ pinia: createTestingPinia(), props });
}

describe('ExperienceModeSwitch', () => {
	beforeEach(() => {
		state.enabled.value = true;
		state.mode.value = 'simple';
		state.setMode.mockReset();
		state.setMode.mockImplementation(async (mode: ExperienceMode) => {
			state.mode.value = mode;
			return true;
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each([true, false])('renders nothing with the flag off (collapsed: %s)', (isCollapsed) => {
		state.enabled.value = false;

		const { container } = render({ isCollapsed });

		expect(container).toBeEmptyDOMElement();
	});

	describe('expanded sidebar', () => {
		it('renders an Interface group with Simple and Power, and checks the current mode', () => {
			const { getByRole, getByTestId, queryByTestId } = render({ isCollapsed: false });

			const group = getByRole('radiogroup', { name: 'Interface' });
			expect(group).toBe(getByTestId('experience-mode-switch'));
			expect(getByRole('radio', { name: 'Simple' })).toBeChecked();
			expect(getByRole('radio', { name: 'Power' })).not.toBeChecked();
			expect(getByTestId('experience-mode-option-simple')).toHaveTextContent('Simple');
			expect(getByTestId('experience-mode-option-power')).toHaveTextContent('Power');
			expect(queryByTestId('experience-mode-toggle')).not.toBeInTheDocument();
		});

		it('describes both modes to screen readers', () => {
			const { getByRole } = render({ isCollapsed: false });

			const group = getByRole('radiogroup', { name: 'Interface' });
			expect(group).toHaveAccessibleDescription(expect.stringContaining(SIMPLE_HELP));
			expect(group).toHaveAccessibleDescription(expect.stringContaining(POWER_HELP));
		});

		it.each([
			['simple', SIMPLE_HELP],
			['power', POWER_HELP],
		])('shows the %s description in a tooltip', async (mode, description) => {
			const { getByTestId } = render({ isCollapsed: false });

			await hoverTooltipTrigger(getByTestId(`experience-mode-option-${mode}`));

			await waitFor(() => expect(getTooltip()).toHaveTextContent(description));
		});

		it('switches to Power on click without a success message', async () => {
			const { getByRole } = render({ isCollapsed: false });

			await userEvent.click(getByRole('radio', { name: 'Power' }));

			expect(state.setMode).toHaveBeenCalledTimes(1);
			expect(state.setMode).toHaveBeenCalledWith('power');
			await waitFor(() => expect(getByRole('radio', { name: 'Power' })).toBeChecked());
		});

		it('changes only the mode on an Arrow key and keeps the key from window listeners', async () => {
			const user = userEvent.setup();
			const onWindowKeydown = vi.fn();
			window.addEventListener('keydown', onWindowKeydown);
			try {
				const { getByRole } = render({ isCollapsed: false });

				getByRole('radio', { name: 'Simple' }).focus();
				await user.keyboard('{ArrowRight}');

				await waitFor(() => expect(getByRole('radio', { name: 'Power' })).toBeChecked());
				expect(state.setMode).toHaveBeenCalledTimes(1);
				expect(state.setMode).toHaveBeenCalledWith('power');
				expect(getByRole('radio', { name: 'Power' })).toHaveFocus();
				expect(onWindowKeydown).not.toHaveBeenCalled();
			} finally {
				window.removeEventListener('keydown', onWindowKeydown);
			}
		});
	});

	describe('collapsed sidebar', () => {
		it('renders one toggle that names the current mode and the next one', () => {
			const { getByRole, getByTestId, queryByRole } = render({ isCollapsed: true });

			const toggle = getByRole('button', { name: 'Interface: Simple. Switch to Power' });
			expect(toggle).toBe(getByTestId('experience-mode-toggle'));
			expect(queryByRole('radiogroup')).not.toBeInTheDocument();
		});

		it('names the way back while Power is on', () => {
			state.mode.value = 'power';

			const { getByRole } = render({ isCollapsed: true });

			expect(getByRole('button', { name: 'Interface: Power. Switch to Simple' })).toBeVisible();
		});

		it('toggles the mode on click and asks for a success message', async () => {
			const { getByTestId } = render({ isCollapsed: true });
			const toggle = getByTestId('experience-mode-toggle');

			await userEvent.click(toggle);
			expect(state.setMode).toHaveBeenLastCalledWith('power', { announce: true });
			await waitFor(() =>
				expect(toggle).toHaveAccessibleName('Interface: Power. Switch to Simple'),
			);

			await userEvent.click(toggle);
			expect(state.setMode).toHaveBeenLastCalledWith('simple', { announce: true });
		});

		it.each(['{Enter}', ' '])('toggles the mode with the %s key', async (key) => {
			const user = userEvent.setup();
			const { getByTestId } = render({ isCollapsed: true });
			const toggle = getByTestId('experience-mode-toggle');

			toggle.focus();
			await user.keyboard(key);

			expect(state.setMode).toHaveBeenCalledWith('power', { announce: true });
			await waitFor(() =>
				expect(toggle).toHaveAccessibleName('Interface: Power. Switch to Simple'),
			);
			expect(toggle).toHaveFocus();
		});

		it('shows its label in a tooltip', async () => {
			const { getByTestId } = render({ isCollapsed: true });

			await hoverTooltipTrigger(getByTestId('experience-mode-toggle'));

			await waitFor(() =>
				expect(getTooltip()).toHaveTextContent('Interface: Simple. Switch to Power'),
			);
		});
	});

	describe('settings variant', () => {
		it('renders an Interface section with both descriptions as help text', () => {
			const { getByRole, getByText } = render({ isCollapsed: false, variant: 'settings' });

			const group = getByRole('radiogroup', { name: 'Interface' });
			expect(getByText(SIMPLE_HELP)).toBeVisible();
			expect(getByText(POWER_HELP)).toBeVisible();
			expect(group).toHaveAccessibleDescription(expect.stringContaining(POWER_HELP));
		});

		it('renders the segment control even if the parent says collapsed', () => {
			const { getByRole, queryByTestId } = render({ isCollapsed: true, variant: 'settings' });

			expect(getByRole('radiogroup', { name: 'Interface' })).toBeVisible();
			expect(queryByTestId('experience-mode-toggle')).not.toBeInTheDocument();
		});

		it('saves the chosen mode', async () => {
			const { getByRole } = render({ isCollapsed: false, variant: 'settings' });

			await userEvent.click(getByRole('radio', { name: 'Power' }));

			expect(state.setMode).toHaveBeenCalledWith('power');
		});
	});
});
