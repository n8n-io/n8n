import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';

import { outsideAccess, personal } from '../__tests__/unresolved.fixtures';
import PromotionUnresolvedSummary from './PromotionUnresolvedSummary.vue';

const renderComponent = createComponentRenderer(PromotionUnresolvedSummary);

describe('PromotionUnresolvedSummary', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it("should name the workflows that can't be published, in the verb of the page", () => {
		const apply = renderComponent({ props: { dependencies: outsideAccess, direction: 'apply' } });
		expect(apply.getByTestId('promotion-unresolved-summary')).toHaveTextContent(
			"4 workflows can't be published because their dependencies don't exist here.",
		);
		apply.unmount();

		const promote = renderComponent({
			props: { dependencies: outsideAccess, direction: 'promote' },
		});
		expect(promote.getByTestId('promotion-unresolved-summary')).toHaveTextContent(
			"4 workflows can't be published because their dependencies can't be promoted.",
		);
	});

	it('should list each workflow with the dependencies that it misses', () => {
		const { getByTestId } = renderComponent({
			props: { dependencies: [...outsideAccess, ...personal], direction: 'apply' },
		});

		const list = getByTestId('promotion-unresolved-list');
		// Sync orders uses all three. Two names show, and the rest is a count.
		expect(list).toHaveTextContent(
			'Sync ordersMissing Billing database, Normalize contact data and 1 more.',
		);
		expect(list).toHaveTextContent('Churn alertMissing Normalize contact data.');
	});

	it('should use the singular for one workflow', () => {
		const { getByTestId } = renderComponent({
			props: { dependencies: [outsideAccess[0]], direction: 'apply' },
		});

		expect(getByTestId('promotion-unresolved-summary')).toHaveTextContent(
			"1 workflow can't be published because its dependency doesn't exist here.",
		);
	});

	it('should list the dependencies when no workflow uses them', () => {
		const { getByTestId } = renderComponent({
			props: { dependencies: [{ ...outsideAccess[0], consumers: [] }], direction: 'promote' },
		});

		expect(getByTestId('promotion-unresolved-summary')).toHaveTextContent(
			'1 dependency is not promoted.',
		);
		expect(getByTestId('promotion-unresolved-list')).toHaveTextContent('Billing database');
	});
});
