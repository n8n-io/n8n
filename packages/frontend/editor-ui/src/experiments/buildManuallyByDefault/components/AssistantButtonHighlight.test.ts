import { reactive } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import AssistantButtonHighlight from './AssistantButtonHighlight.vue';

const store = reactive({
	isAssistantButtonHighlightPending: false,
	consumeAssistantButtonHighlight: vi.fn(() => {
		store.isAssistantButtonHighlightPending = false;
		return true;
	}),
});

vi.mock('../stores/buildManuallyByDefault.store', () => ({
	useBuildManuallyByDefaultStore: () => store,
}));

const render = createComponentRenderer(AssistantButtonHighlight);

describe('AssistantButtonHighlight', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		store.isAssistantButtonHighlightPending = false;
	});

	afterEach(() => vi.useRealTimers());

	it('shows no tip until the composer minimizes', () => {
		const { queryByTestId } = render({ slots: { default: '<button>Assistant</button>' } });

		expect(queryByTestId('canvas-assistant-button-tip')).not.toBeInTheDocument();
	});

	it('shows the tip after a minimize and hides it when the animation ends', async () => {
		const { findByTestId, queryByTestId } = render({
			slots: { default: '<button>Assistant</button>' },
		});

		store.isAssistantButtonHighlightPending = true;

		expect(await findByTestId('canvas-assistant-button-tip')).toBeInTheDocument();
		await vi.advanceTimersByTimeAsync(560 + 3600);
		expect(queryByTestId('canvas-assistant-button-tip')).not.toBeInTheDocument();
	});

	it('restarts the highlight when the composer minimizes again during it', async () => {
		const { findByTestId, queryByTestId } = render({
			slots: { default: '<button>Assistant</button>' },
		});

		store.isAssistantButtonHighlightPending = true;
		await findByTestId('canvas-assistant-button-tip');
		await vi.advanceTimersByTimeAsync(3000);

		store.isAssistantButtonHighlightPending = true;
		await vi.advanceTimersByTimeAsync(3000);

		// The first cycle would have ended by now. The second one keeps the tip.
		expect(queryByTestId('canvas-assistant-button-tip')).toBeInTheDocument();
		expect(store.consumeAssistantButtonHighlight).toHaveBeenCalledTimes(2);
	});
});
