import type {
	DecideWorkflowReviewRequestResponse,
	GetWorkflowReviewInboxSummaryResponse,
	ListWorkflowReviewActivityResponse,
	ListWorkflowReviewInboxResponse,
	WorkflowReviewActivityEntry,
	WorkflowReviewRequestDetail,
} from '@n8n/api-types';

import { useWorkflowReviewsFeature } from '@/features/workflow-reviews/composables/useWorkflowReviewsFeature';
import type {
	FetchWorkflowReviewInboxParams,
	WorkflowReviewDecisionInput,
} from '@/features/workflow-reviews/workflowReviews.api';

import { isSelfHealingReviewId } from '../selfHealing.constants';
import { useSelfHealingStore } from '../selfHealing.store';

const EMPTY_INBOX: ListWorkflowReviewInboxResponse = { data: [], nextCursor: null, hasMore: false };
const EMPTY_SUMMARY: GetWorkflowReviewInboxSummaryResponse = { open: 0, closed: 0 };

/**
 * Lets the review inbox serve assistant-authored reviews next to real ones.
 *
 * Each method takes the real request as a thunk. With the prototype flag off
 * the thunk runs untouched. With it on, the real request still runs when the
 * backend feature is enabled, but a failure falls back to an empty response so
 * the mocked reviews render on an instance without the reviews module.
 */
export function useSelfHealingReviewMocks() {
	const store = useSelfHealingStore();
	const { isWorkflowReviewsEnabled } = useWorkflowReviewsFeature();

	async function realOrFallback<T>(real: () => Promise<T>, fallback: T): Promise<T> {
		if (!isWorkflowReviewsEnabled.value) return fallback;
		try {
			return await real();
		} catch {
			return fallback;
		}
	}

	async function fetchInbox(
		params: FetchWorkflowReviewInboxParams,
		real: () => Promise<ListWorkflowReviewInboxResponse>,
	): Promise<ListWorkflowReviewInboxResponse> {
		if (!store.isEnabled) return await real();

		const response = await realOrFallback(real, EMPTY_INBOX);
		// Mocked reviews go on the first page only; later pages are the backend's.
		if (params.cursor) return response;

		const mocked = store.getInboxItems(params.state ?? 'open', params.category);
		return { ...response, data: [...mocked, ...response.data] };
	}

	async function fetchSummary(
		real: () => Promise<GetWorkflowReviewInboxSummaryResponse>,
	): Promise<GetWorkflowReviewInboxSummaryResponse> {
		if (!store.isEnabled) return await real();

		const response = await realOrFallback(real, EMPTY_SUMMARY);
		return {
			open: response.open + store.countByState('open'),
			closed: response.closed + store.countByState('closed'),
		};
	}

	function ownsReview(reviewId: string): boolean {
		return store.isEnabled && isSelfHealingReviewId(reviewId);
	}

	async function fetchDetail(
		reviewId: string,
		real: () => Promise<WorkflowReviewRequestDetail>,
	): Promise<WorkflowReviewRequestDetail> {
		if (!ownsReview(reviewId)) return await real();

		const detail = store.getDetail(reviewId);
		if (!detail) throw new Error(`Unknown self-healing review: ${reviewId}`);
		return detail;
	}

	async function decide(
		reviewId: string,
		input: WorkflowReviewDecisionInput,
		real: () => Promise<DecideWorkflowReviewRequestResponse>,
	): Promise<DecideWorkflowReviewRequestResponse> {
		if (!ownsReview(reviewId)) return await real();
		return store.decide(reviewId, input);
	}

	async function fetchActivity(
		reviewId: string,
		real: () => Promise<ListWorkflowReviewActivityResponse>,
	): Promise<ListWorkflowReviewActivityResponse> {
		if (!ownsReview(reviewId)) return await real();
		return { data: store.getActivity(reviewId), nextCursor: null, hasMore: false };
	}

	async function postComment(
		reviewId: string,
		body: string,
		real: () => Promise<WorkflowReviewActivityEntry>,
	): Promise<WorkflowReviewActivityEntry> {
		if (!ownsReview(reviewId)) return await real();
		return store.addComment(reviewId, body);
	}

	return {
		fetchInbox,
		fetchSummary,
		fetchDetail,
		decide,
		fetchActivity,
		postComment,
	};
}
