import { reactive } from 'vue';

/**
 * PoC-only mock data for the Project Home attention buckets whose underlying
 * features are not shipped yet (workflow review, environments promotion,
 * execution limits). Data shapes follow the Workflow Review and
 * Environments 2.0 PRDs so the demo sells a contract the features can honor.
 * Seeded per project so the demo is stable across reloads.
 */

export interface MockReview {
	id: string;
	workflowName: string;
	author: string;
	requestedAt: string;
	waitingOn: 'you' | 'others';
}

export interface MockPromotion {
	id: string;
	workflowName: string;
	changedBy: string;
	target: string;
	versionsAhead: number;
	lastChangedAt: string;
}

export interface MockLimit {
	id: string;
	metric: string;
	used: number;
	limit: number;
	period: 'month';
	level: 'warning' | 'critical';
}

interface ProjectHomeMockState {
	reviews: MockReview[];
	promotions: MockPromotion[];
	limits: MockLimit[];
}

const stateByProject = new Map<string, ProjectHomeMockState>();

function hashCode(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}

function hoursAgo(h: number): string {
	return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

const WORKFLOW_NAMES = [
	'Order processing pipeline',
	'Customer onboarding',
	'Invoice sync to NetSuite',
	'Lead scoring & routing',
	'Daily KPI digest',
	'Refund approvals',
	'Inventory reconciliation',
];

const AUTHORS = ['Maya K.', 'Tom S.', 'Priya R.', 'Jonas B.'];

function seedState(projectId: string): ProjectHomeMockState {
	const seed = hashCode(projectId);
	const pick = <T>(arr: T[], offset: number): T => arr[(seed + offset) % arr.length];

	return reactive({
		reviews: [
			{
				id: `rev-${projectId}-1`,
				workflowName: pick(WORKFLOW_NAMES, 0),
				author: pick(AUTHORS, 0),
				requestedAt: hoursAgo(3 + (seed % 5)),
				waitingOn: 'you' as const,
			},
			{
				id: `rev-${projectId}-2`,
				workflowName: pick(WORKFLOW_NAMES, 2),
				author: pick(AUTHORS, 1),
				requestedAt: hoursAgo(26),
				waitingOn: 'others' as const,
			},
		],
		promotions: [
			{
				id: `promo-${projectId}-1`,
				workflowName: pick(WORKFLOW_NAMES, 1),
				changedBy: pick(AUTHORS, 2),
				target: 'Production',
				versionsAhead: 2 + (seed % 3),
				lastChangedAt: hoursAgo(8),
			},
		],
		limits: [
			{
				id: `limit-${projectId}-1`,
				metric: 'executions',
				used: 8600 + (seed % 900),
				limit: 10000,
				period: 'month' as const,
				level: 'warning' as const,
			},
		],
	});
}

export function useProjectHomeMocks(projectId: string): ProjectHomeMockState {
	let state = stateByProject.get(projectId);
	if (!state) {
		state = seedState(projectId);
		stateByProject.set(projectId, state);
	}
	return state;
}

export function approveMockReview(projectId: string, reviewId: string): void {
	const state = stateByProject.get(projectId);
	if (!state) return;
	state.reviews = state.reviews.filter((r) => r.id !== reviewId);
}

export function promoteMockCandidate(projectId: string, promotionId: string): void {
	const state = stateByProject.get(projectId);
	if (!state) return;
	state.promotions = state.promotions.filter((p) => p.id !== promotionId);
}
