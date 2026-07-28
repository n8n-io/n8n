import { VIEWS } from '@n8n/frontend-constants/views';
import { APP_Z_INDEXES } from '@n8n/frontend-constants/z-indexes';
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

/** Typed so the spy satisfies the package's `NotifyFn` contract. */
const createNotifySpy = () => vi.fn((_options: Record<string, unknown>) => ({ close: vi.fn() }));

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

	// A notifier returning `undefined` means the app declined to show the toast —
	// in production that is notification suppression, which now lives at the
	// registration site. The package's side of that contract is that a
	// dropped toast leaves no trace, matching the in-package suppression branch it
	// replaced: no render, no error telemetry, no sticky-queue entry, and still a
	// closable handle for the caller.
	describe('a notifier that drops the notification', () => {
		const dropAll = () => undefined;

		afterEach(() => {
			setNotify(ElNotification);
		});

		it('renders nothing', async () => {
			setNotify(dropAll);

			toast.showMessage({ message: 'Should not appear', title: 'Dropped' });

			// If it had rendered, waitFor would find it within the timeout.
			await expect(
				waitFor(
					() => {
						expect(screen.getByRole('alert')).toBeVisible();
					},
					{ timeout: 200 },
				),
			).rejects.toThrow();
		});

		it('emits no error telemetry', () => {
			setNotify(dropAll);

			toast.showMessage({ message: 'Dropped error', title: 'Dropped', type: 'error' });

			expect(telemetryTrackSpy).not.toHaveBeenCalled();
		});

		it('leaves the sticky queue usable, closing only real notifications', () => {
			setNotify(dropAll);
			// `duration: 0` is what makes a toast sticky.
			toast.showMessage({ message: 'Dropped sticky', duration: 0 });

			const notifySpy = createNotifySpy();
			setNotify(notifySpy);
			const real = toast.showMessage({ message: 'Real sticky', duration: 0 });
			toast.clearAllStickyNotifications();

			expect(real.close).toHaveBeenCalledTimes(1);

			// NB: this does *not* guard the enqueue itself. Removing the nullable-return
			// check pushes `undefined` onto the queue, and `clearAllStickyNotifications`
			// already skips falsy entries, so no runtime assertion can see the
			// difference. That delta is caught by typecheck instead — the push raises
			// TS2345 (`NotificationHandle | undefined` not assignable to
			// `NotificationHandle`), verified by mutation.
		});

		it('still returns a closable handle', () => {
			setNotify(dropAll);

			const handle = toast.showMessage({ message: 'Dropped' });

			expect(() => handle.close()).not.toThrow();
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

	// The only path that reads `pendingNotificationsForViews` and calls
	// `setNotificationsForView`, so it is what proves the injected notification
	// state is wired end to end. Previously untested.
	// The notifier is resolved per call rather than once per `useToast()`. Probing
	// with a *later registration* is what distinguishes the two: a once-bound
	// composable captures whatever was registered at creation time and never sees
	// the update, which is how an early `useToast()` would stay permanently no-op
	// once bootstrap registration moves (N8N-104).
	describe('per-call resolution', () => {
		afterEach(() => {
			// Restore the module-scope registration for the rest of the suite.
			setNotify(ElNotification);
		});

		it('picks up a notifier registered after the composable was created', () => {
			const earlyToast = useToast();
			const lateNotify = createNotifySpy();

			setNotify(lateNotify);
			earlyToast.showMessage({ message: 'Late notifier' });

			expect(lateNotify).toHaveBeenCalledTimes(1);
		});

		it('picks up a later notifier that drops the notification', () => {
			// The suppression path specifically: an early composable must observe a
			// dropping notifier registered afterwards, not the earlier rendering one.
			const rendering = createNotifySpy();
			setNotify(rendering);
			const earlyToast = useToast();

			setNotify(() => undefined);
			earlyToast.showMessage({ message: 'Dropped by the later notifier', type: 'error' });

			expect(rendering).not.toHaveBeenCalled();
			expect(telemetryTrackSpy).not.toHaveBeenCalled();
		});
	});
});
