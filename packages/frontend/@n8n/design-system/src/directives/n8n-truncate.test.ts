import { render } from '@testing-library/vue';

import { n8nTruncate } from './n8n-truncate';

describe('Directive n8n-truncate', () => {
	it('should truncate text to 30 chars by default', async () => {
		const { html } = render(
			{
				props: {
					text: {
						type: String,
					},
				},
				template: '<div v-n8n-truncate="text" />',
			},
			{
				props: {
					text: 'This is a very long text that should be truncated',
				},
				global: {
					directives: {
						n8nTruncate,
					},
				},
			},
		);
		expect(html()).toBe('<div>This is a very long text that ...</div>');
	});

	it('should truncate text to 30 chars in case of wrong argument', async () => {
		const { html } = render(
			{
				props: {
					text: {
						type: String,
					},
				},
				template: '<div v-n8n-truncate:ab="text" />',
			},
			{
				props: {
					text: 'This is a very long text that should be truncated',
				},
				global: {
					directives: {
						n8nTruncate,
					},
				},
			},
		);
		expect(html()).toBe('<div>This is a very long text that ...</div>');
	});

	it('should truncate text to given length', async () => {
		const { html } = render(
			{
				props: {
					text: {
						type: String,
					},
				},
				template: '<div v-n8n-truncate:25="text" />',
			},
			{
				props: {
					text: 'This is a very long text that should be truncated',
				},
				global: {
					directives: {
						n8nTruncate,
					},
				},
			},
		);
		expect(html()).toBe('<div>This is a very long text ...</div>');
	});

	it('rendered html should update when the value changes', async () => {
		const { html, rerender } = render(
			{
				props: {
					text: {
						type: String,
					},
				},
				template: '<div v-n8n-truncate:25="text" />',
			},
			{
				props: {
					text: 'This is a very long text that should be truncated',
				},
				global: {
					directives: {
						n8nTruncate,
					},
				},
			},
		);
		expect(html()).toBe('<div>This is a very long text ...</div>');

		await rerender({ text: 'new text to truncate that should be truncated' });

		expect(html()).toBe('<div>new text to truncate that...</div>');
	});
});
