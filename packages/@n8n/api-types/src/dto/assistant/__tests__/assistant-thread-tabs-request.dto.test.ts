import { AssistantThreadTabsRequestDto } from '../assistant-thread-tabs-request.dto';

describe('AssistantThreadTabsRequestDto', () => {
	const state = {
		tabs: [{ type: 'workflow' as const, id: 'wf-1', name: 'Digest' }],
		closedTabs: [],
		activeTab: { type: 'workflow' as const, id: 'wf-1' },
	};

	// The save endpoint stores the parsed payload as it is, so it must hold only schema keys.
	it('strips unknown keys, also inside the tabs', () => {
		const result = AssistantThreadTabsRequestDto.safeParse({
			...state,
			unknownKey: 'dropped',
			tabs: [{ ...state.tabs[0], unknownKey: 'dropped' }],
		});

		expect(result.success).toBe(true);
		expect(result.data).toEqual(state);
	});

	it('keeps previewOpen when it is sent, and leaves it out when it is not', () => {
		expect(AssistantThreadTabsRequestDto.safeParse({ ...state, previewOpen: false }).data).toEqual({
			...state,
			previewOpen: false,
		});
		expect(AssistantThreadTabsRequestDto.safeParse(state).data).not.toHaveProperty('previewOpen');
	});
});
