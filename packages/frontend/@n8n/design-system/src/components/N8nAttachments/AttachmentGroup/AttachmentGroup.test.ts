import { render, screen } from '@testing-library/vue';

import N8nAttachmentGroup from './AttachmentGroup.vue';

describe('N8nAttachmentGroup', function describeComponent() {
	it('renders the default slot', function testContent() {
		render(N8nAttachmentGroup, {
			slots: { default: 'example.pdf' },
		});

		expect(screen.getByText('example.pdf')).toBeVisible();
	});
});
