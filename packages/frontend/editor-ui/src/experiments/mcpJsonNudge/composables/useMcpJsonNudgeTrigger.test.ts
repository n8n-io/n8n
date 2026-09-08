const mockOpenModalWithData = vi.fn();
const mockCanShow = vi.hoisted(() => vi.fn());
const mockRecordImpression = vi.hoisted(() => vi.fn());

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		openModalWithData: mockOpenModalWithData,
	}),
}));

vi.mock('@/experiments/mcpJsonNudge/composables/useMcpJsonNudgeEligibility', () => ({
	useMcpJsonNudgeEligibility: () => ({
		canShow: mockCanShow,
		recordImpression: mockRecordImpression,
	}),
}));

import { MCP_JSON_NUDGE_MODAL_KEY } from '@/experiments/mcpJsonNudge/constants';
import { useMcpJsonNudgeTrigger } from './useMcpJsonNudgeTrigger';

describe('useMcpJsonNudgeTrigger', () => {
	beforeEach(() => {
		mockOpenModalWithData.mockClear();
		mockCanShow.mockReset().mockReturnValue(true);
		mockRecordImpression.mockClear();
	});

	it.each(['export', 'import_file', 'import_url'] as const)(
		'opens the MCP JSON nudge modal and records an impression for the %s surface when eligible',
		(surface) => {
			const { trigger } = useMcpJsonNudgeTrigger();

			trigger(surface);

			expect(mockOpenModalWithData).toHaveBeenCalledWith({
				name: MCP_JSON_NUDGE_MODAL_KEY,
				data: { surface },
			});
			expect(mockRecordImpression).toHaveBeenCalled();
		},
	);

	it('does not open the modal or record an impression when ineligible', () => {
		mockCanShow.mockReturnValue(false);
		const { trigger } = useMcpJsonNudgeTrigger();

		trigger('export');

		expect(mockOpenModalWithData).not.toHaveBeenCalled();
		expect(mockRecordImpression).not.toHaveBeenCalled();
	});
});
