import type { InstanceAiApprovalAskReason } from '@n8n/api-types';

import { createComponentRenderer } from '@/__tests__/render';

import ApprovalAskReason from './ApprovalAskReason.vue';

const renderComponent = createComponentRenderer(ApprovalAskReason);

describe('ApprovalAskReason', () => {
	it('shows the reason of the judge as written, below the description', () => {
		const { getByTestId, getByText } = renderComponent({
			props: {
				description: 'Delete rows where name is Eve',
				reason: { kind: 'judge', text: 'Die Zeile stammt nicht aus deiner Anfrage.' },
			},
		});

		expect(getByText('Delete rows where name is Eve')).toBeVisible();
		expect(getByTestId('approval-ask-reason')).toHaveTextContent(
			'Die Zeile stammt nicht aus deiner Anfrage.',
		);
	});

	it.each<[InstanceAiApprovalAskReason, string]>([
		[{ kind: 'always-ask' }, 'This type of action always needs your approval.'],
		[{ kind: 'too-long' }, 'This call is too long to check automatically.'],
		[{ kind: 'judge-failed' }, "The automatic check didn't finish."],
	])('shows the translated text of the fixed reason %o', (reason, text) => {
		const { getByTestId } = renderComponent({ props: { reason } });

		expect(getByTestId('approval-ask-reason')).toHaveTextContent(text);
	});
});
