import type {
	SelfHealingResultActionResponse,
	SelfHealingResultDetail as ResultDetail,
} from '@n8n/api-types';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer, waitAllPromises } from '@n8n/frontend-test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { computed, ref } from 'vue';

import SelfHealingResultDetail from './SelfHealingResultDetail.vue';
import { useSelfHealingResultStore } from './selfHealingResult.store';
import * as api from './selfHealingResults.api';
import { result, resultSelection, suggestion } from './selfHealingResults.test.utils';

vi.mock('./selfHealingResults.api');
const { push, showError, showMessage, startChat } = vi.hoisted(() => ({
	push: vi.fn(),
	showError: vi.fn(),
	showMessage: vi.fn(),
	startChat: vi.fn(),
}));
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push }),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError, showMessage }) }));

const onItemChange = vi.fn();
const chatAvailable = ref(true);
const readableProjectIds = ref<string[]>([]);
let selectedId: string | null;
const renderComponent = createComponentRenderer(SelfHealingResultDetail, {
	props: {
		selection: resultSelection,
		tab: 'activity',
		onItemChange,
		isSelected: (id: string) => selectedId === id,
	},
	global: {
		stubs: {
			SelfHealingResultContent: {
				props: ['detail', 'pendingAction', 'publishAccess', 'canChat'],
				template: `<div data-test-id="result-content" :data-state="detail.reviewState" :data-pending="pendingAction" :data-publish-access="publishAccess" :data-can-chat="canChat">
<span>{{ detail.report }}</span>
<button v-for="action in ['editor', 'approve-and-publish', 'dismiss', 'chat']" :key="action" :data-test-id="action" @click="$emit('action', action)" />
<slot name="notice" />
</div>`,
			},
		},
	},
});

function appliedResult(
	overrides: Partial<SelfHealingResultActionResponse> = {},
): SelfHealingResultActionResponse {
	return {
		...result({ reviewState: 'applied' }),
		...overrides,
	};
}

const secondSelection = { ...resultSelection, id: 'result-2' };

function mockResultForEachSelection(overrides: Partial<ResultDetail> = {}) {
	vi.mocked(api.fetchSelfHealingResult).mockImplementation(async (_context, selection) =>
		result({ ...overrides, resultId: selection.id }),
	);
}

async function changeSelection(
	view: ReturnType<typeof renderComponent>,
	selection: typeof resultSelection,
) {
	selectedId = selection.id;
	await view.rerender({ selection });
	await waitAllPromises();
}

beforeEach(() => {
	vi.resetAllMocks();
	selectedId = resultSelection.id;
	startChat.mockResolvedValue('started');
	chatAvailable.value = true;
	capabilityRegistry.provide(capabilities.createSelfHealingChatHandoff, () => ({
		available: computed(() => chatAvailable.value),
		canStart: (projectId: string) =>
			chatAvailable.value && readableProjectIds.value.includes(projectId),
		start: startChat,
	}));
	readableProjectIds.value = [resultSelection.projectId];
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result());
	vi.mocked(api.fetchResultWorkflow).mockResolvedValue({
		name: 'Daily report',
		scopes: ['workflow:read', 'workflow:update', 'workflow:publish'],
	});
});
afterEach(() => capabilityRegistry.clear());

