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
		[true, 'not readonly', expect.anything()],
		[false, 'readonly', undefined],
	])('emitting open expression editor modal should be %s when %s', async (allowed, _, expected) => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				modelValue: '',
				isReadOnly: !allowed,
			},
		});

		await userEvent.click(getByTestId('expander'));
		expect(emitted().modalOpenerClick).toEqual(expected);
	});
});
