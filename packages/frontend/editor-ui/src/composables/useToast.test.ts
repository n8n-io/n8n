import { screen, waitFor, within } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { h, defineComponent } from 'vue';
import { useToast } from './useToast';
import { mockedStore } from '@/__tests__/utils';
import { useSettingsStore } from '@/stores/settings.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useUIStore } from '@/stores/ui.store';
import { EDITABLE_CANVAS_VIEWS, VIEWS } from '@/constants';
import { useLogsStore } from '@/stores/logs.store';

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
	describe('determineToastOffset', () => {
		let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
		let logsStore: ReturnType<typeof mockedStore<typeof useLogsStore>>;
		let ndvStore: ReturnType<typeof mockedStore<typeof useNDVStore>>;
		let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

		beforeEach(() => {
			settingsStore = mockedStore(useSettingsStore);
			settingsStore.isAiAssistantEnabled = false;

			logsStore = mockedStore(useLogsStore);
			logsStore.height = 100;
			logsStore.state = 'attached';

			ndvStore = mockedStore(useNDVStore);
			ndvStore.activeNode = null;

			uiStore = mockedStore(useUIStore);
			uiStore.currentView = VIEWS.WORKFLOW;
		});

		it('applies logsStore offset on applicable views', () => {
			for (const view of EDITABLE_CANVAS_VIEWS) {
				uiStore.currentView = view;
				const offset = toast.determineToastOffset();
				expect(offset).toBe(100);
			}
		});

		it('does not apply logsStore offset on unrelated view', () => {
			uiStore.currentView = VIEWS.HOMEPAGE;
			const offset = toast.determineToastOffset();
			expect(offset).toBe(0);
		});

		it('does not apply logsStore offset if we have an activeNode', () => {
			ndvStore.activeNode = { name: 'myActiveNode' } as never;
			const offset = toast.determineToastOffset();
			expect(offset).toBe(0);
		});

		it('applies assistant offset with logsOffset', () => {
			settingsStore.isAiAssistantEnabled = true;
			const offset = toast.determineToastOffset();
			expect(offset).toBe(100 + 64);
		});

		it('does not apply logsStore offset if floating', () => {
			logsStore.state = 'floating';
			const offset = toast.determineToastOffset();
			expect(offset).toBe(0);
		});

		it('does apply logsStore offset if closed', () => {
			logsStore.state = 'closed';
			logsStore.height = 32;
			settingsStore.isAiAssistantEnabled = true;
			const offset = toast.determineToastOffset();
			expect(offset).toBe(32 + 64);
		});
	});
});
