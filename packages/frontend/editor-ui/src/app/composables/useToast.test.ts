import { screen, waitFor, within } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { h, defineComponent } from 'vue';
import { useToast } from './useToast';
import { useTelemetry } from './useTelemetry';
import { vi } from 'vitest';

vi.mock('./useTelemetry');

describe('useToast', () => {
	let toast: ReturnType<typeof useToast>;
	let telemetryTrackSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		createTestingPinia();

		telemetryTrackSpy = vi.fn();
		vi.mocked(useTelemetry).mockReturnValue({
			track: telemetryTrackSpy,
		} as unknown as ReturnType<typeof useTelemetry>);

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

	describe('telemetry tracking for error messages', () => {
		it('should track telemetry with string message for error toast', async () => {
			const messageData = {
				message: 'Error occurred',
				title: 'Error',
				type: 'error' as const,
			};

			toast.showMessage(messageData);

			await waitFor(() => {
				expect(telemetryTrackSpy).toHaveBeenCalledWith('Instance FE emitted error', {
					error_title: 'Error',
					error_message: 'Error occurred',
					caused_by_credential: false,
					workflow_id: expect.any(String),
				});
			});
		});

		it('should extract error message from VNode props for telemetry', async () => {
			const vnode = h(
				defineComponent({
					props: ['errorMessage', 'nodeName'],
					template: '<p>{{ errorMessage }}</p>',
				}),
				{
					errorMessage: 'Node execution failed',
					nodeName: 'TestNode',
				},
			);

			const messageData = {
				message: vnode,
				title: 'Error in node',
				type: 'error' as const,
			};

			toast.showMessage(messageData);

			await waitFor(() => {
				expect(telemetryTrackSpy).toHaveBeenCalledWith('Instance FE emitted error', {
					error_title: 'Error in node',
					error_message: 'Node execution failed',
					caused_by_credential: false,
					workflow_id: expect.any(String),
				});
			});
		});

		it('should use "Unknown error" when VNode has no error message in props', async () => {
			const vnode = h(
				defineComponent({
					template: '<p>Some content</p>',
				}),
			);

			const messageData = {
				message: vnode,
				title: 'Error',
				type: 'error' as const,
			};

			toast.showMessage(messageData);

			await waitFor(() => {
				expect(telemetryTrackSpy).toHaveBeenCalledWith('Instance FE emitted error', {
					error_title: 'Error',
					error_message: 'Unknown error',
					caused_by_credential: false,
					workflow_id: expect.any(String),
				});
			});
		});

		it('should not track telemetry for non-error messages', async () => {
			const messageData = {
				message: 'Success message',
				title: 'Success',
				type: 'success' as const,
			};

			toast.showMessage(messageData);

			await waitFor(() => {
				expect(screen.getByRole('alert')).toBeVisible();
			});

			expect(telemetryTrackSpy).not.toHaveBeenCalled();
		});

		it('should not track telemetry when track parameter is false', async () => {
			const messageData = {
				message: 'Error occurred',
				title: 'Error',
				type: 'error' as const,
			};

			toast.showMessage(messageData, false);

			await waitFor(() => {
				expect(screen.getByRole('alert')).toBeVisible();
			});

			expect(telemetryTrackSpy).not.toHaveBeenCalled();
		});
	});
});
