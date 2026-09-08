const mockOpenModalWithData = vi.fn();

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		openModalWithData: mockOpenModalWithData,
	}),
}));

import { MCP_JSON_NUDGE_MODAL_KEY } from '@/experiments/mcpJsonNudge/constants';
import { useMcpJsonNudgeTrigger } from './useMcpJsonNudgeTrigger';

describe('useMcpJsonNudgeTrigger', () => {
	beforeEach(() => {
		mockOpenModalWithData.mockClear();
	});

	it.each(['export', 'import_file', 'import_url'] as const)(
		'opens the MCP JSON nudge modal for the %s surface',
		(surface) => {
			const { trigger } = useMcpJsonNudgeTrigger();

			trigger(surface);

			expect(mockOpenModalWithData).toHaveBeenCalledWith({
				name: MCP_JSON_NUDGE_MODAL_KEY,
				data: { surface },
			});
		},
	);
});
