import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import type { FrontendModuleSettings, InstanceAiWorkflowProvenance } from '@n8n/api-types';
import { NO_NETWORK_ERROR_CODE, ResponseError } from '@n8n/rest-api-client';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createComponentRenderer } from '@/__tests__/render';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { INSTANCE_AI_THREAD_VIEW } from '../../constants';
import { clearWorkflowProvenanceCache } from '../useWorkflowProvenance';
import AssistantMadeBadge from '../AssistantMadeBadge.vue';

const { fetchWorkflowProvenance } = vi.hoisted(() => ({ fetchWorkflowProvenance: vi.fn() }));

vi.mock('../provenance.api', () => ({ fetchWorkflowProvenance }));

vi.mock('@/app/utils/rbac/permissions', () => ({ hasPermission: vi.fn() }));

const flushPromises = async () => await new Promise(setImmediate);

const BADGE_TEXT = 'Made with n8n Assistant';

const resizeCallbacks: ResizeObserverCallback[] = [];

class ResizeObserverStub {
	constructor(onResize: ResizeObserverCallback) {
		resizeCallbacks.push(onResize);
	}

	observe = vi.fn();

	unobserve = vi.fn();

	disconnect = vi.fn();
}

/** jsdom has no layout, so a cut-off text is simulated through the two widths. */
function setLabelWidths(label: HTMLElement, scrollWidth: number, clientWidth: number) {
	Object.defineProperty(label, 'scrollWidth', { value: scrollWidth, configurable: true });
	Object.defineProperty(label, 'clientWidth', { value: clientWidth, configurable: true });
	for (const notify of [...resizeCallbacks]) notify([], {} as ResizeObserver);
}

type InstanceAiModuleSettings = NonNullable<FrontendModuleSettings['instance-ai']>;

function makeRecord(
	overrides: Partial<InstanceAiWorkflowProvenance> = {},
): InstanceAiWorkflowProvenance {
	return {
		workflowId: 'wf-1',
		threadId: 'thread-1',
		createdAt: '2026-10-01T09:30:00.000Z',
		canOpenThread: true,
		...overrides,
	};
}

function setAssistant(options: { active?: boolean; enabled?: boolean } = {}) {
	const settingsStore = useSettingsStore();
	settingsStore.settings = {
		...settingsStore.settings,
		activeModules: options.active === false ? [] : ['instance-ai'],
	} as typeof settingsStore.settings;
	settingsStore.moduleSettings = {
		'instance-ai': {
			enabled: options.enabled ?? true,
			setupCompleted: true,
		} as InstanceAiModuleSettings,
	};
}

/** A router with the real chat route path, so links resolve to real URLs. */
async function createTestRouter(initialPath = '/workflow/wf-1'): Promise<Router> {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', name: 'home', component: { template: '<div />' } },
			{ path: '/workflow/:workflowId', name: 'workflow', component: { template: '<div />' } },
			{
				path: '/assistant/:threadId',
				name: INSTANCE_AI_THREAD_VIEW,
				component: { template: '<div />' },
			},
		],
	});
	await router.push(initialPath);
	await router.isReady();
	return router;
}

const renderBadge = createComponentRenderer(AssistantMadeBadge);

async function render(options: { path?: string; workflowId?: string } = {}) {
	const router = await createTestRouter(options.path);
	const result = renderBadge({
		props: { workflowId: options.workflowId ?? 'wf-1' },
		global: { plugins: [router], stubs: { RouterLink: false } },
	});
	await flushPromises();
	return { ...result, router };
}

