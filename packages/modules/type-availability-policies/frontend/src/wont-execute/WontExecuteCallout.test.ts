import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';

import WontExecuteCallout from './WontExecuteCallout.vue';

const renderComponent = createComponentRenderer(WontExecuteCallout, {
	props: { causes: ['restrictedNode'] },
});

describe('WontExecuteCallout', () => {
	it('leads with the count and the cause', () => {
		const { getByTestId } = renderComponent({ props: { count: 8 } });

		expect(getByTestId('wont-execute-callout')).toHaveTextContent(
			"8 workflows won't execute: restricted node",
		);
	});

	it('uses the singular for one workflow', () => {
		const { getByTestId } = renderComponent({ props: { count: 1 } });

		expect(getByTestId('wont-execute-callout')).toHaveTextContent(
			"1 workflow won't execute: restricted node",
		);
	});

	it('tells the user to publish the workflow again', () => {
		const { getByTestId } = renderComponent({ props: { count: 1 } });

		expect(getByTestId('wont-execute-callout')).toHaveTextContent('publish the workflow again');
	});

	it('emits clear', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { count: 1 } });

		await fireEvent.click(getByTestId('wont-execute-callout-clear'));

		expect(emitted('clear')).toHaveLength(1);
	});
});