it.each([
	{ outcome: 'fix_ready', destination: 'editor', withSuggestion: true },
	{ outcome: 'fix_ready', destination: 'chat', withSuggestion: true },
	{ outcome: 'needs_you', destination: 'chat', withSuggestion: true },
	{ outcome: 'needs_you', destination: 'chat', withSuggestion: false },
	{ outcome: 'needs_you', destination: 'editor', withSuggestion: true },
	{ outcome: 'needs_you', destination: 'editor', withSuggestion: false },
] as const)(
	'closes $outcome with suggestion=$withSuggestion before opening $destination with one request',
	async ({ outcome, destination, withSuggestion }) => {
		const detail = result({
			outcome,
			suggestion: withSuggestion
				? suggestion({ resultKind: outcome === 'fix_ready' ? 'fix_ready' : 'needs_you' })
				: null,
		});
		const closedResult = result({
			...detail,
			reviewState: withSuggestion ? 'applied' : 'dismissed',
		});
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(detail);
		vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(closedResult);

		const navigate = destination === 'chat' ? startChat : push;
		let itemChangeCountAtNavigation = -1;
		navigate.mockImplementation(async () => {
			itemChangeCountAtNavigation = onItemChange.mock.calls.length;
			return destination === 'chat' ? 'started' : undefined;
		});

		const view = renderComponent();
		await waitAllPromises();

		view.getByTestId(destination).click();
		await waitAllPromises();

		expect(api.reviewSelfHealingResult).toHaveBeenCalledExactlyOnceWith(
			useRootStore().restApiContext,
			resultSelection,
			withSuggestion ? 'apply' : 'dismiss',
		);
		expect(api.fetchSelfHealingResult).toHaveBeenCalledOnce();
		expect(itemChangeCountAtNavigation).toBe(0);
		expect(onItemChange).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				type: 'self_healing_result',
				id: resultSelection.id,
				state: 'closed',
			}),
		);
		if (destination === 'chat') {
			expect(startChat).toHaveBeenCalledExactlyOnceWith(resultSelection.projectId, closedResult);
			expect(push).not.toHaveBeenCalled();
		} else {
			expect(push).toHaveBeenCalledExactlyOnceWith({
				name: 'NodeViewExisting',
				params: { workflowId: resultSelection.workflowId },
			});
			expect(startChat).not.toHaveBeenCalled();
		}
	},
);

it.each(['editor', 'approve-and-publish', 'chat'] as const)(
	'keeps the result open until %s navigation finishes',
	async (action) => {
		vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(appliedResult());
		const navigation = createDeferredPromise<'started' | undefined>();
		const navigate = action === 'chat' ? startChat : push;
		navigate.mockReturnValueOnce(navigation.promise);
		const view = renderComponent();
		await waitAllPromises();

		view.getByTestId(action).click();
		await waitAllPromises();

		expect(navigate).toHaveBeenCalledOnce();
		expect(onItemChange).not.toHaveBeenCalled();
		expect(view.getByTestId('result-content')).toHaveAttribute('data-pending', action);
		expect(view.getByTestId('result-content')).toHaveAttribute('data-state', 'open');

		navigation.resolve(action === 'chat' ? 'started' : undefined);
		await waitAllPromises();

		expect(onItemChange).toHaveBeenCalledOnce();
		expect(view.getByTestId('result-content')).not.toHaveAttribute('data-pending');
		expect(view.getByTestId('result-content')).toHaveAttribute('data-state', 'applied');
	},
);

it.each(['editor', 'approve-and-publish'] as const)(
	'keeps the result open until %s navigation finishes after a lost response',
	async (action) => {
		vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Disconnected'));
		const navigation = createDeferredPromise<undefined>();
		push.mockReturnValueOnce(navigation.promise);
		const view = renderComponent();
		await waitAllPromises();
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(appliedResult());

		view.getByTestId(action).click();
		await waitAllPromises();

		expect(push).toHaveBeenCalledOnce();
		expect(view.getByTestId('result-content')).toHaveAttribute('data-pending', action);
		expect(view.getByTestId('result-content')).toHaveAttribute('data-state', 'open');

		navigation.resolve(undefined);
		await waitAllPromises();

		expect(view.getByTestId('result-content')).not.toHaveAttribute('data-pending');
		expect(view.getByTestId('result-content')).toHaveAttribute('data-state', 'applied');
		expect(showError).not.toHaveBeenCalled();
	},
);

it('shows the closed result with a chat retry when the chat does not start', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(appliedResult());
	const chatStart = createDeferredPromise<'failed'>();
	startChat.mockReturnValueOnce(chatStart.promise);
	const view = renderComponent();
	await waitAllPromises();

	view.getByTestId('chat').click();
	await waitAllPromises();

	expect(view.getByTestId('result-content')).toHaveAttribute('data-state', 'open');
	expect(view.queryByTestId('self-healing-chat-retry')).not.toBeInTheDocument();

	chatStart.resolve('failed');
	await waitAllPromises();

	expect(view.getByTestId('result-content')).toHaveAttribute('data-state', 'applied');
	expect(view.getByTestId('self-healing-chat-retry')).toBeInTheDocument();
	expect(onItemChange).toHaveBeenCalledOnce();
});

