import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import ExpressionParameterInput from '@/components/ExpressionParameterInput.vue';

const renderComponent = createComponentRenderer(ExpressionParameterInput);

let pinia: ReturnType<typeof createPinia>;
let workflowsStore: ReturnType<typeof useWorkflowsStore>;
let ndvStore: ReturnType<typeof useNDVStore>;

describe('ExpressionParameterInput', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		workflowsStore = useWorkflowsStore();
		ndvStore = useNDVStore();
	});

	test.each([
		['not readonly', false, expect.anything()],
		['readonly', true, expect.anything()],
	])('should emit open expression editor modal when %s', async (_, isReadOnly, expected) => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				modelValue: '',
				isReadOnly,
			},
		});

		await userEvent.click(getByTestId('expander'));
		expect(emitted().modalOpenerClick).toEqual(expected);
	});
});
