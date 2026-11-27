import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

import {
	BUILD_MANUALLY_BY_DEFAULT_EXPERIMENT as EXPERIMENT,
	NEW_CLOUD_ONBOARDING_TRACKS as TRACKS,
} from '@/app/constants/experiments';

import {
	LANDED_ON_CANVAS_STORAGE_KEY,
	useBuildManuallyByDefaultStore,
} from './buildManuallyByDefault.store';

const { mockTrack, mockGetVariant, mockFetchOAuthClientsPreview } = vi.hoisted(() => ({
	mockTrack: vi.fn(),
	mockGetVariant: vi.fn(),
	mockFetchOAuthClientsPreview: vi.fn(),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mockTrack }),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ getVariant: mockGetVariant }),
}));

vi.mock('@n8n/frontend-module-mcp', () => ({
	useMCPStore: () => ({ fetchOAuthClientsPreview: mockFetchOAuthClientsPreview }),
}));

let track: string | undefined = TRACKS.buildManually;
let arm: unknown;

/** Sets the arm of this experiment. The track flag keeps its own value. */
function setArm(value: unknown) {
	arm = value;
}

const composerPayload = {
	variant: EXPERIMENT.canvasComposer,
	[`$feature/${EXPERIMENT.name}`]: EXPERIMENT.canvasComposer,
};

function setMcpAccess(enabled: boolean) {
	useSettingsStore().moduleSettings = {
		mcp: {
			mcpAccessEnabled: enabled,
			mcpManagedByEnv: false,
			autoExposeNewWorkflows: false,
			preferencesEnabled: false,
		},
	};
}

