import PersonalizationModal from '@/components/PersonalizationModal.vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { PERSONALIZATION_MODAL_KEY, ROLE, STORES, VIEWS } from '@/constants';
import { retry } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { fireEvent } from '@testing-library/vue';
import { useUsersStore } from '@/stores/users.store';
import { useUsageStore } from '@/stores/usage.store';

const pinia = createTestingPinia({
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
		[STORES.USERS]: {
			users: {
				123: {
					email: 'john@doe.com',
					firstName: 'John',
					lastName: 'Doe',
					isDefaultUser: false,
					isPendingUser: false,
					role: ROLE.Owner,
					mfaEnabled: false,
				},
			},
			currentUserId: '123',
		},
	},
});

const renderComponent = createComponentRenderer(PersonalizationModal, {
	props: {
		teleported: false,
		appendToBody: false,
	},
	pinia,
	global: {
		mocks: {
			$route: {
				name: VIEWS.NEW_WORKFLOW,
			},
		},
	},
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
			const expectFn = expect; // So we don't break @typescript-eslint/no-loop-func
			const select = wrapper.container.querySelectorAll('.n8n-select')[1];

			await fireEvent.click(select);

			const item = select.querySelectorAll('.el-select-dropdown__item')[index];

			await fireEvent.click(item);

			await retry(() => {
				expectFn(wrapper.container.querySelectorAll('.n8n-select').length).toEqual(6);
				expectFn(wrapper.container.querySelector('[name^="automationGoal"]')).toBeInTheDocument();
			});
		}
	});

	it('should display self serve trial option when company size is larger than 500', async () => {
		const wrapper = renderComponent();

		await retry(() =>
			expect(wrapper.container.querySelector('.modal-content')).toBeInTheDocument(),
		);

		const select = wrapper.container.querySelectorAll('.n8n-select')[3];
		await fireEvent.click(select);

		const item = select.querySelectorAll('.el-select-dropdown__item')[3];
		await fireEvent.click(item);

		await retry(() => {
			expect(wrapper.container.querySelector('.card')).not.toBeNull();
		});
	});

	it('should display send telemetry when requesting enterprise trial', async () => {
		const usersStore = useUsersStore(pinia);
		vi.spyOn(usersStore, 'submitPersonalizationSurvey').mockResolvedValue();

		const usageStore = useUsageStore(pinia);
		const spyLicenseTrial = vi.spyOn(usageStore, 'requestEnterpriseLicenseTrial');

		const wrapper = renderComponent();

		await retry(() =>
			expect(wrapper.container.querySelector('.modal-content')).toBeInTheDocument(),
		);

		const select = wrapper.container.querySelectorAll('.n8n-select')[3];
		await fireEvent.click(select);

		const item = select.querySelectorAll('.el-select-dropdown__item')[3];
		await fireEvent.click(item);

		const agreeCheckbox = wrapper.container.querySelector('.n8n-checkbox');
		assert(agreeCheckbox);
		await fireEvent.click(agreeCheckbox);

		const submitButton = wrapper.getByRole('button');
		await userEvent.click(submitButton);

		await retry(() => expect(spyLicenseTrial).toHaveBeenCalled());
	});
});
