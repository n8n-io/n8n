import type { CaseInputFlavor } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useStorage } from '@vueuse/core';
import { computed, ref, watch, type Ref } from 'vue';

import type { AgentCheck, AgentChecksApi } from './useAgentChecks';
import { getChatMessages } from './useAgentApi';
import { listThreads } from './useAgentThreadsApi';
import type { useWireframeReviewers } from './useWireframeReviewers';

/** One thing that wants a human eye: a Tester check result or a sampled live exchange. */
export type ReviewMoment = {
	key: string;
	kind: 'check' | 'live';
	/** Who raised it: the Tester (with a kind) or a channel. */
	source: string;
	flavor?: CaseInputFlavor;
	request: string;
	reply: string | null;
	whatToCheck?: string;
	check?: AgentCheck;
	threadId?: string;
	/** Live moments are synthesised from earlier preview sessions and shown as "Sample". */
	sample: boolean;
};

type LiveVerdict = { vote: 'up' | 'down'; note?: string; at: string };

// SAMPLE DATA — wireframe only. Live moments come from the agent's recent preview
// sessions, relabelled as if they arrived from a channel, so the flow can be felt
// without a Slack integration. Remove when live sweeping exists.
const SAMPLE_CHANNELS = ['Slack · #support', 'Slack · DM', 'Email'];
const SAMPLE_LIVE_LIMIT = 3;
// Off: sampled "live" moments inflated the Review count without matching any row.
const SAMPLE_LIVE_MOMENTS_ENABLED = false;

function textOf(parts: Array<{ type: string; text?: string }>): string {
	return parts
		.filter((p) => p.type === 'text' && p.text)
		.map((p) => p.text ?? '')
		.join('\n')
		.trim();
}

/**
 * Wireframe: the review queue behind "Review N" / focus mode. Merges Tester checks
 * that need an eye with sampled live moments, walks them one at a time, and turns
 * verdicts into ratings (checks), local verdicts (live), and rules (new check rows).
 */