it.each([
	{ withSuggestion: true, reviewState: 'applied' },
	{ withSuggestion: false, reviewState: 'dismissed' },
] as const)(
	'does not start chat when another reviewer already closed the result as $reviewState',
	async ({ withSuggestion, reviewState }) => {
		const detail = result({
			outcome: 'needs_you',
			suggestion: withSuggestion ? suggestion({ resultKind: 'needs_you' }) : null,
		});
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(detail);
		vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(
			new ResponseError('This result is already closed.', { httpStatusCode: 409 }),
		);
		const view = renderComponent();
		await waitAllPromises();
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ ...detail, reviewState }));
		view.getByTestId('chat').click();
		await waitAllPromises();

		expect(view.getByTestId('result-content')).toHaveAttribute('data-state', reviewState);
		expect(onItemChange).toHaveBeenCalledOnce();
		expect(showError).toHaveBeenCalledOnce();
		expect(startChat).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
	},
);

it.each(['editor', 'chat'] as const)(
	'does not continue to %s when Apply finds an outdated suggestion',
	async (destination) => {
		vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(result({ reviewState: 'outdated' }));
		const view = renderComponent();
		await waitAllPromises();
		view.getByTestId(destination).click();
		await waitAllPromises();

		expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
		expect(onItemChange).toHaveBeenCalledOnce();
		expect(startChat).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
	},
);

it.each(['applied', 'outdated', 'discarded', 'dismissed', 'closed'] as const)(
	'ignores every action on a %s result',
	async (reviewState) => {
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ reviewState }));
		const view = renderComponent();
		await waitAllPromises();
		for (const action of ['editor', 'chat', 'approve-and-publish', 'dismiss']) {
			view.getByTestId(action).click();
		}
		await waitAllPromises();

		expect(api.reviewSelfHealingResult).not.toHaveBeenCalled();
		expect(onItemChange).not.toHaveBeenCalled();
		expect(startChat).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
	},
);

it.each([new Error('Disconnected'), new ResponseError('Bad gateway', { httpStatusCode: 502 })])(
	'opens the editor when a lost Apply response is followed by applied state (%s)',
	async (cause) => {
		vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(cause);
		const view = renderComponent();
		await waitAllPromises();
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(appliedResult());
		view.getByTestId('editor').click();
		await waitAllPromises();

		expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
		expect(onItemChange).toHaveBeenCalledOnce();
		expect(push).toHaveBeenCalledExactlyOnceWith({
			name: 'NodeViewExisting',
			params: { workflowId: resultSelection.workflowId },
		});
		expect(showError).not.toHaveBeenCalled();
		view.getByTestId('editor').click();
		await waitAllPromises();
		expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
		expect(push).toHaveBeenCalledOnce();
	},
);

it('offers chat without starting it when a lost Apply response is followed by applied state', async () => {
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ outcome: 'needs_you' }));
	vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Disconnected'));
	const view = renderComponent();
	await waitAllPromises();
	const applied = appliedResult({ outcome: 'needs_you' });
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(applied);
	view.getByTestId('chat').click();
	await waitAllPromises();

	expect(onItemChange).toHaveBeenCalledOnce();
	expect(startChat).not.toHaveBeenCalled();
	expect(push).not.toHaveBeenCalled();
	expect(view.getByTestId('self-healing-chat-retry')).toHaveTextContent('The response was lost.');

	view.getByTestId('self-healing-chat-retry-button').click();
	await waitAllPromises();
	expect(startChat).toHaveBeenCalledExactlyOnceWith(resultSelection.projectId, applied);
	expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
	expect(view.queryByTestId('self-healing-chat-retry')).not.toBeInTheDocument();
});

it.each(['open', 'outdated', 'discarded'] as const)(
	'does not continue when a lost Apply response is followed by %s state',
	async (reviewState) => {
		vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Disconnected'));
		const view = renderComponent();
		await waitAllPromises();
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ reviewState }));
		view.getByTestId('editor').click();
		await waitAllPromises();

		expect(view.getByTestId('result-content')).toHaveAttribute('data-state', reviewState);
		expect(showError).toHaveBeenCalledOnce();
		expect(push).not.toHaveBeenCalled();
		expect(onItemChange).toHaveBeenCalledTimes(reviewState === 'open' ? 0 : 1);
	},
);

