import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';

import { outsideAccess, personal } from '../__tests__/unresolved.fixtures';
import PromotionUnresolvedSummary from './PromotionUnresolvedSummary.vue';

const renderComponent = createComponentRenderer(PromotionUnresolvedSummary);

describe('PromotionUnresolvedSummary', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('should say why the dependencies are left out, in the verb of the page', () => {
		const apply = renderComponent({ props: { dependencies: outsideAccess, direction: 'apply' } });
		expect(apply.getByTestId('promotion-unresolved-summary')).toHaveTextContent(
			'These are outside your access, so you cannot apply them. Workflows that use them cannot be published until they exist here.',
		);
		apply.unmount();

		const promote = renderComponent({
			props: { dependencies: outsideAccess, direction: 'promote' },
		});
		expect(promote.getByTestId('promotion-unresolved-summary')).toHaveTextContent(
			'These are outside your access, so you cannot promote them.',
		);
	});

	it('should list each dependency with its type and the workflows that use it', () => {
		const { getByTestId } = renderComponent({
			props: { dependencies: outsideAccess, direction: 'apply' },
		});

		const list = getByTestId('promotion-unresolved-list');
		expect(list).toHaveTextContent('Billing database');
		expect(list).toHaveTextContent('Credential. Used by Sync orders.');
		// Two names show, and the rest is a count.
		expect(list).toHaveTextContent('Workflow. Used by Sync orders, Churn alert and 2 more.');
	});

	it('should use the singular for one dependency', () => {
		const { getByTestId } = renderComponent({
			props: { dependencies: [outsideAccess[0]], direction: 'apply' },
		});

		expect(getByTestId('promotion-unresolved-summary')).toHaveTextContent(
			'This is outside your access, so you cannot apply it.',
		);
	});

	it('should give a credential in a personal project its own sentence', () => {
		const { getByTestId, getAllByTestId } = renderComponent({
			props: { dependencies: [...outsideAccess, ...personal], direction: 'promote' },
		});

		const summary = getByTestId('promotion-unresolved-summary');
		expect(summary).toHaveTextContent('These are outside your access, so you cannot promote them.');
		expect(summary).toHaveTextContent(
			'This credential is in a personal project, so you cannot promote it. Move it to a team project to promote it.',
		);
		expect(getAllByTestId('promotion-unresolved-list')).toHaveLength(2);
	});
});
