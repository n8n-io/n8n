import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { reactive } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { INSTANCE_AI_EMPTY_STATE_SUGGESTIONS as suggestions } from '@/features/ai/instanceAi/emptyStateSuggestions';
import InstanceAiProactiveStarterMessage from './InstanceAiProactiveStarterMessage.vue';

const telemetryTrack = vi.fn();
const storeState = reactive({
	currentThreadId: 'thread-1',
	researchMode: false,
});

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: telemetryTrack })),
}));

vi.mock('@/features/ai/instanceAi/instanceAi.store', () => ({
	useInstanceAiStore: vi.fn(() => storeState),
}));

const renderComponent = createComponentRenderer(InstanceAiProactiveStarterMessage);

describe('InstanceAiProactiveStarterMessage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		telemetryTrack.mockReset();
		storeState.currentThreadId = 'thread-1';
		storeState.researchMode = false;
	});

	it('renders a starter assistant message and quick replies', () => {
		storeState.currentThreadId = 'thread-render';
		const { getByTestId, getByText } = renderComponent({
			props: { suggestions },
		});

		expect(getByTestId('instance-ai-proactive-starter')).toBeInTheDocument();
		expect(getByText('What do you want to automate?')).toBeVisible();
		expect(
			getByText(
				"Tell me the outcome, what should trigger it, and which apps are involved. I'll help turn it into a workflow.",
			),
		).toBeVisible();
		expect(getByTestId('instance-ai-suggestion-build-workflow')).toBeVisible();
	});

	it('emits the selected prompt text when a quick reply is clicked', async () => {
		storeState.currentThreadId = 'thread-submit';
		const { emitted, getByTestId } = renderComponent({
			props: { suggestions },
		});

		await userEvent.click(getByTestId('instance-ai-suggestion-build-agent'));

		expect(emitted().submit?.[0]).toEqual([
			'I want to build a new agent. Help me figure out what to build. Ask me what the main purpose of the agent is, what should trigger it into action, what apps, tools, or knowledge it should have access to, and whether I have a preference for the AI model used.',
		]);
	});

	it('tracks shown and selected suggestion events without prompt text', async () => {
		storeState.currentThreadId = 'thread-telemetry';
		const { getByTestId } = renderComponent({
			props: { suggestions },
		});

		await waitFor(() => {
			expect(telemetryTrack).toHaveBeenCalledWith('Instance AI prompt suggestions shown', {
				thread_id: 'thread-telemetry',
				suggestion_catalog_version: 'v1',
				research_mode: false,
			});
		});

		telemetryTrack.mockClear();

		await userEvent.click(getByTestId('instance-ai-suggestion-build-workflow'));

		expect(telemetryTrack).toHaveBeenCalledWith('Instance AI prompt suggestion selected', {
			thread_id: 'thread-telemetry',
			suggestion_catalog_version: 'v1',
			research_mode: false,
			suggestion_id: 'build-workflow',
			suggestion_kind: 'prompt',
			position: 1,
		});
		expect(JSON.stringify(telemetryTrack.mock.calls)).not.toContain(
			'I want to build a new workflow',
		);
	});

	it('does not render quick replies or track impressions when disabled', () => {
		const { queryByTestId } = renderComponent({
			props: { suggestions, disabled: true },
		});

		expect(queryByTestId('instance-ai-suggestion-build-workflow')).not.toBeInTheDocument();
		expect(telemetryTrack).not.toHaveBeenCalledWith(
			'Instance AI prompt suggestions shown',
			expect.anything(),
		);
	});
});
