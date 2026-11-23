import type { InboxPromotionReviewItem, PromotionReviewChanges } from '@n8n/api-types';
import axios, { AxiosError } from 'axios';

import type { PromotionOutsideAccessDependency } from '../promotions.types';
import {
	buildOutsideAccess,
	buildPlaygroundDetail,
	buildPlaygroundPreview,
	workflowCountOf,
	type PlaygroundProject,
} from './playground.data';
import { respond } from './playground.mock-api';
import type { PlaygroundSize } from './playground.scenarios';

/**
 * Development only. Gives the Inbox a promotion review with issues, so the real review screen
 * can be seen. Unlike the preview scenarios, this one outlives the Playground page: the review
 * opens in the Inbox, and the user comes back with the back button of the browser.
 */
export const PLAYGROUND_REVIEW_ID = 'playground-review';

const HEAD = 'b'.repeat(40);
const BASE = 'a'.repeat(40);
const NOW = new Date().toISOString();

const reviewItem: InboxPromotionReviewItem = {
	type: 'promotion_review',
	id: PLAYGROUND_REVIEW_ID,
	state: 'open',
	reviewState: 'open',
	reviewType: 'gitlab',
	title: 'Promote Sales changes to Production',
	webUrl: 'https://gitlab.example.com/sales/workflows/-/merge_requests/12',
	branchName: 'n8n-promotion/12',
	environmentName: 'To production',
	requester: {
		id: 'playground-user',
		firstName: 'Ada',
		lastName: 'Lovelace',
		email: 'ada@example.com',
	},
	approver: null,
	remoteError: null,
	headCommitSha: HEAD,
	runCommitSha: HEAD,
	hasConflicts: false,
	createdAt: NOW,
	updatedAt: NOW,
};

type ReviewContext = { size: PlaygroundSize; project: PlaygroundProject };

function reviewChanges({ size, project }: ReviewContext) {
	const preview = buildPlaygroundPreview('p1', 'promote', size, project);
	const outsideAccess: PromotionOutsideAccessDependency[] = buildOutsideAccess(
		size,
		workflowCountOf(size),
		project,
	);
	const changes: PromotionReviewChanges & { outsideAccess: PromotionOutsideAccessDependency[] } = {
		baselineCommitSha: BASE,
		headCommitSha: HEAD,
		resources: preview.resources,
		dependencies: preview.dependencies,
		warnings: [],
		outcome: null,
		outsideAccess,
	};
	return { preview, changes };
}

function requestedKeys(data: unknown): string[] {
	if (typeof data !== 'string') return [];
	const body: unknown = JSON.parse(data);
	if (typeof body !== 'object' || body === null || !('keys' in body) || !Array.isArray(body.keys)) {
		return [];
	}
	return body.keys.filter((key): key is string => typeof key === 'string');
}

const INBOX_LIST = /\/inbox$/;
const INBOX_SUMMARY = /\/inbox\/summary$/;
const REVIEW_CHANGES = /\/promotions\/reviews\/[^/]+\/changes$/;
const REVIEW_DETAILS = /\/promotions\/reviews\/[^/]+\/changes\/details$/;

let remove: (() => void) | undefined;

/** Starts answering the Inbox and the review requests. Calling it again replaces the answers. */
export function startReviewMock(context: ReviewContext) {
	stopReviewMock();
	const hook = axios.interceptors.request.use((config) => {
		const url = config.url ?? '';
		const known = [INBOX_LIST, INBOX_SUMMARY, REVIEW_CHANGES, REVIEW_DETAILS].some((path) =>
			path.test(url),
		);
		if (!known) return config;

		config.adapter = async (adapterConfig) => {
			// The REST API wraps every answer in a `data` key. The public API, used by the preview
			// scenarios, does not.
			const answer = (payload: unknown) => respond(adapterConfig, { data: payload });
			if (INBOX_SUMMARY.test(url)) {
				return answer({
					counts: { open: 1, closed: 0 },
					partial: false,
					failedSources: [],
					disabledSources: [],
				});
			}
			if (INBOX_LIST.test(url)) {
				return answer({
					data: [reviewItem],
					hasMore: false,
					nextCursor: null,
					partial: false,
					failedSources: [],
					disabledSources: [],
				});
			}
			const { preview, changes } = reviewChanges(context);
			if (REVIEW_CHANGES.test(url)) return answer(changes);
			if (REVIEW_DETAILS.test(url)) {
				const details = requestedKeys(adapterConfig.data).flatMap((key) => {
					const detail = buildPlaygroundDetail(preview, key);
					return detail ? [detail] : [];
				});
				return answer({ details, missingKeys: [] });
			}
			throw new AxiosError(`The Playground has no sample data for ${url}`);
		};
		return config;
	});
	remove = () => axios.interceptors.request.eject(hook);
}

export function stopReviewMock() {
	remove?.();
	remove = undefined;
}
