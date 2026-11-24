import type { PromotionMissingDependency } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { within } from '@testing-library/vue';

import {
	deletedWorkflowWarning,
	otherProjectCredential,
	outsideAccessWorkflow,
	personalCredential,
} from '../__tests__/missingDependencies.fixtures';
import PromotionMissingDependencyList from './PromotionMissingDependencyList.vue';

const renderComponent = createComponentRenderer(PromotionMissingDependencyList);

/** A group of an Apply. A Promote does not use it. */
const needsAction: PromotionMissingDependency = {
	...otherProjectCredential,
	id: 'c9',
	name: 'Stripe key',
	group: 'needs-action',
	reason: 'not-on-instance',
	blocking: true,
};

const dependencies = [
	otherProjectCredential,
	outsideAccessWorkflow,
	personalCredential,
	needsAction,
	deletedWorkflowWarning,
];

const statusOf = (row: HTMLElement) =>
	within(row).queryByTestId('promotion-missing-dependency-status');

describe('PromotionMissingDependencyList', () => {
	it('shows the name, the type and the workflows of each dependency', () => {
		const { getAllByTestId } = renderComponent({ props: { dependencies } });

		// The second child of a row is its text. The first one is the icon.
		const texts = getAllByTestId('promotion-missing-dependency').map((row) =>
			row.children[1].textContent?.trim(),
		);
		expect(texts).toEqual([
			'CRM keyCredential · Used by Invoice reconciliation',
			'Send audit logWorkflow · Used by Invoice reconciliation, Weekly KPI report',
			'Personal GmailCredential · Used by Weekly KPI report',
			'Stripe keyCredential · Used by Invoice reconciliation',
			'Archive invoicesWorkflow · Used by Invoice reconciliation',
		]);
	});

	it('shows the status of each group of a Promote as text', () => {
		const { getAllByTestId } = renderComponent({ props: { dependencies } });

		const rows = getAllByTestId('promotion-missing-dependency');
		// A group of an Apply and a warning have no status.
		expect(rows.map((row) => statusOf(row)?.textContent?.trim() ?? null)).toEqual([
			'Not included',
			'No access',
			'Personal project',
			null,
			null,
		]);
		// The status comes after the text. A row without a status holds only the icon and the text.
		expect(rows[0].lastElementChild).toBe(statusOf(rows[0]));
		expect(rows.map((row) => row.children.length)).toEqual([3, 3, 3, 2, 2]);
	});

	it('says that the user has no access to a dependency of a personal project', () => {
		const unreachable = { ...personalCredential, id: 'c8', accessible: false };
		const { getAllByTestId } = renderComponent({
			props: { dependencies: [personalCredential, unreachable] },
		});

		const rows = getAllByTestId('promotion-missing-dependency');
		expect(rows.map((row) => statusOf(row)?.textContent?.trim())).toEqual([
			'Personal project',
			'Personal project · No access',
		]);
	});

	it('does not show a project or an owner in a status of a dependency that the user cannot access', () => {
		const { getAllByTestId } = renderComponent({
			props: { dependencies: [outsideAccessWorkflow] },
		});

		const [row] = getAllByTestId('promotion-missing-dependency');
		expect(row).not.toHaveTextContent('Billing');
		expect(row).not.toHaveTextContent(/project|owner/i);
	});
});
