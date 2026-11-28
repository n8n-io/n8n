import { createComponentRenderer } from '@n8n/frontend-test-utils';

import { PUBLISHED_URL, testApp } from '../../__tests__/fixtures';
import AppSharePopover from './AppSharePopover.vue';

const published = testApp({ publishedVersionId: 'v2', publishedUrl: PUBLISHED_URL });

const renderComponent = createComponentRenderer(AppSharePopover, {
	props: { app: published, url: PUBLISHED_URL },
	global: {
		stubs: {
			N8nPopover: { template: '<div><slot name="trigger" /><slot name="content" /></div>' },
			AppLinkField: { props: ['url'], template: '<span data-test-id="link">{{ url }}</span>' },
		},
	},
});

describe('AppSharePopover', () => {
	it('shows the link and who can open the app', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('link')).toHaveTextContent(PUBLISHED_URL);
		expect(getByTestId('app-project-access-note')).toHaveTextContent(
			'Project members who can view apps can open this app',
		);
	});
});
