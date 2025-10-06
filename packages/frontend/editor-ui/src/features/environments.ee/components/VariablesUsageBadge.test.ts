import { createComponentRenderer } from '@/__tests__/render';
import VariablesUsageBadge from './VariablesUsageBadge.vue';
import userEvent from '@testing-library/user-event';

const renderComponent = createComponentRenderer(VariablesUsageBadge);

const showMessage = vi.fn();
vi.mock('@/composables/useToast', () => ({
	useToast: () => ({ showMessage }),
}));

const copy = vi.fn();
vi.mock('@/composables/useClipboard', () => ({
	useClipboard: () => ({ copy }),
}));

describe('VariablesUsageBadge', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should copy to the clipboard', async () => {
		const name = 'myVar';
		const output = `$vars.${name}`;
		const { getByText } = renderComponent({ props: { name } });
		await userEvent.click(getByText(output));

		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		expect(copy).toHaveBeenCalledWith(output);
	});
});