describe('AssistantMadeBadge', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearWorkflowProvenanceCache();
		createTestingPinia({ stubActions: false });
		setAssistant();
		vi.mocked(hasPermission).mockReturnValue(true);
		resizeCallbacks.length = 0;
		vi.stubGlobal('ResizeObserver', ResizeObserverStub);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('when the viewer can open the chat', () => {
		beforeEach(() => {
			fetchWorkflowProvenance.mockResolvedValue(makeRecord({ canOpenThread: true }));
		});

		it('shows the badge as a link to the chat that built the workflow', async () => {
			await render();

			const link = screen.getByRole('link', { name: 'Made with n8n Assistant. Open the chat' });
			expect(link).toHaveAttribute('href', '/assistant/thread-1');
			expect(link).toHaveTextContent('Made with n8n Assistant');
			expect(fetchWorkflowProvenance).toHaveBeenCalledWith(expect.anything(), 'wf-1');
			expect(screen.queryByTestId('workflow-assistant-made-badge')).not.toBeInTheDocument();
		});

		it('opens the chat on click', async () => {
			const { router } = await render();

			await userEvent.click(screen.getByTestId('workflow-assistant-made-link'));

			await waitFor(() => expect(router.currentRoute.value.name).toBe(INSTANCE_AI_THREAD_VIEW));
			expect(router.currentRoute.value.params.threadId).toBe('thread-1');
		});

		it('shows the action in a tooltip on keyboard focus and announces it once', async () => {
			await render();

			await userEvent.tab();

			const link = screen.getByTestId('workflow-assistant-made-link');
			expect(link).toHaveFocus();
			await waitFor(() =>
				expect(screen.getByTestId('tooltip-content')).toHaveTextContent('Open the chat'),
			);
			expect(link).toHaveAccessibleName('Made with n8n Assistant. Open the chat');
			// The name already holds the action, so the tooltip must not repeat it as a description.
			expect(link).not.toHaveAccessibleDescription();
		});

		it('gives the full text in the tooltip when the badge text is cut off', async () => {
			await render();
			const link = screen.getByTestId('workflow-assistant-made-link');
			setLabelWidths(within(link).getByText(BADGE_TEXT), 160, 40);

			await userEvent.tab();

			await waitFor(() =>
				expect(screen.getByTestId('tooltip-content')).toHaveTextContent(
					'Made with n8n Assistant. Open the chat',
				),
			);
			expect(link).not.toHaveAccessibleDescription();
		});

		it('shows plain text inside the chat that built the workflow', async () => {
			await render({ path: '/assistant/thread-1' });

			expect(screen.getByTestId('workflow-assistant-made-badge')).toHaveTextContent(
				'Made with n8n Assistant',
			);
			expect(screen.queryByRole('link')).not.toBeInTheDocument();
		});

		it('still links to the building chat from a different chat', async () => {
			await render({ path: '/assistant/another-thread' });

			expect(screen.getByTestId('workflow-assistant-made-link')).toHaveAttribute(
				'href',
				'/assistant/thread-1',
			);
		});
	});

	it('shows plain text when the viewer cannot open the chat', async () => {
		fetchWorkflowProvenance.mockResolvedValue(makeRecord({ canOpenThread: false }));

		await render();

		expect(screen.getByTestId('workflow-assistant-made-badge')).toHaveTextContent(
			'Made with n8n Assistant',
		);
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});

	describe('when the plain badge is narrower than its text', () => {
		beforeEach(() => {
			fetchWorkflowProvenance.mockResolvedValue(makeRecord({ canOpenThread: false }));
		});

		it('shows the full text in a tooltip on hover', async () => {
			await render();
			const badge = screen.getByTestId('workflow-assistant-made-badge');
			setLabelWidths(within(badge).getByText(BADGE_TEXT), 160, 40);
			await flushPromises();

			await userEvent.hover(badge);

			await waitFor(() =>
				expect(screen.getByTestId('tooltip-content')).toHaveTextContent(BADGE_TEXT),
			);
		});

		it('shows no tooltip again after the text fits', async () => {
			await render();
			const badge = screen.getByTestId('workflow-assistant-made-badge');
			const label = within(badge).getByText(BADGE_TEXT);
			setLabelWidths(label, 160, 40);
			setLabelWidths(label, 160, 160);
			await flushPromises();

			await userEvent.hover(badge);
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();
		});
	});

	it('shows nothing when the Assistant did not build the workflow', async () => {
		fetchWorkflowProvenance.mockResolvedValue(null);

		await render();

		expect(fetchWorkflowProvenance).toHaveBeenCalledTimes(1);
		expect(screen.queryByText('Made with n8n Assistant')).not.toBeInTheDocument();
	});

	it.each([
		['the workflow is not found', new ResponseError('gone', { httpStatusCode: 404 })],
		['the network is down', new ResponseError('offline', { errorCode: NO_NETWORK_ERROR_CODE })],
	])('shows nothing and no message when %s', async (_case, error) => {
		fetchWorkflowProvenance.mockRejectedValue(error);

		const { container } = await render();

		expect(screen.queryByText('Made with n8n Assistant')).not.toBeInTheDocument();
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
		expect(container).toBeEmptyDOMElement();
	});

	describe('when the Assistant is not available', () => {
		it('sends no request while the module is not active', async () => {
			setAssistant({ active: false });

			const { container } = await render();

			expect(fetchWorkflowProvenance).not.toHaveBeenCalled();
			expect(container).toBeEmptyDOMElement();
		});

		it('sends no request while an admin has turned the Assistant off', async () => {
			setAssistant({ enabled: false });

			await render();

			expect(fetchWorkflowProvenance).not.toHaveBeenCalled();
		});

		it('sends no request when the viewer may not use the Assistant', async () => {
			vi.mocked(hasPermission).mockReturnValue(false);

			await render();

			expect(fetchWorkflowProvenance).not.toHaveBeenCalled();
		});
	});
});