export function useAgentReviewQueue(params: {
	projectId: Ref<string>;
	agentId: Ref<string>;
	currentSessionId: Ref<string | undefined>;
	checks: AgentChecksApi;
	reviewers: ReturnType<typeof useWireframeReviewers>;
}) {
	const rootStore = useRootStore();

	const liveMoments = ref<ReviewMoment[]>([]);
	const liveVerdicts = useStorage<Record<string, LiveVerdict>>(
		computed(() => `N8N_WIREFRAME_LIVE_VERDICTS:${params.agentId.value}`),
		{},
	);

	async function loadLiveMoments() {
		const projectId = params.projectId.value;
		const agentId = params.agentId.value;
		if (!SAMPLE_LIVE_MOMENTS_ENABLED || !projectId || !agentId) return;
		try {
			const page = await listThreads(rootStore.restApiContext, projectId, agentId, { limit: 6 });
			const moments: ReviewMoment[] = [];
			for (const thread of page.threads) {
				if (moments.length >= SAMPLE_LIVE_LIMIT) break;
				const { messages } = await getChatMessages(
					rootStore.restApiContext,
					projectId,
					agentId,
					thread.id,
				);
				// Walk user → assistant pairs, most recent first, so the samples read as
				// separate "moments" even when the agent only has one session so far.
				for (let i = messages.length - 1; i > 0 && moments.length < SAMPLE_LIVE_LIMIT; i--) {
					const assistant = messages[i];
					const user = messages[i - 1];
					if (assistant.role !== 'assistant' || user.role !== 'user') continue;
					const request = textOf(user.content);
					const reply = textOf(assistant.content);
					if (!request || !reply) continue;
					moments.push({
						key: `live:${thread.id}:${assistant.id}`,
						kind: 'live',
						source: SAMPLE_CHANNELS[moments.length % SAMPLE_CHANNELS.length],
						request,
						reply,
						threadId: thread.id,
						sample: true,
					});
				}
			}
			liveMoments.value = moments;
		} catch {
			liveMoments.value = [];
		}
	}

	watch(params.agentId, () => void loadLiveMoments(), { immediate: true });

	function toMoment(c: AgentCheck): ReviewMoment {
		return {
			key: `check:${c.rowId}`,
			kind: 'check',
			source: 'tester',
			flavor: c.flavor,
			request: c.input,
			reply: c.answer,
			whatToCheck: c.whatToCheck,
			check: c,
			sample: false,
		};
	}

	const checkMoments = computed<ReviewMoment[]>(() =>
		params.checks.checks.value.filter((c) => c.state === 'needsEye').map(toMoment),
	);
	/** Every check with a reply can be opened from the popover, whatever its state. */
	const openableChecks = computed<ReviewMoment[]>(() =>
		params.checks.checks.value.filter((c) => c.result !== null).map(toMoment),
	);

	/** Everything still waiting: no verdict, not handed to someone else. */
	const queue = computed<ReviewMoment[]>(() => [
		...checkMoments.value,
		...liveMoments.value.filter(
			(m) => !liveVerdicts.value[m.key] && !params.reviewers.askedFor(m.key),
		),
	]);
	const attentionCount = computed(() => queue.value.length);

	// Focus mode walks a snapshot taken when it opens, so "n of N" holds still
	// while verdicts remove items from the live queue underneath.
	const active = ref(false);
	const snapshot = ref<string[]>([]);
	const index = ref(0);
	const total = computed(() => snapshot.value.length);
	const position = computed(() => Math.min(index.value + 1, total.value));
	const allMoments = computed(() => [...openableChecks.value, ...liveMoments.value]);
	const current = computed<ReviewMoment | null>(() => {
		const key = snapshot.value[index.value];
		return key ? (allMoments.value.find((m) => m.key === key) ?? null) : null;
	});
	const done = computed(() => active.value && index.value >= total.value);

	function open(startKey?: string) {
		const keys = queue.value.map((m) => m.key);
		if (startKey && !keys.includes(startKey)) keys.unshift(startKey);
		snapshot.value = keys;
		index.value = startKey ? Math.max(0, keys.indexOf(startKey)) : 0;
		active.value = true;
	}

	function close() {
		active.value = false;
		snapshot.value = [];
		index.value = 0;
	}

	function advance() {
		index.value += 1;
		lastRule.value = null;
	}

	function skip() {
		advance();
	}

	async function looksRight() {
		const m = current.value;
		if (!m) return;
		if (m.kind === 'check' && m.check) await params.checks.vote(m.check, 'up');
		else
			liveVerdicts.value = {
				...liveVerdicts.value,
				[m.key]: { vote: 'up', at: new Date().toISOString() },
			};
		advance();
	}

	/** The last change to the checks, kept until the next action so it can be undone. */
	const lastRule = ref<
		| { mode: 'added'; rowId: number; whatToCheck: string }
		| { mode: 'updated'; rowId: number; input: string; whatToCheck: string; previous: string }
		| null
	>(null);

	async function notRight(note: string) {
		const m = current.value;
		if (!m) return;
		const sentence = note.trim();
		if (m.kind === 'check' && m.check) {
			await params.checks.vote(m.check, 'down', sentence);
			// The comment feeds the check it came from; the Tester rechecks it next run.
			if (sentence) {
				const previous = m.check.whatToCheck;
				const next = previous ? `${previous}\n${sentence}` : sentence;
				await params.checks.updateCheck(m.check.rowId, { input: m.check.input, whatToCheck: next });
				advance();
				lastRule.value = {
					mode: 'updated',
					rowId: m.check.rowId,
					input: m.check.input,
					whatToCheck: sentence,
					previous,
				};
				return;
			}
			advance();
			lastRule.value = null;
			return;
		}
		liveVerdicts.value = {
			...liveVerdicts.value,
			[m.key]: { vote: 'down', note: sentence, at: new Date().toISOString() },
		};
		// A live moment has no check yet: the sentence becomes one.
		const created = sentence ? await params.checks.addCheck(m.request, sentence) : null;
		advance();
		lastRule.value = created
			? { mode: 'added', rowId: created.rowId, whatToCheck: sentence }
			: null;
	}

	async function rerun() {
		await params.checks.run();
	}

	/** Not right, without leaving the card: the fix happens right here. */
	async function markNotRight() {
		const m = current.value;
		if (!m || m.kind !== 'check' || !m.check) return;
		await params.checks.vote(m.check, 'down', 'Not right');
	}

	async function undoRule() {
		const rule = lastRule.value;
		if (!rule) return;
		lastRule.value = null;
		if (rule.mode === 'added') await params.checks.removeCheck(rule.rowId);
		else
			await params.checks.updateCheck(rule.rowId, {
				input: rule.input,
				whatToCheck: rule.previous,
			});
	}

	function ask(reviewerId: string) {
		const m = current.value;
		if (!m) return;
		params.reviewers.ask(m.key, reviewerId);
		advance();
	}

	return {
		queue,
		attentionCount,
		liveMoments,
		active,
		current,
		position,
		total,
		done,
		lastRule,
		open,
		close,
		skip,
		looksRight,
		notRight,
		markNotRight,
		rerun,
		undoRule,
		ask,
	};
}

export type AgentReviewQueue = ReturnType<typeof useAgentReviewQueue>;