it.each(['editor', 'approve-and-publish'] as const)(
	'does not open the editor when %s is rejected because another reviewer applied the result',
	async (action) => {
		vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(
			new ResponseError('This result is already closed.', { httpStatusCode: 409 }),
		);
		const view = renderComponent();
		await waitAllPromises();
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(appliedResult());
		view.getByTestId(action).click();
		await waitAllPromises();

		expect(view.getByTestId('result-content')).toHaveAttribute('data-state', 'applied');
		expect(onItemChange).toHaveBeenCalledOnce();
		expect(showError).toHaveBeenCalledOnce();
		expect(showMessage).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
	},
);

it('does not open the editor for a lost response after the selection changes', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Disconnected'));
	const view = renderComponent();
	await waitAllPromises();
	const refresh = createDeferredPromise<ResultDetail>();
	vi.mocked(api.fetchSelfHealingResult).mockReturnValueOnce(refresh.promise);
	view.getByTestId('editor').click();
	await waitAllPromises();
	selectedId = null;
	refresh.resolve(appliedResult());
	await waitAllPromises();

	expect(onItemChange).toHaveBeenCalledOnce();
	expect(push).not.toHaveBeenCalled();
	expect(showError).not.toHaveBeenCalled();
});

it('continues to the editor after a later refresh confirms a lost Apply response', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Disconnected'));
	const view = renderComponent();
	await waitAllPromises();
	vi.mocked(api.fetchSelfHealingResult).mockRejectedValueOnce(new Error('Offline'));
	view.getByTestId('editor').click();
	await waitAllPromises();
	expect(view.queryByTestId('result-content')).not.toBeInTheDocument();
	expect(showError).toHaveBeenCalledOnce();
	expect(push).not.toHaveBeenCalled();
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(appliedResult());
	view.getByRole('button', { name: 'Retry' }).click();
	await waitAllPromises();

	expect(onItemChange).toHaveBeenCalledOnce();
	expect(push).toHaveBeenCalledOnce();
	expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
});

it('keeps the confirmed result hidden until the editor opens after a retried refresh', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Disconnected'));
	const view = renderComponent();
	await waitAllPromises();
	vi.mocked(api.fetchSelfHealingResult).mockRejectedValueOnce(new Error('Offline'));
	view.getByTestId('editor').click();
	await waitAllPromises();
	const navigation = createDeferredPromise<undefined>();
	push.mockReturnValueOnce(navigation.promise);
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(appliedResult());
	view.getByRole('button', { name: 'Retry' }).click();
	await waitAllPromises();

	expect(push).toHaveBeenCalledOnce();
	expect(view.queryByTestId('result-content')).not.toBeInTheDocument();
	expect(view.queryByTestId('self-healing-detail-error')).not.toBeInTheDocument();

	navigation.resolve(undefined);
	await waitAllPromises();

	expect(view.getByTestId('result-content')).toHaveAttribute('data-state', 'applied');
	expect(onItemChange).toHaveBeenCalledOnce();
});

it('does not continue after a later refresh when the server rejected the action', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(
		new ResponseError('This result is already closed.', { httpStatusCode: 409 }),
	);
	const view = renderComponent();
	await waitAllPromises();
	vi.mocked(api.fetchSelfHealingResult).mockRejectedValueOnce(new Error('Offline'));
	view.getByTestId('editor').click();
	await waitAllPromises();
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(appliedResult());
	view.getByRole('button', { name: 'Retry' }).click();
	await waitAllPromises();

	expect(onItemChange).toHaveBeenCalledOnce();
	expect(push).not.toHaveBeenCalled();
	expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
});

it.each(['open', 'outdated'] as const)(
	'does not navigate when Apply fails and the refresh returns %s',
	async (reviewState) => {
		vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(
			new ResponseError('Cannot apply changes', { httpStatusCode: 409 }),
		);
		const view = renderComponent();
		await waitAllPromises();
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ reviewState }));
		view.getByTestId('editor').click();
		await waitAllPromises();

		expect(view.getByTestId('result-content')).toHaveAttribute('data-state', reviewState);
		expect(showError).toHaveBeenCalledOnce();
		expect(push).not.toHaveBeenCalled();
		expect(onItemChange).toHaveBeenCalledTimes(reviewState === 'open' ? 0 : 1);
	},
);

