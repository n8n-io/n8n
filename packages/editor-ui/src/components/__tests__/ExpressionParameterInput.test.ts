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

	it('should emitting open extended expression editor', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				modelValue: '',
			},
		});

		await userEvent.click(getByTestId('expander'));
		expect(emitted().modalOpenerClick).toEqual(expect.anything());
	});
});
