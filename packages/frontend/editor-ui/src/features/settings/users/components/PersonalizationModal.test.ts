import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems } from '@/__tests__/utils';
import PersonalizationModal from './PersonalizationModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import { COMMUNITY_PLUS_ENROLLMENT_MODAL } from '@/features/settings/usage/usage.constants';
import {
	COMPANY_TYPE_KEY,
	COMPANY_INDUSTRY_EXTENDED_KEY,
	OTHER_COMPANY_INDUSTRY_EXTENDED_KEY,
	MARKETING_AUTOMATION_GOAL_KEY,
	OTHER_MARKETING_AUTOMATION_GOAL_KEY,
	ROLE_KEY,
	ROLE_OTHER_KEY,
	DEVOPS_AUTOMATION_GOAL_OTHER_KEY,
	DEVOPS_AUTOMATION_GOAL_KEY,
	REPORTED_SOURCE_KEY,
} from '../users.constants';

vi.mock('vue-router', () => ({
	useRouter: () => ({
		replace: vi.fn(),
	}),
	useRoute: () => ({
		location: {},
	}),
	RouterLink: vi.fn(),
}));

const renderModal = createComponentRenderer(PersonalizationModal, {
	global: {
		stubs: {
			Modal: {
				template: `
					<div>
						<slot name="header" />
						<slot name="title" />
						<slot name="content" />
						<slot name="footer" />
					</div>
				`,
			},
		},
	},
});

