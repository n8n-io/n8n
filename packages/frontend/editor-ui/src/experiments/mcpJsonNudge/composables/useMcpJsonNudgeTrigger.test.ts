const mockOpenModalWithData = vi.fn();
const mockIsModalActiveById = vi.hoisted(() => ({}) as Record<string, boolean>);
const mockCanShow = vi.hoisted(() => vi.fn());
const mockRecordImpression = vi.hoisted(() => vi.fn());
const mockTrack = vi.hoisted(() => vi.fn());

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		openModalWithData: mockOpenModalWithData,
		isModalActiveById: mockIsModalActiveById,
	}),
}));

vi.mock('@/experiments/mcpJsonNudge/composables/useMcpJsonNudgeEligibility', () => ({
	useMcpJsonNudgeEligibility: () => ({
		canShow: mockCanShow,
		recordImpression: mockRecordImpression,
	}),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mockTrack }),
}));

import { MCP_JSON_NUDGE_MODAL_KEY } from '@/experiments/mcpJsonNudge/constants';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { useMcpJsonNudgeTrigger } from './useMcpJsonNudgeTrigger';

describe('useMcpJsonNudgeTrigger', () => {
	beforeEach(() => {
		mockOpenModalWithData.mockClear();
		for (const key of Object.keys(mockIsModalActiveById)) delete mockIsModalActiveById[key];
		mockCanShow.mockReset().mockReturnValue(true);
		mockRecordImpression.mockClear();
		mockTrack.mockClear();
	});

	// A second export/import can start while the nudge is open (e.g. via the command
	// palette). It must not replace the pending onContinue and lose the first action.
	it('runs the action immediately when the nudge modal is already open', async () => {
		mockIsModalActiveById[MCP_JSON_NUDGE_MODAL_KEY] = true;
		const action = vi.fn();
		const { gate } = useMcpJsonNudgeTrigger();

		await gate('import_file', action);

		expect(action).toHaveBeenCalledTimes(1);
		expect(mockOpenModalWithData).not.toHaveBeenCalled();
		expect(mockRecordImpression).not.toHaveBeenCalled();
		expect(mockTrack).not.toHaveBeenCalled();
	});

	describe('when eligible', () => {
		it.each(['export', 'import_file', 'import_url', 'copy', 'paste'] as const)(
			'opens the modal for the %s surface, defers the action to onContinue, records an impression, and tracks the view',
			async (surface) => {
				const action = vi.fn();
				const { gate } = useMcpJsonNudgeTrigger();

				await gate(surface, action);

				expect(mockOpenModalWithData).toHaveBeenCalledWith({
					name: MCP_JSON_NUDGE_MODAL_KEY,
					data: { surface, onContinue: action },
				});
				expect(mockRecordImpression).toHaveBeenCalled();
				expect(mockTrack).toHaveBeenCalledWith(TELEMETRY_EVENT.MCP.MCP_NUDGE_VIEWED, { surface });
				expect(action).not.toHaveBeenCalled();
			},
		);
	});

	describe('when ineligible', () => {
		it('runs the action immediately without opening the modal, recording an impression, or tracking', async () => {
			mockCanShow.mockReturnValue(false);
			const action = vi.fn();
			const { gate } = useMcpJsonNudgeTrigger();

			await gate('export', action);

			expect(action).toHaveBeenCalledTimes(1);
			expect(mockOpenModalWithData).not.toHaveBeenCalled();
			expect(mockRecordImpression).not.toHaveBeenCalled();
			expect(mockTrack).not.toHaveBeenCalled();
		});

		it('awaits an async action', async () => {
			mockCanShow.mockReturnValue(false);
			let settled = false;
			const action = vi.fn(async () => {
				await Promise.resolve();
				settled = true;
			});
			const { gate } = useMcpJsonNudgeTrigger();

			await gate('import_file', action);

			expect(settled).toBe(true);
		});
	});
});