it.each(['editor', 'chat'] as const)(
	'retains closure when %s navigation fails without repeating the action',
	async (destination) => {
		const outcome = destination === 'editor' ? 'fix_ready' : 'needs_you';
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ outcome }));
		vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(
			appliedResult({
				outcome,
			}),
		);
		const navigate = destination === 'chat' ? startChat : push;
		navigate.mockRejectedValueOnce(new Error('Navigation failed'));
		const view = renderComponent();
		await waitAllPromises();
		view.getByTestId(destination).click();
		await waitAllPromises();

		expect(useSelfHealingResultStore().detail?.reviewState).toBe('applied');
		expect(onItemChange).toHaveBeenCalledOnce();
		expect(api.fetchSelfHealingResult).toHaveBeenCalledOnce();
		expect(showError).toHaveBeenCalledOnce();
		view.getByTestId(destination).click();
		await waitAllPromises();
		expect(navigate).toHaveBeenCalledOnce();
		expect(onItemChange).toHaveBeenCalledOnce();
		expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
	},
);

it('reconciles the result after leaving the detail without navigating away from the new page', async () => {
	const action = createDeferredPromise<ResultDetail>();
	vi.mocked(api.reviewSelfHealingResult).mockReturnValue(action.promise);
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('editor').click();
	view.getByTestId('approve-and-publish').click();
	selectedId = null;
	view.unmount();
	action.resolve(appliedResult());
	await waitAllPromises();

	expect(onItemChange).toHaveBeenCalledOnce();
	expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
	expect(push).not.toHaveBeenCalled();
	expect(startChat).not.toHaveBeenCalled();
});

it('clears the report without navigating when edit access is lost', async () => {
	const forbidden = new ResponseError('Forbidden', { httpStatusCode: 403 });
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ outcome: 'needs_you' }));
	vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(forbidden);
	const view = renderComponent();
	await waitAllPromises();
	vi.mocked(api.fetchSelfHealingResult).mockRejectedValue(forbidden);
	view.getByTestId('chat').click();
	await waitAllPromises();

	expect(view.queryByTestId('result-content')).not.toBeInTheDocument();
	expect(startChat).not.toHaveBeenCalled();
	expect(onItemChange).not.toHaveBeenCalled();
});

it('does not request chat when the shell is unavailable', async () => {
	capabilityRegistry.clear();
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ outcome: 'needs_you' }));
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('chat').click();
	await waitAllPromises();
	expect(api.reviewSelfHealingResult).not.toHaveBeenCalled();
});

it('offers chat only while the user can read the result project', async () => {
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ outcome: 'needs_you' }));
	readableProjectIds.value = ['other-project'];
	const view = renderComponent();
	await waitAllPromises();
	expect(view.getByTestId('result-content')).toHaveAttribute('data-can-chat', 'false');

	view.getByTestId('chat').click();
	await waitAllPromises();
	expect(api.reviewSelfHealingResult).not.toHaveBeenCalled();
	expect(startChat).not.toHaveBeenCalled();

	readableProjectIds.value = [resultSelection.projectId];
	await waitAllPromises();
	expect(view.getByTestId('result-content')).toHaveAttribute('data-can-chat', 'true');
});

it('retains applied state and opens the editor when publication returns an error', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockResolvedValue({
		...result({ reviewState: 'applied' }),
		publishError: 'Review is required',
	});
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('approve-and-publish').click();
	await waitAllPromises();

	expect(api.reviewSelfHealingResult).toHaveBeenCalledExactlyOnceWith(
		useRootStore().restApiContext,
		resultSelection,
		'approve-and-publish',
	);
	expect(useSelfHealingResultStore().detail?.reviewState).toBe('applied');
	expect(showMessage).toHaveBeenCalledWith(
		expect.objectContaining({ type: 'warning', message: 'Review is required' }),
	);
	expect(push).toHaveBeenCalledOnce();
	view.getByTestId('approve-and-publish').click();
	await waitAllPromises();
	expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
});

it('opens the editor with an unknown publication status after a lost approval response', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Disconnected'));
	const view = renderComponent();
	await waitAllPromises();
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ reviewState: 'applied' }));
	view.getByTestId('approve-and-publish').click();
	await waitAllPromises();

	expect(onItemChange).toHaveBeenCalledOnce();
	expect(push).toHaveBeenCalledOnce();
	expect(showMessage).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ type: 'warning', title: "Couldn't confirm publication" }),
	);
	expect(showError).not.toHaveBeenCalled();
	view.getByTestId('approve-and-publish').click();
	await waitAllPromises();
	expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
});