describe('PersonalizationModal', () => {
	it('mounts', () => {
		const { getByTitle } = renderModal({ pinia: createTestingPinia() });
		expect(getByTitle('Customize n8n to you')).toBeInTheDocument();
	});

	describe('Company field', () => {
		it('allows completion of company related fields', async () => {
			const { getByTestId } = renderModal({ pinia: createTestingPinia() });

			const companyTypeSelect = getByTestId(COMPANY_TYPE_KEY);

			const otherTypeOfCompanyOption = [...(await getDropdownItems(companyTypeSelect))].find(
				(node) => node.textContent === 'Other',
			) as Element;

			await userEvent.click(otherTypeOfCompanyOption);

			const industrySelect = getByTestId(COMPANY_INDUSTRY_EXTENDED_KEY);
			expect(industrySelect).toBeInTheDocument();

			const otherIndustryOption = [...(await getDropdownItems(industrySelect))].find(
				(node) => node.textContent === 'Other (please specify)',
			) as Element;

			await userEvent.click(otherIndustryOption);

			expect(getByTestId(OTHER_COMPANY_INDUSTRY_EXTENDED_KEY)).toBeInTheDocument();
		});

		it('shows only company and source select when not used for work', async () => {
			const { getByTestId, baseElement } = renderModal({ pinia: createTestingPinia() });

			const companyTypeSelect = getByTestId(COMPANY_TYPE_KEY);

			const nonWorkOption = [...(await getDropdownItems(companyTypeSelect))].find(
				(node) => node.textContent === "I'm not using n8n for work",
			) as Element;

			await userEvent.click(nonWorkOption);

			expect(baseElement.querySelectorAll('input').length).toBe(2);
		});
	});

	it('allows completion of role related fields', async () => {
		const { getByTestId, queryByTestId } = renderModal({ pinia: createTestingPinia() });

		const roleSelect = getByTestId(ROLE_KEY);
		const roleItems = [...(await getDropdownItems(roleSelect))];

		const devOps = roleItems.find((node) => node.textContent === 'Devops') as Element;
		const engineering = roleItems.find((node) => node.textContent === 'Engineering') as Element;
		const it = roleItems.find((node) => node.textContent === 'IT') as Element;
		const other = roleItems.find(
			(node) => node.textContent === 'Other (please specify)',
		) as Element;

		await userEvent.click(devOps);
		const automationGoalSelect = getByTestId(DEVOPS_AUTOMATION_GOAL_KEY);
		expect(automationGoalSelect).toBeInTheDocument();

		await userEvent.click(engineering);
		expect(automationGoalSelect).toBeInTheDocument();

		await userEvent.click(it);
		expect(automationGoalSelect).toBeInTheDocument();

		const otherGoalsItem = [...(await getDropdownItems(automationGoalSelect))].find(
			(node) => node.textContent === 'Other',
		) as Element;

		await userEvent.click(otherGoalsItem);
		expect(getByTestId(DEVOPS_AUTOMATION_GOAL_OTHER_KEY)).toBeInTheDocument();

		await userEvent.click(other);
		expect(queryByTestId(DEVOPS_AUTOMATION_GOAL_KEY)).not.toBeInTheDocument();
		expect(getByTestId(ROLE_OTHER_KEY)).toBeInTheDocument();
	});

	it('allows completion of marketing and sales related fields', async () => {
		const { getByTestId } = renderModal({ pinia: createTestingPinia() });

		const companyTypeSelect = getByTestId(COMPANY_TYPE_KEY);

		const anyWorkOption = [...(await getDropdownItems(companyTypeSelect))].find(
			(node) => node.textContent !== "I'm not using n8n for work",
		) as Element;

		await userEvent.click(anyWorkOption);

		const roleSelect = getByTestId(ROLE_KEY);
		const salesAndMarketingOption = [...(await getDropdownItems(roleSelect))].find(
			(node) => node.textContent === 'Sales and Marketing',
		) as Element;

		await userEvent.click(salesAndMarketingOption);

		const salesAndMarketingSelect = getByTestId(MARKETING_AUTOMATION_GOAL_KEY);
		const otherItem = [...(await getDropdownItems(salesAndMarketingSelect))].find(
			(node) => node.textContent === 'Other',
		) as Element;

		await userEvent.click(otherItem);
		expect(getByTestId(OTHER_MARKETING_AUTOMATION_GOAL_KEY)).toBeInTheDocument();
	});

	describe('Community Plus enrollment after submit', () => {
		const submitSurvey = async (deploymentType: 'default' | 'cloud') => {
			const pinia = createTestingPinia({ stubActions: false });
			const settingsStore = useSettingsStore(pinia);
			const usersStore = useUsersStore(pinia);
			const uiStore = useUIStore(pinia);

			settingsStore.settings.deployment = { type: deploymentType };
			usersStore.currentUserId = 'owner';
			usersStore.usersById = {
				owner: { id: 'owner', globalScopes: ['community:register'] } as never,
			};
			vi.spyOn(usersStore, 'submitPersonalizationSurvey').mockResolvedValue(undefined);
			const openModalWithData = vi.spyOn(uiStore, 'openModalWithData');

			const { getByTestId, getByText } = renderModal({ pinia });

			const companyTypeSelect = getByTestId(COMPANY_TYPE_KEY);
			await userEvent.click(
				[...(await getDropdownItems(companyTypeSelect))].find(
					(node) => node.textContent === "I'm not using n8n for work",
				) as Element,
			);

			const sourceSelect = getByTestId(REPORTED_SOURCE_KEY);
			await userEvent.click([...(await getDropdownItems(sourceSelect))][0]);

			await userEvent.click(getByText('Get started'));

			return openModalWithData;
		};

		it('opens the enrollment modal on self-hosted when the user can register', async () => {
			const openModalWithData = await submitSurvey('default');

			await vi.waitFor(() =>
				expect(openModalWithData).toHaveBeenCalledWith(
					expect.objectContaining({ name: COMMUNITY_PLUS_ENROLLMENT_MODAL }),
				),
			);
		});

		it('does not open the enrollment modal on cloud', async () => {
			const openModalWithData = await submitSurvey('cloud');

			await vi.waitFor(() =>
				expect(useUsersStore().submitPersonalizationSurvey).toHaveBeenCalled(),
			);
			expect(openModalWithData).not.toHaveBeenCalled();
		});
	});
});
