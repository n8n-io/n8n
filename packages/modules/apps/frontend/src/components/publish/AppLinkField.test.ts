import { createComponentRenderer } from '@n8n/frontend-test-utils';

import { PUBLISHED_URL } from '../../__tests__/fixtures';
import AppLinkField from './AppLinkField.vue';

const renderComponent = createComponentRenderer(AppLinkField, { props: { url: PUBLISHED_URL } });

describe('AppLinkField', () => {
	it('shows the URL with a copy button', () => {
		const { getByRole, getByTestId } = renderComponent();

		expect(getByRole('textbox', { name: 'Link' })).toHaveValue(PUBLISHED_URL);
		expect(getByTestId('copy-input-button')).toBeEnabled();
	});
});
