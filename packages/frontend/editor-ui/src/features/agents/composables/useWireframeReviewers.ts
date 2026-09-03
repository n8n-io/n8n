import { useStorage } from '@vueuse/core';
import { computed, type Ref } from 'vue';

export type WireframeReviewer = {
	id: string;
	/** A person you invited, or a dev-built agent attached as a custom tester. */
	kind: 'person' | 'tester';
	name: string;
	email?: string;
	/** For testers: the agent that does the checking. */
	agentId?: string;
	/** Attention items raised by this reviewer (stubbed for humans). */
	attention: number;
	/** 'link' = 14-day link, 'role' = scoped n8n role. */
	access: 'link' | 'role';
	invitedAt: string;
};

export type WireframeAsk = {
	reviewerId: string;
	askedAt: string;
};

function initialsOf(name: string) {
	return name
		.split(/[\s.@_-]+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((p) => p.charAt(0).toUpperCase())
		.join('');
}

/**
 * Wireframe stub: invited human reviewers live in localStorage per agent. No
 * backend yet — this exists to exercise the UI (invite, Ask someone, cluster).
 */
export function useWireframeReviewers(agentId: Ref<string>) {
	const reviewers = useStorage<WireframeReviewer[]>(
		computed(() => `N8N_WIREFRAME_REVIEWERS:${agentId.value}`),
		[],
	);
	// Rows saved before `kind` existed are people.
	for (const r of reviewers.value) if (!r.kind) r.kind = 'person';
	/** Per moment key → who was asked. */
	const asks = useStorage<Record<string, WireframeAsk>>(
		computed(() => `N8N_WIREFRAME_ASKS:${agentId.value}`),
		{},
	);

	function invite(email: string, access: WireframeReviewer['access']) {
		const trimmed = email.trim();
		if (!trimmed) return null;
		const name = trimmed.includes('@')
			? trimmed
					.split('@')[0]
					.split(/[._-]/)
					.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
					.join(' ')
			: trimmed;
		const reviewer: WireframeReviewer = {
			id: `rev-${Date.now()}`,
			kind: 'person',
			name,
			email: trimmed.includes('@') ? trimmed : undefined,
			attention: 0,
			access,
			invitedAt: new Date().toISOString(),
		};
		reviewers.value = [...reviewers.value, reviewer];
		return reviewer;
	}

	/** Attach another agent as a custom tester. Stub: it never actually runs. */
	function addTester(agent: { id: string; name: string }) {
		if (reviewers.value.some((r) => r.agentId === agent.id)) return null;
		const reviewer: WireframeReviewer = {
			id: `tester-${agent.id}`,
			kind: 'tester',
			name: agent.name,
			agentId: agent.id,
			attention: 0,
			access: 'role',
			invitedAt: new Date().toISOString(),
		};
		reviewers.value = [...reviewers.value, reviewer];
		return reviewer;
	}

	const people = computed(() => reviewers.value.filter((r) => r.kind === 'person'));
	const testers = computed(() => reviewers.value.filter((r) => r.kind === 'tester'));

	function remove(id: string) {
		reviewers.value = reviewers.value.filter((r) => r.id !== id);
	}

	function ask(momentKey: string, reviewerId: string) {
		asks.value = { ...asks.value, [momentKey]: { reviewerId, askedAt: new Date().toISOString() } };
	}

	function askedFor(momentKey: string): WireframeReviewer | null {
		const a = asks.value[momentKey];
		return a ? (reviewers.value.find((r) => r.id === a.reviewerId) ?? null) : null;
	}

	return { reviewers, people, testers, invite, addTester, remove, ask, askedFor, initialsOf };
}
