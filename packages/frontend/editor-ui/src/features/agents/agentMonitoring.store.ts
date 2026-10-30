import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
	AgentOnlineActivityItem,
	AgentOnlineCaseResult,
	AgentOnlineRubric,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';

import {
	approveOnlineRubric,
	generateOnlineRubric,
	getOnlineRubric,
	listOnlineActivity,
	listOnlineCases,
	listOnlineSessions,
	localApprovals,
	runOnlineChecks,
} from './agentEvals.api';

export interface AgentMonitoring {
	rubric: AgentOnlineRubric | null;
	/** The latest assessment of each checked session, by thread ID. */
	results: Record<string, AgentOnlineCaseResult>;
	activity: AgentOnlineActivityItem[];
	/** Thread IDs waiting for, or in, a check. */
	checking: string[];
	generating: boolean;
	loaded: boolean;
	error: string;
}

export const emptyMonitoring = (): AgentMonitoring => ({
	rubric: null,
	results: {},
	activity: [],
	checking: [],
	generating: false,
	loaded: false,
	error: '',
});

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Prototype of live monitoring for a published agent. It holds the approved
 * checks and the latest assessment of each session, so the Monitoring and
 * Sessions tabs share one view. Checking runs in this store, so it continues
 * when the user changes tabs.
 */
export const useAgentMonitoringStore = defineStore('agentMonitoring', () => {
	const rootStore = useRootStore();
	const byAgent = ref<Record<string, AgentMonitoring>>({});
	/** The agent whose Monitoring tab should write checks on arrival, set by the publish popover. */
	const setupRequestedFor = ref<string | null>(null);

	const stateOf = (agentId: string) => {
		byAgent.value[agentId] ??= emptyMonitoring();
		return byAgent.value[agentId];
	};
	const isMonitoring = (agentId: string) => Boolean(byAgent.value[agentId]?.rubric?.approvedAt);
	/** Saves checks edited in place, keeping an approval held in this browser. */
	const setRubric = (agentId: string, rubric: AgentOnlineRubric) => {
		stateOf(agentId).rubric = localApprovals.apply(agentId, rubric);
	};

	async function loadResults(projectId: string, agentId: string) {
		const state = stateOf(agentId);
		const [page, activity] = await Promise.all([
			listOnlineCases(rootStore.restApiContext, projectId, agentId),
			listOnlineActivity(rootStore.restApiContext, projectId, agentId),
		]);
		state.results = Object.fromEntries(
			page.items
				.filter((item) => item.threadId && item.latestResult)
				.map((item) => [item.threadId!, item.latestResult!]),
		);
		state.activity = activity.items;
	}

	async function load(projectId: string, agentId: string) {
		const state = stateOf(agentId);
		state.error = '';
		try {
			const rubric = await getOnlineRubric(rootStore.restApiContext, projectId, agentId);
			state.rubric = localApprovals.apply(agentId, rubric);
			await loadResults(projectId, agentId);
		} catch (error) {
			state.error = message(error);
		} finally {
			state.loaded = true;
		}
	}

	async function generate(projectId: string, agentId: string) {
		const state = stateOf(agentId);
		state.generating = true;
		state.error = '';
		try {
			state.rubric = await generateOnlineRubric(rootStore.restApiContext, projectId, agentId);
		} catch (error) {
			state.error = message(error);
		} finally {
			state.generating = false;
		}
	}

	/** Checks finished sessions that have no assessment yet, one at a time. */
	async function checkUnchecked(projectId: string, agentId: string) {
		const state = stateOf(agentId);
		if (!state.rubric?.approvedAt || state.checking.length > 0) return;
		try {
			const sessions = await listOnlineSessions(rootStore.restApiContext, projectId, agentId);
			state.checking = sessions
				.map((session) => session.threadId)
				.filter((threadId) => !state.results[threadId]);
			for (const threadId of [...state.checking]) {
				try {
					const report = await runOnlineChecks(rootStore.restApiContext, projectId, agentId, [
						threadId,
					]);
					const saved = report.sessions[0]?.savedResult;
					if (saved) state.results = { ...state.results, [threadId]: saved };
				} catch (error) {
					state.error = message(error);
				} finally {
					state.checking = state.checking.filter((id) => id !== threadId);
				}
			}
			await loadResults(projectId, agentId);
		} catch (error) {
			state.error = message(error);
			state.checking = [];
		}
	}

	/** Turns monitoring on, then checks the existing sessions as a preview. */
	async function approve(projectId: string, agentId: string) {
		const state = stateOf(agentId);
		if (!state.rubric) return;
		state.error = '';
		try {
			state.rubric = await approveOnlineRubric(
				rootStore.restApiContext,
				projectId,
				agentId,
				state.rubric,
			);
		} catch (error) {
			state.error = message(error);
			return;
		}
		void checkUnchecked(projectId, agentId);
	}

	return {
		byAgent,
		setupRequestedFor,
		stateOf,
		isMonitoring,
		setRubric,
		load,
		generate,
		approve,
		checkUnchecked,
	};
});
