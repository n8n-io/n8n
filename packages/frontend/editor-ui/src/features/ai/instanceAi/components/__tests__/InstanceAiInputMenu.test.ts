import { fireEvent } from '@testing-library/vue';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiInputMenu from '../InstanceAiInputMenu.vue';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

vi.mock('../../composables/useInstanceAiInputMenuItems', async () => {
	const { ref } = await import('vue');

	return {
		useInstanceAiInputMenuItems: () => ({
			menuItems: ref([]),
			hasDisconnectedMcpConnection: ref(false),
		}),
	};
});

const renderComponent = createComponentRenderer(InstanceAiInputMenu);

describe('InstanceAiInputMenu', () => {
	it('tracks clicking the plus button', async () => {
		const { getByRole } = renderComponent();

		await fireEvent.click(getByRole('button'));

		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_CLICKED_AI_ASSISTANT_INPUT_PLUS_BUTTON,
		);
	});
});
