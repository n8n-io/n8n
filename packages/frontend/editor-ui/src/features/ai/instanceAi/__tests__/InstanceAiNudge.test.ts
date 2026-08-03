import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

const mocks = vi.hoisted(() => ({
	routerPush: vi.fn(),
	track: vi.fn(),
	isInstanceAiAvailable: { value: true },
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push: mocks.routerPush }),
}));
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mocks.track }),
}));
vi.mock('../composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => mocks.isInstanceAiAvailable,
}));

import { INSTANCE_AI_VIEW } from '../constants';
import InstanceAiNudge from '../nudge/InstanceAiNudge.vue';
import {
	INSTANCE_AI_NUDGE_SHOW_DELAY_MS,
	useInstanceAiNudgeStore,
} from '../nudge/instanceAiNudge.store';

const renderComponent = createComponentRenderer(InstanceAiNudge);

function renderWithActiveNudge() {
	const pinia = createTestingPinia({ stubActions: false });
	const nudgeStore = useInstanceAiNudgeStore(pinia);
	// Fast-forward past the show delay so the nudge is active before rendering.
	vi.useFakeTimers();
	nudgeStore.showNudge('workflow_created');
	vi.advanceTimersByTime(INSTANCE_AI_NUDGE_SHOW_DELAY_MS);
	vi.useRealTimers();
	return { ...renderComponent({ pinia }), nudgeStore };
}

describe('InstanceAiNudge', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.isInstanceAiAvailable.value = true;
	});

	it('renders nothing when no nudge is active', () => {
		const { queryByTestId } = renderComponent({ pinia: createTestingPinia() });

		expect(queryByTestId('instance-ai-nudge')).not.toBeInTheDocument();
	});

	it('renders title, description and CTA for the workflow_created trigger', () => {
		const { getByTestId } = renderWithActiveNudge();

		const nudge = getByTestId('instance-ai-nudge');
		expect(nudge).toHaveTextContent('Try AI Assistant');
		expect(nudge).toHaveTextContent('Create and edit workflows seamlessly using AI Assistant');
		expect(getByTestId('instance-ai-nudge-cta')).toHaveTextContent('Try AI Assistant');
		expect(getByTestId('instance-ai-nudge-visualization')).toBeInTheDocument();
	});

	it('dismisses the nudge and tracks it when the close button is clicked', async () => {
		const { getByTestId, queryByTestId } = renderWithActiveNudge();

		await userEvent.click(getByTestId('instance-ai-nudge-dismiss'));

		expect(queryByTestId('instance-ai-nudge')).not.toBeInTheDocument();
		expect(mocks.track).toHaveBeenCalledWith('Instance AI nudge dismissed', {
			trigger: 'workflow_created',
		});
		expect(mocks.routerPush).not.toHaveBeenCalled();
	});

	it('navigates to the assistant and dismisses the nudge when the CTA is clicked', async () => {
		const { getByTestId, queryByTestId } = renderWithActiveNudge();

		await userEvent.click(getByTestId('instance-ai-nudge-cta'));

		expect(mocks.track).toHaveBeenCalledWith('Instance AI nudge clicked', {
			trigger: 'workflow_created',
		});
		expect(mocks.routerPush).toHaveBeenCalledWith({
			name: INSTANCE_AI_VIEW,
			query: { source: 'nudge' },
		});
		expect(queryByTestId('instance-ai-nudge')).not.toBeInTheDocument();
	});
});
