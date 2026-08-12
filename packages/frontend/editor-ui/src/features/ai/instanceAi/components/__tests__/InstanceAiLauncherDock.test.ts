import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { computed } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import type { ProactiveOffer } from '../../instanceAiPanel.types';
import InstanceAiLauncherDock from '../InstanceAiLauncherDock.vue';

const mocks = vi.hoisted(() => ({
	instanceAiAvailable: true,
	activeOffer: null as ProactiveOffer | null,
	accept: vi.fn(),
	dismiss: vi.fn(),
	toggle: vi.fn(),
	isPanelOpen: false,
	activeThreadId: null as string | null,
	getRuntime: vi.fn(),
	clearAllStickyNotifications: vi.fn(),
}));

vi.mock('../../composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => computed(() => mocks.instanceAiAvailable),
}));

vi.mock('../../composables/useInstanceAiProactiveOffer', () => ({
	useInstanceAiProactiveOffer: () => ({
		activeOffer: computed(() => mocks.activeOffer),
		accept: mocks.accept,
		dismiss: mocks.dismiss,
	}),
}));

vi.mock('../../instanceAiPanel.store', () => ({
	useInstanceAiPanelStore: () => ({
		get isOpen() {
			return mocks.isPanelOpen;
		},
		get activeThreadId() {
			return mocks.activeThreadId;
		},
		toggle: mocks.toggle,
		close: vi.fn(),
		expandToFullView: vi.fn(),
	}),
}));

vi.mock('../../instanceAi.store', () => ({
	useInstanceAiStore: () => ({
		getRuntime: mocks.getRuntime,
	}),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({
		clearAllStickyNotifications: mocks.clearAllStickyNotifications,
		showMessage: vi.fn(),
		showToast: vi.fn(),
		showError: vi.fn(),
	}),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/i18n')>()),
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'instanceAi.proactiveOffer.cta': 'I can help with this',
				'instanceAi.floatingPanel.expand': 'Open full view',
				'instanceAi.floatingPanel.starting': 'Starting conversation…',
				'instanceAi.backgroundTask.running': 'Working in the background...',
				'aiAssistant.name': 'n8n AI',
			})[key] ?? key,
	}),
}));

const offer: ProactiveOffer = {
	key: 'execution-error:4711',
	title: 'Execution failed in ‘HTTP Request’ node',
	message: 'Help me understand this error.',
	source: 'proactive_offer',
};

const renderComponent = createComponentRenderer(InstanceAiLauncherDock, {
	pinia: createTestingPinia(),
});

describe('InstanceAiLauncherDock', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.instanceAiAvailable = true;
		mocks.activeOffer = null;
		mocks.isPanelOpen = false;
		mocks.activeThreadId = null;
		mocks.getRuntime.mockReturnValue(undefined);
	});

	it('is a bare circle until an offer stands', () => {
		const { queryByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-launcher-button')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-launcher-cta')).not.toBeInTheDocument();
	});

	it('grows into a labelled pill while an offer stands', () => {
		mocks.activeOffer = offer;

		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-launcher-cta')).toHaveTextContent('I can help with this');
		expect(getByTestId('instance-ai-launcher-button')).toHaveAccessibleName('I can help with this');
	});

	it('prefers a label the offer supplies', () => {
		mocks.activeOffer = { ...offer, cta: 'Want me to take a look?' };

		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-launcher-cta')).toHaveTextContent('Want me to take a look?');
	});

	it('clears sticky error toasts when the panel is opened', async () => {
		const user = userEvent.setup();
		const { getByTestId } = renderComponent();

		await user.click(getByTestId('instance-ai-launcher-button'));

		expect(mocks.clearAllStickyNotifications).toHaveBeenCalled();
		expect(mocks.toggle).toHaveBeenCalled();
	});

	it('clears sticky error toasts when the offer is accepted', async () => {
		mocks.activeOffer = offer;
		const user = userEvent.setup();
		const { getByTestId } = renderComponent();

		await user.click(getByTestId('instance-ai-launcher-button'));

		expect(mocks.clearAllStickyNotifications).toHaveBeenCalled();
		expect(mocks.accept).toHaveBeenCalled();
		expect(mocks.toggle).not.toHaveBeenCalled();
	});

	it('leaves toasts alone when the launcher only closes the panel', async () => {
		mocks.isPanelOpen = true;
		const user = userEvent.setup();
		const { getByTestId } = renderComponent();

		await user.click(getByTestId('instance-ai-launcher-button'));

		expect(mocks.clearAllStickyNotifications).not.toHaveBeenCalled();
		expect(mocks.toggle).toHaveBeenCalled();
	});

	it('renders nothing when Instance AI is unavailable', () => {
		mocks.instanceAiAvailable = false;

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-launcher-dock')).not.toBeInTheDocument();
	});

	it('pulses the launcher while the active thread is working', () => {
		mocks.activeThreadId = 'thread-1';
		mocks.getRuntime.mockReturnValue({
			isHydratingThread: false,
			isStreaming: true,
			isSendingMessage: false,
			messages: [],
		});

		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-launcher-working')).toBeInTheDocument();
		expect(getByTestId('instance-ai-launcher-button')).toHaveAttribute('aria-busy', 'true');
		expect(getByTestId('instance-ai-launcher-button')).toHaveAccessibleName(
			'Working in the background...',
		);
	});
});
