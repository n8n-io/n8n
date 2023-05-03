import { PiniaVuePlugin } from 'pinia';
import { createLocalVue, mount } from '@vue/test-utils';
import PersonalizationModal from '@/components/PersonalizationModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { PERSONALIZATION_MODAL_KEY } from '@/constants';
import { retry } from '@/__tests__/utils';

describe('PersonalizationModal.vue', () => {
	const pinia = createTestingPinia({
		initialState: {
			ui: {
				modals: {
					[PERSONALIZATION_MODAL_KEY]: { open: true },
				},
			},
			settings: {
				settings: {
					templates: {
						host: '',
					},
				},
			},
		},
	});
	const localVue = createLocalVue();
	localVue.use(PiniaVuePlugin);

	it('should render correctly', async () => {
		const wrapper = mount(PersonalizationModal, {
			localVue,
			pinia,
		});

		await retry(() => expect(wrapper.find('.modal-content').exists()).toBe(true));

		expect(wrapper.findAll('.n8n-select').length).toEqual(5);
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should display new option when role is "Devops", "Engineering", "IT", or "Sales and marketing"', async () => {
		const wrapper = mount(PersonalizationModal, {
			localVue,
			pinia,
		});

		await retry(() => expect(wrapper.find('.modal-content').exists()).toBe(true));

		for (const index of [3, 4, 5, 6]) {
			wrapper.find('.n8n-select[name="role"]').trigger('click');
			wrapper
				.find('.n8n-select[name="role"]')
				.findAll('.el-select-dropdown__item')
				.at(index)
				.trigger('click');

			await retry(() => {
				expect(wrapper.findAll('.n8n-select').length).toEqual(6);
				expect(wrapper.find('.n8n-select[name^="automationGoal"]').exists()).toBe(true);
			});
		}
	});
});
