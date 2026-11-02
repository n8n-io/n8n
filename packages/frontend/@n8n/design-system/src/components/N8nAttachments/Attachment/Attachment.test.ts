import { render, screen } from '@testing-library/vue';

import N8nAttachment from './Attachment.vue';

describe('N8nAttachment', function describeComponent() {
	it('renders the file name', function testContent() {
		render(N8nAttachment, {
			props: { fileName: 'example.pdf', mimeType: 'application/pdf' },
		});

		expect(screen.getByText('example.pdf')).toBeVisible();
	});
});
