import type { IUser } from '@n8n/rest-api-client';
import { useUsersStore } from '@n8n/stores/users.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { mock } from 'vitest-mock-extended';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import type { PromotionEnvironment } from '../promotionsSettings.api';
import PromotionEnvironmentCard from './PromotionEnvironmentCard.vue';

const timestamps = {
	createdAt: '2026-09-01T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
};

const applyEnvironment: PromotionEnvironment = {
	id: 'environment-apply',
	name: 'Development',
	scope: 'instance',
	direction: 'apply',
	remote: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/workflows.git' },
	provider: {
		id: 'provider-ssh',
		name: 'Company Git',
		type: 'git',
		authType: 'ssh-key',
		...timestamps,
	},
	settings: { schemaVersion: 1, branchName: 'main' },
	checkout: { hasCheckout: true, matchesEnvironment: true },
	...timestamps,
};

const renderComponent = createComponentRenderer(PromotionEnvironmentCard, {
	props: { environment: applyEnvironment, canConnect: true },
});

describe('PromotionEnvironmentCard new projects', () => {
	beforeEach(() => {
		createTestingPinia();
		mockedStore(useUsersStore).currentUser = mock<IUser>({ globalScopes: ['promotions:apply'] });
	});

	it('offers Add missing projects when projects are missing', async () => {
		const { getByTestId, findByTestId } = renderComponent();
		const button = getByTestId('apply-new-projects-button');

		expect(button).toHaveTextContent('Add 3 missing projects');
		expect(button).toBeEnabled();

		await userEvent.hover(button);
		expect(await findByTestId('tooltip-content')).toHaveTextContent(
			"Add projects from Development that don't exist on this instance.",
		);

		await userEvent.click(button);
		expect(getByTestId('apply-new-projects-dialog')).toBeInTheDocument();
	});

	it('keeps the button without a count when every project is already on this instance', async () => {
		const { getByTestId, findByTestId } = renderComponent({
			props: { environment: applyEnvironment, canConnect: true, missingProjects: [] },
		});
		const button = getByTestId('apply-new-projects-button');

		expect(button).toHaveTextContent('Add missing projects');
		expect(button).not.toHaveTextContent(/\d/);
		expect(button).toBeDisabled();

		await userEvent.hover(button.parentElement!);
		expect(await findByTestId('tooltip-content')).toHaveTextContent(
			'No missing projects to add, this instance is in sync with Development.',
		);
	});

	it('hides the section on a promote environment', () => {
		const promoteEnvironment = {
			...applyEnvironment,
			direction: 'promote',
			settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
		} as PromotionEnvironment;
		const { queryByTestId } = renderComponent({
			props: { environment: promoteEnvironment, canConnect: true },
		});

		expect(queryByTestId('apply-new-projects-button')).not.toBeInTheDocument();
	});
});
