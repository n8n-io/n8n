import { screen, waitFor, within } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { h, defineComponent } from 'vue';
import { useToast } from './useToast';

describe('useToast', () => {
	let toast: ReturnType<typeof useToast>;

	beforeEach(() => {
		createTestingPinia();

		toast = useToast();
	});

	it('should show a message', async () => {
		const messageData = { message: 'Test message', title: 'Test title' };
		toast.showMessage(messageData);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeVisible();
			expect(
				within(screen.getByRole('alert')).getByRole('heading', { level: 2 }),
			).toHaveTextContent('Test title');
			expect(screen.getByRole('alert')).toContainHTML('<p>Test message</p>');
		});
	});

	it('should sanitize message and title', async () => {
		const messageData = {
			message: '<script>alert("xss")</script>',
			title: '<script>alert("xss")</script>',
		};
		toast.showMessage(messageData);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeVisible();
			expect(
				within(screen.getByRole('alert')).getByRole('heading', { level: 2 }),
			).toHaveTextContent('alert("xss")');
			expect(screen.getByRole('alert')).toContainHTML('<p>alert("xss")</p>');
		});
	});

	it('should sanitize but keep valid, allowed HTML tags', async () => {
		const messageData = {
			message:
				'<a data-action="reload">Refresh</a> to see the <strong>latest status</strong>.<br/> <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/" target="_blank">More info</a> or go to the <a href="/settings/usage">Usage and plan</a> settings page.',
			title: '<strong>Title</strong>',
		};

		toast.showMessage(messageData);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeVisible();
			expect(
				within(screen.getByRole('alert')).getByRole('heading', { level: 2 }),
			).toHaveTextContent('Title');
			expect(
				within(screen.getByRole('alert')).getByRole('heading', { level: 2 }).querySelectorAll('*'),
			).toHaveLength(0);
			expect(screen.getByRole('alert')).toContainHTML(
				'<a data-action="reload">Refresh</a> to see the <strong>latest status</strong>.<br /> <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/" target="_blank">More info</a> or go to the <a href="/settings/usage">Usage and plan</a> settings page.',
			);
		});
	});

	it('should render component as message, sanitized as well', async () => {
		const messageData = {
			message: h(
				defineComponent({
					template: '<p>Test <strong>content</strong><script>alert("xss")</script></p>',
				}),
			),
		};

		toast.showMessage(messageData);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeVisible();
			expect(
				within(screen.getByRole('alert')).queryByRole('heading', { level: 2 }),
			).toHaveTextContent('');
			expect(
				within(screen.getByRole('alert')).getByRole('heading', { level: 2 }).querySelectorAll('*'),
			).toHaveLength(0);
			expect(screen.getByRole('alert')).toContainHTML('<p>Test <strong>content</strong></p>');
		});
	});
});
