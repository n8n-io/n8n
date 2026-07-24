import { VIEWS } from '@n8n/frontend-constants/views';
import { APP_Z_INDEXES } from '@n8n/frontend-constants/z-indexes';
import { useNotificationsStore } from '@n8n/stores/notifications.store';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import { ElNotification } from 'element-plus';
import { vi } from 'vitest';
import { h, defineComponent } from 'vue';

import { useTelemetry } from './useTelemetry';
import { useToast, setNotify } from './useToast';

vi.mock('./useTelemetry');

// Register the real element-plus notification function for integration tests.
setNotify(ElNotification);

const route = vi.hoisted(() => ({
	name: '' as string | symbol,
	params: {} as { workflowId?: string | string[] },
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: () => route,
}));

describe('useToast', () => {
	let toast: ReturnType<typeof useToast>;
	let telemetryTrackSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		route.name = VIEWS.WORKFLOW;
		route.params = { workflowId: 'test-workflow-id' };

		const appEl = document.createElement('div');
		appEl.id = 'n8n-app';
		document.body.appendChild(appEl);

		createTestingPinia();

		telemetryTrackSpy = vi.fn();
		vi.mocked(useTelemetry).mockReturnValue({
			track: telemetryTrackSpy,
		} as unknown as ReturnType<typeof useTelemetry>);

		toast = useToast();
	});

	afterEach(() => {
		document.getElementById('n8n-app')?.remove();
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
					workflow_id: 'test-workflow-id',
				});
			});
		});

		it('should extract error message from VNode props for telemetry', async () => {
			const vnode = h(
				defineComponent({
					props: {
						errorMessage: { type: String, required: true },
						nodeName: { type: String, required: true },
					},
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
					workflow_id: 'test-workflow-id',
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
					workflow_id: 'test-workflow-id',
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

	describe('notification suppression', () => {
		it('should not render non-error notification when notifications are suppressed', async () => {
			const notificationsStore = useNotificationsStore();
			notificationsStore.areNotificationsSuppressed = true;
			notificationsStore.allowErrorNotificationsWhenSuppressed = true;

			toast.showMessage({ message: 'Should not appear', title: 'Suppressed' });

			// If the notification was rendered, waitFor would find it within its timeout.
			// Since it should be suppressed, we verify it never appears.
			await expect(
				waitFor(
					() => {
						expect(screen.getByRole('alert')).toBeVisible();
					},
					{ timeout: 200 },
				),
			).rejects.toThrow();
		});

		it('should not render error notification when notifications are suppressed and errors are not allowed', async () => {
			const notificationsStore = useNotificationsStore();
			notificationsStore.areNotificationsSuppressed = true;
			notificationsStore.allowErrorNotificationsWhenSuppressed = false;

			toast.showMessage({
				message: 'Error should not appear',
				title: 'Suppressed error',
				type: 'error',
			});

			await expect(
				waitFor(
					() => {
						expect(screen.getByRole('alert')).toBeVisible();
					},
					{ timeout: 200 },
				),
			).rejects.toThrow();
			expect(telemetryTrackSpy).not.toHaveBeenCalled();
		});

		it('should render error notification when notifications are suppressed and errors are allowed', async () => {
			const notificationsStore = useNotificationsStore();
			notificationsStore.areNotificationsSuppressed = true;
			notificationsStore.allowErrorNotificationsWhenSuppressed = true;

			toast.showMessage({
				message: 'Error should appear',
				title: 'Allowed error',
				type: 'error',
			});

			await waitFor(() => {
				expect(screen.getByRole('alert')).toBeVisible();
				expect(
					within(screen.getByRole('alert')).getByRole('heading', { level: 2 }),
				).toHaveTextContent('Allowed error');
				expect(screen.getByRole('alert')).toContainHTML('<p>Error should appear</p>');
			});
		});

		it('should track telemetry for allowed suppressed error notification', async () => {
			const notificationsStore = useNotificationsStore();
			notificationsStore.areNotificationsSuppressed = true;
			notificationsStore.allowErrorNotificationsWhenSuppressed = true;

			toast.showMessage({
				message: 'Allowed error tracked',
				title: 'Allowed error',
				type: 'error',
			});

			await waitFor(() => {
				expect(telemetryTrackSpy).toHaveBeenCalledWith('Instance FE emitted error', {
					error_title: 'Allowed error',
					error_message: 'Allowed error tracked',
					caused_by_credential: false,
					workflow_id: 'test-workflow-id',
				});
			});
		});
	});

	describe('clearAllStickyNotifications', () => {
		it('should close all sticky notifications (duration: 0)', async () => {
			toast.showMessage({
				message: 'Sticky notification 1',
				title: 'Sticky 1',
				duration: 0,
			});

			toast.showMessage({
				message: 'Sticky notification 2',
				title: 'Sticky 2',
				duration: 0,
			});

			await waitFor(() => {
				expect(screen.getAllByRole('alert')).toHaveLength(2);
			});

			toast.clearAllStickyNotifications();

			await waitFor(() => {
				expect(screen.queryAllByRole('alert')).toHaveLength(0);
			});
		});

		it('should not affect non-sticky notifications', async () => {
			toast.showMessage({
				message: 'Non-sticky notification',
				title: 'Non-sticky',
				duration: 5000,
			});

			await waitFor(() => {
				expect(screen.getByRole('alert')).toBeVisible();
			});

			toast.clearAllStickyNotifications();

			await waitFor(() => {
				expect(screen.getByRole('alert')).toBeVisible();
			});
		});

		it('should handle being called when there are no sticky notifications', () => {
			expect(() => toast.clearAllStickyNotifications()).not.toThrow();
		});
	});

	describe('toast z-index', () => {
		afterEach(() => {
			// Restore the notifier registered at module load for later tests.
			setNotify(ElNotification);
		});

		it('sources the toast z-index from the shared layering scale', () => {
			const notifySpy = vi.fn((_options: Record<string, unknown>) => ({ close: vi.fn() }));
			setNotify(notifySpy);

			useToast().showMessage({ message: 'Layered toast' });

			// Asserting against the token (not a literal) proves the value is
			// sourced from APP_Z_INDEXES, not hardcoded in the composable.
			expect(notifySpy).toHaveBeenCalledWith(
				expect.objectContaining({ zIndex: APP_Z_INDEXES.TOASTS }),
			);
		});
	});
});
