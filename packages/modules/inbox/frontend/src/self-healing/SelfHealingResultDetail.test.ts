import type { SelfHealingResultDetail as ResultDetail } from '@n8n/api-types';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer, waitAllPromises } from '@n8n/frontend-test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { computed } from 'vue';

import SelfHealingResultDetail from './SelfHealingResultDetail.vue';
import { useSelfHealingResultStore } from './selfHealingResult.store';
import * as api from './selfHealingResults.api';
import { result, resultSelection } from './selfHealingResults.test.utils';

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
				props: ['detail', 'pendingAction', 'canPublish'],
				template: `<div data-test-id="result-content" :data-state="detail.reviewState" :data-pending="pendingAction">
<span>{{ detail.report }}</span>
<button v-for="action in ['editor', 'approve-and-publish', 'dismiss', 'chat']" :key="action" :data-test-id="action" @click="$emit('action', action)" />
<slot name="notice" />
</div>`,
			},
		},
	},
});

function appliedResult(overrides: Partial<ResultDetail> = {}): ResultDetail {
	return {
		...result({ reviewState: 'applied' }),
		continuedAt: '2026-10-09T10:00:00.000Z',
		continuedById: 'reviewer-1',
		chatThreadId: null,
		...overrides,
	};
}

beforeEach(() => {
	vi.resetAllMocks();
	selectedId = resultSelection.id;
	startChat.mockResolvedValue(true);
	capabilityRegistry.provide(capabilities.createSelfHealingChatHandoff, () => ({
		available: computed(() => true),
		start: startChat,
	}));
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result());
	vi.mocked(api.fetchResultWorkflow).mockResolvedValue({
		name: 'Daily report',
		scopes: ['workflow:read', 'workflow:update', 'workflow:publish'],
	});
});
afterEach(() => capabilityRegistry.clear());

it.each([
	{ outcome: 'fix_ready', destination: 'editor' },
	{ outcome: 'fix_ready', destination: 'chat' },
	{ outcome: 'needs_you', destination: 'editor' },
	{ outcome: 'needs_you', destination: 'chat' },
	{ outcome: 'could_not_fix', destination: 'editor' },
	{ outcome: 'could_not_fix', destination: 'chat' },
] as const)(
	'applies and closes $outcome before opening $destination with one request',
	async ({ outcome, destination }) => {
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(
			result({ outcome, ...(outcome === 'could_not_fix' ? { suggestion: null } : {}) }),
		);
		vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(
			appliedResult({
				outcome,
				reviewState: outcome === 'could_not_fix' ? 'continued' : 'applied',
				chatThreadId: destination === 'chat' ? 'private-thread' : null,
			}),
		);
		const navigate = destination === 'chat' ? startChat : push;
		navigate.mockImplementation(async () => {
			expect(onItemChange).toHaveBeenCalledOnce();
		});
		const view = renderComponent();
		await waitAllPromises();
		view.getByTestId(destination).click();
		await waitAllPromises();

		expect(api.reviewSelfHealingResult).toHaveBeenCalledExactlyOnceWith(
			useRootStore().restApiContext,
			resultSelection,
			destination === 'editor' ? 'apply' : 'chat',
		);
		expect(api.fetchSelfHealingResult).toHaveBeenCalledOnce();
		expect(onItemChange).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				type: 'self_healing_result',
				id: resultSelection.id,
				state: 'closed',
			}),
		);
		if (destination === 'chat') {
			expect(startChat).toHaveBeenCalledExactlyOnceWith({ threadId: 'private-thread' });
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

it.each(['editor', 'chat'] as const)(
	'preserves a closed result when opening %s again',
	async (destination) => {
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ reviewState: 'dismissed' }));
		vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(
			appliedResult({
				reviewState: 'dismissed',
				chatThreadId: destination === 'chat' ? 'private-thread' : null,
			}),
		);
		const view = renderComponent();
		await waitAllPromises();
		view.getByTestId(destination).click();
		await waitAllPromises();

		expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
		expect(onItemChange).not.toHaveBeenCalled();
		expect(useSelfHealingResultStore().detail?.reviewState).toBe('dismissed');
		expect(destination === 'chat' ? startChat : push).toHaveBeenCalledOnce();
	},
);

