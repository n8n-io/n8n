import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import ExpressionEditorModalInput from '@/components/ExpressionEditorModal/ExpressionEditorModalInput.vue';

const renderComponent = createComponentRenderer(ExpressionEditorModalInput);

const originalRangeGetBoundingClientRect = Range.prototype.getBoundingClientRect;
const originalRangeGetClientRects = Range.prototype.getClientRects;

describe('ExpressionParameterInput', () => {
	beforeAll(() => {
		Range.prototype.getBoundingClientRect = vi.fn();
		Range.prototype.getClientRects = () => ({
			item: vi.fn(),
			length: 0,
			[Symbol.iterator]: vi.fn(),
		});
	});

	afterAll(() => {
		Range.prototype.getBoundingClientRect = originalRangeGetBoundingClientRect;
		Range.prototype.getClientRects = originalRangeGetClientRects;
	});
	test.each([
		['not be editable', 'readonly', true, ''],
		['be editable', 'not readonly', false, 'test'],
	])('should %s when %s', async (_, __, isReadOnly, expected) => {
		const { getByRole } = renderComponent({
			props: {
				modelValue: '',
				path: '',
				isReadOnly,
			},
		});

		await userEvent.type(getByRole('textbox'), 'test');
		expect(getByRole('textbox')).toHaveTextContent(expected);
	});
});