it.each(['discarded', 'outdated'] as const)(
	'does not navigate after a competing %s closure during approval',
	async (reviewState) => {
		vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(result({ reviewState }));
		const view = renderComponent();
		await waitAllPromises();
		view.getByTestId('approve-and-publish').click();
		await waitAllPromises();

		expect(onItemChange).toHaveBeenCalledOnce();
		expect(push).not.toHaveBeenCalled();
	},
);

it.each([
	{ outcome: 'fix_ready', scopes: ['workflow:read', 'workflow:update'] },
	{ outcome: 'needs_you', scopes: ['workflow:read', 'workflow:update', 'workflow:publish'] },
	{ outcome: 'could_not_fix', scopes: ['workflow:read', 'workflow:update', 'workflow:publish'] },
] as const)(
	'prevents publication when the result or permissions do not allow it',
	async ({ outcome, scopes }) => {
		vi.mocked(api.fetchResultWorkflow).mockResolvedValue({
			name: 'Daily report',
			scopes: [...scopes],
		});
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ outcome }));
		const view = renderComponent();
		await waitAllPromises();
		view.getByTestId('approve-and-publish').click();
		await waitAllPromises();
		expect(api.reviewSelfHealingResult).not.toHaveBeenCalled();
	},
);

it('treats publish access as unknown until workflow permissions load', async () => {
	vi.mocked(api.fetchResultWorkflow).mockRejectedValueOnce(new Error('Offline'));
	const view = renderComponent();
	await waitAllPromises();

	expect(view.getByTestId('result-content')).toHaveAttribute('data-publish-access', 'unknown');
	view.getByTestId('approve-and-publish').click();
	await waitAllPromises();
	expect(api.reviewSelfHealingResult).not.toHaveBeenCalled();

	view.getByRole('button', { name: 'Retry' }).click();
	await waitAllPromises();
	expect(view.getByTestId('result-content')).toHaveAttribute('data-publish-access', 'allowed');
});

const dismissals = [
	{ outcome: 'fix_ready', reviewState: 'discarded' },
	{ outcome: 'needs_you', reviewState: 'dismissed' },
] as const;

it.each(dismissals)(
	'refreshes a $outcome result as $reviewState after a lost dismissal response',
	async ({ outcome, reviewState }) => {
		vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Disconnected'));
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ outcome }));
		const view = renderComponent();
		await waitAllPromises();
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ outcome, reviewState }));
		view.getByTestId('dismiss').click();
		await waitAllPromises();

		expect(view.getByTestId('result-content')).toHaveAttribute('data-state', reviewState);
		expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
		expect(onItemChange).toHaveBeenCalledOnce();
		expect(showError).not.toHaveBeenCalled();
		expect(startChat).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
	},
);

it.each(dismissals)(
	'dismisses a $outcome result once as $reviewState without opening the editor or chat',
	async ({ outcome, reviewState }) => {
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ outcome }));
		vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(result({ outcome, reviewState }));
		const view = renderComponent();
		await waitAllPromises();
		view.getByTestId('dismiss').click();
		await waitAllPromises();

		expect(api.reviewSelfHealingResult).toHaveBeenCalledExactlyOnceWith(
			useRootStore().restApiContext,
			resultSelection,
			'dismiss',
		);
		expect(view.getByTestId('result-content')).toHaveAttribute('data-state', reviewState);
		expect(onItemChange).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ id: resultSelection.id, state: 'closed' }),
		);
		expect(showError).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
		expect(startChat).not.toHaveBeenCalled();
	},
);

