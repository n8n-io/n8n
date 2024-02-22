import PersonalizationModal from '@/components/PersonalizationModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { PERSONALIZATION_MODAL_KEY, STORES } from '@/constants';
import { retry } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { fireEvent } from '@testing-library/vue';

const renderComponent = createComponentRenderer(PersonalizationModal, {
	props: {
		teleported: false,
		appendToBody: false,
	},
	pinia: createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modals: {
					[PERSONALIZATION_MODAL_KEY]: { open: true },
				},
			},
			[STORES.SETTINGS]: {
				settings: {
					templates: {
						host: '',
					},
				},
			},
		},
	}),
});

describe('PersonalizationModal.vue', () => {
	it('should render correctly', async () => {
		const wrapper = renderComponent();

		await retry(() =>
			expect(wrapper.container.querySelector('.modal-content')).toBeInTheDocument(),
		);

		expect(wrapper.container.querySelectorAll('.n8n-select').length).toEqual(5);
	});

	it('should display new option when role is "Devops", "Engineering", "IT", or "Sales and marketing"', async () => {
		const wrapper = renderComponent();

		await retry(() =>
			expect(wrapper.container.querySelector('.modal-content')).toBeInTheDocument(),
		);

		for (const index of [3, 4, 5, 6]) {
			const select = wrapper.container.querySelectorAll('.n8n-select')[1]!;

			await fireEvent.click(select);

			const item = select.querySelectorAll('.el-select-dropdown__item')[index];

			await fireEvent.click(item);

			await retry(() => {
				expect(wrapper.container.querySelectorAll('.n8n-select').length).toEqual(6);
				expect(wrapper.container.querySelector('[name^="automationGoal"]')).toBeInTheDocument();
			});
		}
	});
});
