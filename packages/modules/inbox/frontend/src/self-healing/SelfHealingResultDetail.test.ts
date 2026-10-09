import type { SelfHealingResultActionResponse } from '@n8n/api-types';
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
<button v-for="action in ['apply', 'approve-and-publish', 'dismiss', 'chat']" :key="action" :data-test-id="action" @click="$emit('action', action)" />
<slot name="notice" />
</div>`,
			},
		},
	},
});

beforeEach(() => {
	vi.resetAllMocks();
	selectedId = resultSelection.id;
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

it.each(['apply', 'approve-and-publish'] as const)(
	'opens the editor after confirmed %s',
	async (action) => {
		vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(result({ reviewState: 'applied' }));
		const view = renderComponent();
		await waitAllPromises();
		view.getByTestId(action).click();
		await waitAllPromises();
		expect(api.reviewSelfHealingResult).toHaveBeenCalledExactlyOnceWith(
			useRootStore().restApiContext,
			resultSelection,
			action,
		);
		expect(onItemChange).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				type: 'self_healing_result',
				id: resultSelection.id,
				state: 'closed',
			}),
		);
		expect(push).toHaveBeenCalledExactlyOnceWith({
			name: 'NodeViewExisting',
			params: { workflowId: resultSelection.workflowId },
		});
		view.getByTestId(action).click();
		await waitAllPromises();
		expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
	},
);

it('retains applied state and opens the editor when publication returns an error', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockResolvedValue({
		...result({ reviewState: 'applied' }),
		publishError: 'Review is required',
	});
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('approve-and-publish').click();
	await waitAllPromises();
	expect(useSelfHealingResultStore().detail?.reviewState).toBe('applied');
	expect(showMessage).toHaveBeenCalledWith(
		expect.objectContaining({ type: 'warning', message: 'Review is required' }),
	);
	expect(push).toHaveBeenCalledOnce();
});

it.each(['discarded', 'outdated'] as const)(
	'keeps the review visible after a competing %s closure',
	async (reviewState) => {
		vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(result({ reviewState }));
		const view = renderComponent();
		await waitAllPromises();
		view.getByTestId('apply').click();
		await waitAllPromises();
		expect(view.getByTestId('result-content')).toHaveAttribute('data-state', reviewState);
		expect(push).not.toHaveBeenCalled();
		expect(onItemChange).toHaveBeenCalledOnce();
	},
);

it('keeps a failed save open after the recovery read confirms no change', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Save failed'));
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('apply').click();
	await waitAllPromises();
	expect(view.getByTestId('result-content')).toHaveAttribute('data-state', 'open');
	expect(showError).toHaveBeenCalledOnce();
	expect(push).not.toHaveBeenCalled();
	expect(onItemChange).not.toHaveBeenCalled();
});

it('recovers an applied result after a lost response without another mutation', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Disconnected'));
	const view = renderComponent();
	await waitAllPromises();
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ reviewState: 'applied' }));
	view.getByTestId('apply').click();
	await waitAllPromises();
	expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
	expect(onItemChange).toHaveBeenCalledOnce();
	expect(push).toHaveBeenCalledOnce();
	expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
});

it('recovers closure and editor navigation when a later retry resolves an uncertain save', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Disconnected'));
	const view = renderComponent();
	await waitAllPromises();
	vi.mocked(api.fetchSelfHealingResult).mockRejectedValueOnce(new Error('Offline'));
	view.getByTestId('apply').click();
	await waitAllPromises();
	expect(view.queryByTestId('result-content')).not.toBeInTheDocument();
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ reviewState: 'applied' }));
	view.getByRole('button', { name: 'Retry' }).click();
	await waitAllPromises();
	expect(onItemChange).toHaveBeenCalledOnce();
	expect(push).toHaveBeenCalledOnce();
	expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
});

it.each(['discarded', 'dismissed'] as const)(
	'recovers a %s result after a lost response without showing an action error',
	async (reviewState) => {
		vi.mocked(api.reviewSelfHealingResult).mockRejectedValue(new Error('Disconnected'));
		const view = renderComponent();
		await waitAllPromises();
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ reviewState }));
		view.getByTestId('dismiss').click();
		await waitAllPromises();
		expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
		expect(onItemChange).toHaveBeenCalledOnce();
		expect(push).not.toHaveBeenCalled();
		expect(showError).not.toHaveBeenCalled();
	},
);

it('does not reconcile twice when opening the editor fails after save', async () => {
	vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(result({ reviewState: 'applied' }));
	push.mockRejectedValue(new Error('Navigation failed'));
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('apply').click();
	await waitAllPromises();
	expect(onItemChange).toHaveBeenCalledOnce();
	expect(api.fetchSelfHealingResult).toHaveBeenCalledOnce();
	expect(useSelfHealingResultStore().detail?.reviewState).toBe('applied');
});

it('reconciles a completed action after leaving the detail without navigating away from the new page', async () => {
	const action = createDeferredPromise<SelfHealingResultActionResponse>();
	vi.mocked(api.reviewSelfHealingResult).mockReturnValue(action.promise);
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('apply').click();
	view.getByTestId('apply').click();
	selectedId = null;
	view.unmount();
	action.resolve(result({ reviewState: 'applied' }));
	await waitAllPromises();
	expect(onItemChange).toHaveBeenCalledOnce();
	expect(api.reviewSelfHealingResult).toHaveBeenCalledOnce();
	expect(push).not.toHaveBeenCalled();
});

it('prevents approval without publish access and applying an informational result', async () => {
	vi.mocked(api.fetchResultWorkflow).mockResolvedValue({
		name: 'Daily report',
		scopes: ['workflow:read', 'workflow:update'],
	});
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ outcome: 'needs_you' }));
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('approve-and-publish').click();
	view.getByTestId('apply').click();
	await waitAllPromises();
	expect(api.reviewSelfHealingResult).not.toHaveBeenCalled();
});

it('dismisses the shared result without opening an editor or chat', async () => {
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(
		result({ outcome: 'could_not_fix', suggestion: null }),
	);
	vi.mocked(api.reviewSelfHealingResult).mockResolvedValue(
		result({ outcome: 'could_not_fix', suggestion: null, reviewState: 'dismissed' }),
	);
	const view = renderComponent();
	await waitAllPromises();
	view.getByTestId('dismiss').click();
	await waitAllPromises();
	expect(onItemChange).toHaveBeenCalledOnce();
	expect(push).not.toHaveBeenCalled();
	expect(startChat).not.toHaveBeenCalled();
});

it.each([true, false])(
	'rereads authorization for chat and uses current execution availability (%s)',
	async (available) => {
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ outcome: 'needs_you' }));
		const view = renderComponent();
		await waitAllPromises();
		vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(
			result({
				outcome: 'needs_you',
				report: 'Saved report',
				execution: available
					? { status: 'available', id: 'authorized-execution' }
					: { status: 'unavailable' },
			}),
		);
		view.getByTestId('chat').click();
		await waitAllPromises();
		expect(startChat).toHaveBeenCalledExactlyOnceWith({
			resultId: resultSelection.id,
			outcome: 'needs_you',
			report: 'Saved report',
			workflowId: resultSelection.workflowId,
			workflowName: 'Daily report',
			...(available ? { executionId: 'authorized-execution' } : {}),
		});
		expect(api.reviewSelfHealingResult).not.toHaveBeenCalled();
		expect(onItemChange).not.toHaveBeenCalled();
	},
);

it('clears the report and does not start a chat after edit access is lost', async () => {
	vi.mocked(api.fetchSelfHealingResult).mockResolvedValue(result({ outcome: 'needs_you' }));
	const view = renderComponent();
	await waitAllPromises();
	vi.mocked(api.fetchSelfHealingResult).mockRejectedValue(
		new ResponseError('Forbidden', { httpStatusCode: 403 }),
	);
	view.getByTestId('chat').click();
	await waitAllPromises();
	expect(view.queryByTestId('result-content')).not.toBeInTheDocument();
	expect(startChat).not.toHaveBeenCalled();
	expect(onItemChange).not.toHaveBeenCalled();
});
