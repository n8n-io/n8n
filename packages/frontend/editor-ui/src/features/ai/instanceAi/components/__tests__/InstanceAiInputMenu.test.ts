import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/vue';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiInputMenu from '../InstanceAiInputMenu.vue';

const { action, track, refreshAppliedPreferences, receivedThreadId } = vi.hoisted(() => ({
	action: vi.fn(),
	track: vi.fn(),
	refreshAppliedPreferences: vi.fn(),
	receivedThreadId: vi.fn<(threadId: string | undefined) => void>(),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

vi.mock('../../composables/useInstanceAiInputMenuItems', async () => {
	const { ref } = await import('vue');

	return {
		useInstanceAiInputMenuItems: (_attachFiles: () => void, threadId: () => string | undefined) => {
			receivedThreadId(threadId());
			return {
				menuItems: ref([{ id: 'action', label: 'Action', data: { action } }]),
				disconnectedConnectionCount: ref(0),
				refreshAppliedPreferences,
			};
		},
	};
});

const renderComponent = createComponentRenderer(InstanceAiInputMenu);

describe('InstanceAiInputMenu', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the non-send button as a labeled ghost button', () => {
		const { getByRole } = renderComponent();
		const button = getByRole('button', { name: /Add .*files/ });

		expect(button.className).toContain('ghost');
		expect(button).toHaveAccessibleName();
	});

	it('tracks clicking the plus button', async () => {
		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button', { name: /Add .*files/ }));

		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_CLICKED_AI_ASSISTANT_INPUT_PLUS_BUTTON,
			{},
		);
	});

	it('re-reads the applied preferences each time the menu opens', async () => {
		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button', { name: /Add .*files/ }));
		expect(refreshAppliedPreferences).toHaveBeenCalledOnce();

		await userEvent.keyboard('{Escape}');
		await userEvent.click(getByRole('button', { name: /Add .*files/ }));
		expect(refreshAppliedPreferences).toHaveBeenCalledTimes(2);
	});

	it('hands its thread to the menu items', () => {
		renderComponent({ props: { threadId: 'thread-7' } });

		expect(receivedThreadId).toHaveBeenCalledWith('thread-7');
	});

	it('runs the selected menu action once', async () => {
		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button', { name: /Add .*files/ }));
		await userEvent.click(getByRole('menuitem', { name: 'Action' }));

		expect(action).toHaveBeenCalledOnce();
	});

	it('disables both the trigger and menu interaction', async () => {
		const { getByRole, queryByRole } = renderComponent({ props: { disabled: true } });
		const trigger = getByRole('button', { name: /Add .*files/ });

		expect(trigger).toBeDisabled();
		await userEvent.click(trigger);
		expect(queryByRole('menuitem', { name: 'Action' })).not.toBeInTheDocument();
		expect(action).not.toHaveBeenCalled();
	});

	it('explains the streaming restriction and restores the normal label afterward', async () => {
		const { getByRole, getByText, rerender } = renderComponent({
			props: { disabled: true, isStreaming: true },
		});
		const trigger = getByRole('button', {
			name: 'Stop the response to add context with connectors, files, and more',
		});
		expect(trigger).toBeDisabled();
		await fireEvent.pointerMove(trigger.parentElement!, { pointerType: 'mouse' });
		await waitFor(() => {
			expect(
				getByText('Stop the response to add context with connectors, files, and more'),
			).toBeVisible();
		});

		await rerender({ disabled: false, isStreaming: false });
		expect(getByRole('button', { name: /Add .*files/ })).toBeEnabled();
	});
});