it.each(['editor', 'chat'] as const)(
	'refreshes saved %s state after a lost response without navigating',
	async (destination) => {
		vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Disconnected'));
		const view = renderComponent();
		await waitAllPromises();
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(
			appliedResult({
				chatThreadId: destination === 'chat' ? 'saved-thread' : null,
			}),
		);
		view.getByTestId(destination).click();
		await waitAllPromises();

		expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
		expect(onItemChange).toHaveBeenCalledOnce();
		expect(destination === 'chat' ? startChat : push).not.toHaveBeenCalled();
		expect(showError).toHaveBeenCalledOnce();
	},
);

it('reuses the saved caller chat when the user retries after a lost response', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockRejectedValueOnce(new Error('Disconnected'));
	const view = renderComponent();
	await waitAllPromises();
	const saved = appliedResult({ chatThreadId: 'existing-caller-thread' });
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(saved);
	view.getByTestId('chat').click();
	await waitAllPromises();
	expect(startChat).not.toHaveBeenCalled();
	expect(onItemChange).toHaveBeenCalledOnce();
	vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(saved);
	view.getByTestId('chat').click();
	await waitAllPromises();

	expect(startChat).toHaveBeenCalledExactlyOnceWith({ threadId: 'existing-caller-thread' });
	expect(onItemChange).toHaveBeenCalledOnce();
	expect(api.reviewSelfHealingResult).toHaveBeenCalledTimes(2);
});

it('reconciles a later refresh without navigating or repeating the action', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Disconnected'));
	const view = renderComponent();
	await waitAllPromises();
	vi.mocked(api.fetchSelfHealingResult).mockRejectedValueOnce(new Error('Offline'));
	view.getByTestId('editor').click();
	await waitAllPromises();
	expect(view.queryByTestId('result-content')).not.toBeInTheDocument();
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
	'retains closure when %s navigation fails and retries the same destination',
	async (destination) => {
		vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(
			appliedResult({ chatThreadId: 'saved-thread' }),
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
		expect(navigate).toHaveBeenCalledTimes(2);
		expect(onItemChange).toHaveBeenCalledOnce();
		if (destination === 'chat')
			expect(startChat).toHaveBeenLastCalledWith({ threadId: 'saved-thread' });
	},
);

it('retains closure when the shell handles a chat navigation failure', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(
		appliedResult({ chatThreadId: 'saved-thread' }),
	);
	startChat.mockResolvedValue(false);
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('chat').click();
	await waitAllPromises();

	expect(useSelfHealingResultStore().detail?.reviewState).toBe('applied');
	expect(onItemChange).toHaveBeenCalledOnce();
	expect(api.fetchSelfHealingResult).toHaveBeenCalledOnce();
	expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
});

it('reconciles the result after leaving the detail without navigating away from the new page', async () => {
	const action = createDeferredPromise<ResultDetail>();
	vi.mocked(api.reviewSelfHealingResult).mockReturnValue(action.promise);
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('editor').click();
	view.getByTestId('chat').click();
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
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('chat').click();
	await waitAllPromises();
	expect(api.reviewSelfHealingResult).not.toHaveBeenCalled();
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

it('refreshes an applied approval after a lost response without navigating or publishing again', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Disconnected'));
	const view = renderComponent();
	await waitAllPromises();
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ reviewState: 'applied' }));
	view.getByTestId('approve-and-publish').click();
	await waitAllPromises();

	expect(onItemChange).toHaveBeenCalledOnce();
	expect(push).not.toHaveBeenCalled();
	expect(showError).toHaveBeenCalledOnce();
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

it.each(['discarded', 'dismissed'] as const)(
	'refreshes a %s result after a lost dismissal response',
	async (reviewState) => {
		vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Disconnected'));
		const view = renderComponent();
		await waitAllPromises();
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ reviewState }));
		view.getByTestId('dismiss').click();
		await waitAllPromises();

		expect(onItemChange).toHaveBeenCalledOnce();
		expect(showError).toHaveBeenCalledOnce();
		expect(startChat).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
	},
);
