import type { PolicyViolation } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import PolicyViolationToastBody from './PolicyViolationToastBody.vue';

const slackOnInstance: PolicyViolation = {
	kind: 'node-type-unavailable',
	checkId: 'node-type-availability',
	message: 'Node type "n8n-nodes-base.slack" is blocked',
	subject: 'n8n-nodes-base.slack',
	subjectType: 'nodeType',
	scope: 'instance',
};

const renderComponent = createComponentRenderer(PolicyViolationToastBody, {
	props: {
		title: 'Imported with 1 restricted item',
		description: 'The workflow was imported.',
		violations: [slackOnInstance],
		labelOf: () => 'Slack',
	},
});

describe('PolicyViolationToastBody', () => {
	it('shows the title, the description and the grouped violations', () => {
		const { getByText, getByTestId } = renderComponent();

		expect(getByText('Imported with 1 restricted item')).toBeVisible();
		expect(getByText('The workflow was imported.')).toBeVisible();
		expect(getByText('Restricted on this instance')).toBeVisible();
		expect(getByTestId('policy-violation')).toHaveTextContent('Slack node');
	});

	it('passes a jump on a jumpable violation through', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { isJumpable: () => true } });

		await userEvent.click(getByTestId('policy-violation-jump'));

		expect(emitted('jump')).toEqual([[slackOnInstance]]);
	});
});