it.each(['busy', 'failed', 'unavailable'] as const)(
	'keeps the closed result and offers a chat-only retry when the chat start is %s',
	async (outcome) => {
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ outcome: 'needs_you' }));
		const applied = appliedResult({ outcome: 'needs_you' });
		vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(applied);
		startChat.mockImplementationOnce(async () => {
			if (outcome === 'unavailable') chatAvailable.value = false;
			return outcome;
		});
		const view = renderComponent();
		await waitAllPromises();
		view.getByTestId('chat').click();
		await waitAllPromises();

		expect(onItemChange).toHaveBeenCalledOnce();
		expect(view.getByTestId('self-healing-chat-retry')).toBeInTheDocument();
		if (outcome === 'unavailable') {
			expect(view.getByTestId('self-healing-chat-retry-button')).toBeDisabled();
			view.getByTestId('self-healing-chat-retry-button').click();
			await waitAllPromises();
			expect(startChat).toHaveBeenCalledOnce();
			chatAvailable.value = true;
			await waitAllPromises();
		}

		startChat.mockResolvedValue('started');
		view.getByTestId('self-healing-chat-retry-button').click();
		await waitAllPromises();

		expect(startChat).toHaveBeenCalledTimes(2);
		expect(startChat).toHaveBeenLastCalledWith(resultSelection.projectId, applied);
		expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
		expect(onItemChange).toHaveBeenCalledOnce();
		expect(view.queryByTestId('self-healing-chat-retry')).not.toBeInTheDocument();
	},
);

it('drops the chat retry when the selection changes', async () => {
	mockResultForEachSelection({ outcome: 'needs_you' });
	vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(appliedResult({ outcome: 'needs_you' }));
	startChat.mockResolvedValueOnce('busy');
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('chat').click();
	await waitAllPromises();
	expect(view.getByTestId('self-healing-chat-retry')).toBeInTheDocument();

	await changeSelection(view, secondSelection);

	expect(view.queryByTestId('self-healing-chat-retry')).not.toBeInTheDocument();
	expect(startChat).toHaveBeenCalledOnce();
});

it('does not offer a chat retry after the selection changes during the chat start', async () => {
	const chatStart = createDeferredPromise<string>();
	startChat.mockReturnValueOnce(chatStart.promise);
	mockResultForEachSelection({ outcome: 'needs_you' });
	vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(appliedResult({ outcome: 'needs_you' }));
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('chat').click();
	await waitAllPromises();
	await changeSelection(view, secondSelection);
	chatStart.resolve('busy');
	await waitAllPromises();

	expect(view.queryByTestId('self-healing-chat-retry')).not.toBeInTheDocument();
});

it('scopes a pending action to its result', async () => {
	mockResultForEachSelection();
	const firstAction = createDeferredPromise<SelfHealingResultActionResponse>();
	const secondAction = createDeferredPromise<SelfHealingResultActionResponse>();
	vi.mocked(api.reviewSelfHealingResult)
		.mockReturnValueOnce(firstAction.promise)
		.mockReturnValueOnce(secondAction.promise);
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('dismiss').click();
	await waitAllPromises();
	expect(view.getByTestId('result-content')).toHaveAttribute('data-pending', 'dismiss');

	await changeSelection(view, secondSelection);
	expect(view.getByTestId('result-content')).not.toHaveAttribute('data-pending');
	view.getByTestId('dismiss').click();
	await waitAllPromises();
	expect(api.reviewSelfHealingResult).toHaveBeenLastCalledWith(
		useRootStore().restApiContext,
		secondSelection,
		'dismiss',
	);

	firstAction.resolve(result({ reviewState: 'discarded' }));
	await waitAllPromises();
	expect(view.getByTestId('result-content')).toHaveAttribute('data-pending', 'dismiss');

	await changeSelection(view, resultSelection);
	expect(view.getByTestId('result-content')).not.toHaveAttribute('data-pending');

	secondAction.resolve(result({ resultId: secondSelection.id, reviewState: 'discarded' }));
	await waitAllPromises();
	expect(api.reviewSelfHealingResult).toHaveBeenCalledTimes(2);
});

it('does not repeat an action that is still pending when its result is selected again', async () => {
	mockResultForEachSelection();
	const action = createDeferredPromise<SelfHealingResultActionResponse>();
	vi.mocked(api.reviewSelfHealingResult).mockReturnValueOnce(action.promise);
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('editor').click();
	await waitAllPromises();

	await changeSelection(view, secondSelection);
	await changeSelection(view, resultSelection);

	expect(view.getByTestId('result-content')).toHaveAttribute('data-pending', 'editor');
	view.getByTestId('editor').click();
	view.getByTestId('dismiss').click();
	await waitAllPromises();
	expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();

	action.resolve(appliedResult());
	await waitAllPromises();
	expect(push).toHaveBeenCalledOnce();
	expect(view.getByTestId('result-content')).not.toHaveAttribute('data-pending');
});