describe('buildManuallyByDefault store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.clear();
		vi.clearAllMocks();
		track = TRACKS.buildManually;
		arm = undefined;
		mockGetVariant.mockImplementation((name: string) => (name === TRACKS.name ? track : arm));
		setMcpAccess(true);
		useUsersStore().currentUserId = 'user-1';
	});

	describe('currentVariant', () => {
		it.each([EXPERIMENT.control, EXPERIMENT.canvas, EXPERIMENT.canvasComposer])(
			'returns the %s arm',
			(variant) => {
				setArm(variant);

				expect(useBuildManuallyByDefaultStore().currentVariant).toBe(variant);
			},
		);

		it.each([undefined, false, true, 'unknown'])('returns no arm for %s', (variant) => {
			setArm(variant);

			expect(useBuildManuallyByDefaultStore().currentVariant).toBeUndefined();
		});
	});

	describe('onboarding track', () => {
		it.each([TRACKS.assistantPrompt, undefined, false])(
			'enrolls nobody on the %s track, even with an arm',
			(value) => {
				track = value as string | undefined;
				setArm(EXPERIMENT.canvasComposer);
				const store = useBuildManuallyByDefaultStore();

				expect(store.currentVariant).toBeUndefined();
				expect(store.shouldLandOnCanvas).toBe(false);
				store.trackComposerShown();
				expect(mockTrack).not.toHaveBeenCalled();
			},
		);
	});

	describe('landing', () => {
		it.each([
			[EXPERIMENT.control, false],
			[EXPERIMENT.canvas, true],
			[EXPERIMENT.canvasComposer, true],
			[undefined, false],
		])('lands on the canvas for %s: %s', (variant, expected) => {
			setArm(variant);

			expect(useBuildManuallyByDefaultStore().shouldLandOnCanvas).toBe(expected);
		});

		it('lands on the canvas only once for each user', async () => {
			setArm(EXPERIMENT.canvas);
			const store = useBuildManuallyByDefaultStore();

			store.markLandedOnCanvas();
			// useStorage writes to localStorage in a watcher.
			await nextTick();

			expect(store.shouldLandOnCanvas).toBe(false);
			expect(localStorage.getItem(LANDED_ON_CANVAS_STORAGE_KEY)).toBe('["user-1"]');

			useUsersStore().currentUserId = 'user-2';
			expect(store.shouldLandOnCanvas).toBe(true);
		});

		it('keeps the landing of other users when it records a new one', async () => {
			setArm(EXPERIMENT.canvas);
			localStorage.setItem(LANDED_ON_CANVAS_STORAGE_KEY, '["user-0"]');
			const store = useBuildManuallyByDefaultStore();

			store.markLandedOnCanvas();
			await nextTick();

			expect(localStorage.getItem(LANDED_ON_CANVAS_STORAGE_KEY)).toBe('["user-0","user-1"]');
		});

		it('treats a malformed stored value as no landing', () => {
			setArm(EXPERIMENT.canvas);
			localStorage.setItem(LANDED_ON_CANVAS_STORAGE_KEY, 'true');

			expect(useBuildManuallyByDefaultStore().shouldLandOnCanvas).toBe(true);
		});

		it('does not land on the canvas without a signed-in user', () => {
			setArm(EXPERIMENT.canvas);
			useUsersStore().currentUserId = null;

			expect(useBuildManuallyByDefaultStore().shouldLandOnCanvas).toBe(false);
		});
	});

	describe('MCP connect row', () => {
		beforeEach(() => {
			setArm(EXPERIMENT.canvasComposer);
		});

		it('hides the row when the user has a connected client', async () => {
			mockFetchOAuthClientsPreview.mockResolvedValue([{ id: 'client' }]);
			const store = useBuildManuallyByDefaultStore();

			await store.refreshConnectedMcpClients();

			expect(mockFetchOAuthClientsPreview).toHaveBeenCalledWith(1);
			expect(store.showConnectRow).toBe(false);
		});

		it('shows the row when the user has no connected client', async () => {
			mockFetchOAuthClientsPreview.mockResolvedValue([]);
			const store = useBuildManuallyByDefaultStore();

			await store.refreshConnectedMcpClients();

			expect(store.showConnectRow).toBe(true);
		});

		it('shows the row without a request when MCP access is off', async () => {
			setMcpAccess(false);
			const store = useBuildManuallyByDefaultStore();

			await store.refreshConnectedMcpClients();

			expect(mockFetchOAuthClientsPreview).not.toHaveBeenCalled();
			expect(store.showConnectRow).toBe(true);
		});

		it('shows the row when the check fails', async () => {
			mockFetchOAuthClientsPreview.mockRejectedValue(new Error('network'));
			const store = useBuildManuallyByDefaultStore();

			await store.refreshConnectedMcpClients();

			expect(store.showConnectRow).toBe(true);
		});
	});

	describe('telemetry', () => {
		it('tracks the composer events with the experiment payload', () => {
			setArm(EXPERIMENT.canvasComposer);
			const store = useBuildManuallyByDefaultStore();

			store.trackComposerShown();
			store.trackComposerPromptSent('Send me a daily summary');
			store.trackConnectOptionClicked('claude');

			expect(mockTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.EMPTY_CANVAS_COMPOSER_SHOWN,
				composerPayload,
			);
			expect(mockTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.EMPTY_CANVAS_COMPOSER_PROMPT_SENT,
				{ ...composerPayload, prompt_length: 23 },
			);
			expect(mockTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.MCP.EMPTY_CANVAS_CONNECT_OPTION_CLICKED,
				{ ...composerPayload, client: 'claude' },
			);
		});

		it('highlights the Assistant button once after the composer minimizes', () => {
			setArm(EXPERIMENT.canvasComposer);
			const store = useBuildManuallyByDefaultStore();

			store.minimizeComposer();

			expect(mockTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.EMPTY_CANVAS_COMPOSER_MINIMIZED,
				composerPayload,
			);
			expect(store.consumeAssistantButtonHighlight()).toBe(true);
			expect(store.consumeAssistantButtonHighlight()).toBe(false);
			expect(mockTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.CANVAS_ASSISTANT_BUTTON_TIP_SHOWN,
				composerPayload,
			);
		});

		it.each([EXPERIMENT.control, EXPERIMENT.canvas])('tracks nothing for %s', (variant) => {
			setArm(variant);
			const store = useBuildManuallyByDefaultStore();

			store.trackComposerShown();
			store.trackComposerPromptSent('prompt');
			store.minimizeComposer();
			store.trackConnectOptionClicked('other_assistants');

			expect(mockTrack).not.toHaveBeenCalled();
			expect(store.consumeAssistantButtonHighlight()).toBe(false);
		});
	});
});
