import { createComponentRenderer } from '@/__tests__/render';
import type { useNDVStore } from '@/features/ndv/shared/ndv.store';
import userEvent from '@testing-library/user-event';
import { nextTick, reactive } from 'vue';
import OutputItemSelect from './OutputItemSelect.vue';

let mockNdvState: Pick<
	ReturnType<typeof useNDVStore>,
	| 'getHoveringItem'
	| 'ndvInputDataWithPinnedData'
	| 'expressionOutputItemIndex'
	| 'isTableHoverOnboarded'
>;

vi.mock('@/features/ndv/shared/ndv.store', () => ({
	injectNDVStore: () => ({ value: mockNdvState }),
}));

const renderComponent = createComponentRenderer(OutputItemSelect);

describe('OutputItemSelect', () => {
	it('names both navigation actions and blocks navigation past the last item', async () => {
		mockNdvState = reactive({
			getHoveringItem: null,
			ndvInputDataWithPinnedData: [{ json: {} }, { json: {} }],
			expressionOutputItemIndex: 1,
			isTableHoverOnboarded: false,
		});
		const user = userEvent.setup();
		const { getByRole } = renderComponent();
		const next = getByRole('button', { name: 'Next item' });
		const previous = getByRole('button', { name: 'Previous item' });
		expect(next).not.toBeDisabled();
		expect(next).toHaveAttribute('aria-disabled', 'true');
		next.focus();
		expect(next).toHaveFocus();
		await user.click(next);
		await user.keyboard('{Enter} ');
		expect(mockNdvState.expressionOutputItemIndex).toBe(1);

		await user.click(previous);
		expect(mockNdvState.expressionOutputItemIndex).toBe(0);
		expect(previous).toBeDisabled();
		expect(next).not.toHaveAttribute('aria-disabled');
		await user.click(next);
		expect(mockNdvState.expressionOutputItemIndex).toBe(1);

		mockNdvState.isTableHoverOnboarded = true;
		await nextTick();
		expect(next).toBeDisabled();
	});
});
