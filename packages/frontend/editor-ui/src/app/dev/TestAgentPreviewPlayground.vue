<script setup lang="ts">
/**
 * SCRATCH / LOCAL-ONLY. Not part of any feature — a throwaway harness for
 * iterating on InstanceAiTestAgentPreviewPanel's UI without a real agent
 * builder run. Stubs agentEvalsStore's actions with instant, editable canned
 * data. Only reachable via /dev/test-agent-preview, and only in dev mode
 * (see the route guard in router.ts). Delete freely.
 */
import { onBeforeUnmount, ref } from 'vue';
import type { AgentEvalResultStatus } from '@n8n/api-types';
import { useAgentEvalsStore } from '@/features/agents/agentEvals.store';
import AgentAvatar, {
	type AgentAvatarKind,
	type AgentAvatarSize,
} from '@/features/agents/components/AgentAvatar.vue';
import InstanceAiTestAgentPreviewPanel from '@/features/ai/instanceAi/components/InstanceAiTestAgentPreviewPanel.vue';

const avatarKinds: AgentAvatarKind[] = ['pass', 'work', 'fail', 'idle', 'strong', 'waiting'];
const avatarSizes: AgentAvatarSize[] = ['xs', 'row', 'sm', 'md'];

const store = useAgentEvalsStore();

// The store is a singleton shared with the rest of the app — stubbing its
// actions in place would otherwise keep serving this playground's canned
// data to a real agent builder session after navigating away. Captured
// before the first `stubStore()` call, and put back on unmount.
const realActions = {
	generateDraftCases: store.generateDraftCases,
	startRun: store.startRun,
	openRun: store.openRun,
	isRunInFlight: store.isRunInFlight,
	stopPollingRun: store.stopPollingRun,
	startPollingRun: store.startPollingRun,
	hasLostTrackOfRun: store.hasLostTrackOfRun,
	getReview: store.getReview,
	getDatasets: store.getDatasets,
	fetchCases: store.fetchCases,
	updateCase: store.updateCase,
	createCase: store.createCase,
	deleteCase: store.deleteCase,
};
onBeforeUnmount(() => Object.assign(store, realActions));

const sampleInput = ref('Summarize the thread about the Acme SSO outage');
const sampleOutput = ref(
	'Ticket #48219 · Acme Health · P1. SSO failing for 340 users after Acme rotated their Okta certificate; waiting on Acme to re-upload it.',
);
const useInitialCase = ref(true);
const delayMs = ref(300);

const log = ref<string[]>([]);
function logLine(message: string) {
	log.value = [`${new Date().toLocaleTimeString()} — ${message}`, ...log.value].slice(0, 20);
}

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

let rowCounter = 0;

/** One row of the playground's fake dataset: its text plus its last (fake) run result. */
type DevRow = {
	rowId: number;
	input: string;
	whatToCheck: string;
	scenario: string;
	output: string;
	status: AgentEvalResultStatus;
};

// Covers the other two post-run avatar states (the first row always uses the
// live sample question/answer below), so the default "Check your agent" click
// (slider defaults to 2) already lands on a "needs work"/"couldn't finish"
// row without any manual setup — that's the content the "Needs work"
// correction UI (Save check / Actually fine) needs to show.
const EXTRA_ROW_TEMPLATES: Array<Pick<DevRow, 'input' | 'output' | 'scenario' | 'status'>> = [
	{
		input: 'Third time asking. Why is SSO STILL broken?!',
		output:
			'SSO issues are usually caused by a misconfigured identity provider. Check your SAML settings.',
		scenario: 'Upset',
		status: 'error',
	},
	{
		input: 'Can you also cancel my subscription while you are at it?',
		output: 'I was not able to find a way to cancel your subscription from here.',
		scenario: 'Off topic',
		status: 'cancelled',
	},
];

let rows: DevRow[] = [];

function seedRows(count: number) {
	rows = Array.from({ length: count }, (_, i) => {
		if (i === 0) {
			return {
				rowId: ++rowCounter,
				input: sampleInput.value,
				whatToCheck: 'mentions the key detail',
				scenario: 'Happy path',
				output: sampleOutput.value,
				status: 'success' as const,
			};
		}
		const template = EXTRA_ROW_TEMPLATES[(i - 1) % EXTRA_ROW_TEMPLATES.length];
		return { rowId: ++rowCounter, whatToCheck: 'mentions the key detail', ...template };
	});
}

function stubStore() {
	rowCounter = 0;
	rows = [];

	store.generateDraftCases = async (_projectId, _agentId, options) => {
		await wait(delayMs.value);
		const count = options?.count ?? 1;
		// A revision request (suggestion + the case it's replacing) asks for one
		// replacement case — echo the suggestion back so the round-trip is
		// visible without a real model call.
		if (options?.suggestion) {
			logLine(`generateDraftCases(revision) → 1 case`);
			return {
				datasetId: 'dev-dataset',
				dataTableId: 'dev-table',
				cases: [
					{
						input: `${options.previousInput} (revised: ${options.suggestion})`,
						whatToCheck: 'mentions the key detail',
						scenario: 'Revised',
					},
				],
			};
		}
		seedRows(count);
		logLine(`generateDraftCases(count=${count}) → ${rows.length} case(s)`);
		return {
			datasetId: 'dev-dataset',
			dataTableId: 'dev-table',
			cases: rows.map((r) => ({
				input: r.input,
				whatToCheck: r.whatToCheck,
				scenario: r.scenario,
			})),
		};
	};

	store.startRun = async () => {
		await wait(delayMs.value);
		logLine('startRun → dev-run');
		return { id: 'dev-run' } as never;
	};

	store.openRun = async () => {};
	store.isRunInFlight = () => false;
	store.stopPollingRun = () => {};
	store.startPollingRun = () => {};
	store.hasLostTrackOfRun = () => false;

	store.getReview = () =>
		({
			run: { status: 'completed' },
			results: rows.map((r) => ({
				sourceRowId: String(r.rowId),
				status: r.status,
				input: { input: r.input },
				output: { finalText: r.output },
			})),
			resultsCount: rows.length,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		}) as never;

	store.getDatasets = () =>
		[
			{
				id: 'dev-dataset',
				name: 'dev-dataset',
				description: null,
				agentId: 'agent-1',
				columnMapping: { input: 'input', criteria: 'whatToCheck' },
				createdById: null,
				createdAt: '',
				updatedAt: '',
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dev-table' },
			},
		] as never;

	store.fetchCases = async () =>
		rows.map((r) => ({ rowId: r.rowId, input: r.input, whatToCheck: r.whatToCheck })) as never;

	store.updateCase = async (_projectId, _source, rowId, value) => {
		logLine(`updateCase(rowId=${rowId}, input=${JSON.stringify(value.input)})`);
		const row = rows.find((r) => r.rowId === rowId);
		if (row) {
			row.input = value.input;
			row.whatToCheck = value.whatToCheck;
			row.status = 'success';
			row.output = 'Looks better now — thanks for the correction.';
		}
		return true;
	};

	store.createCase = async (_projectId, _source, value) => {
		await wait(delayMs.value);
		const rowId = ++rowCounter;
		rows = [
			...rows,
			{
				rowId,
				input: value.input,
				whatToCheck: value.whatToCheck,
				scenario: '',
				output: '',
				status: 'new',
			},
		];
		logLine(`createCase(rowId=${rowId}, input=${JSON.stringify(value.input)})`);
		return { rowId, input: value.input, whatToCheck: value.whatToCheck } as never;
	};

	store.deleteCase = async (_projectId, _source, rowId) => {
		logLine(`deleteCase(rowId=${rowId})`);
		rows = rows.filter((r) => r.rowId !== rowId);
		return true;
	};
}
stubStore();

const panelKey = ref(0);
function reset() {
	stubStore();
	panelKey.value += 1;
	logLine('— reset —');
}

function onConfirm() {
	logLine('emit: confirm');
}
function onDismiss() {
	logLine('emit: dismiss');
	reset();
}
function onOpenEvals() {
	logLine('emit: open-evals');
	reset();
}
</script>

<template>
	<div
		style="max-width: 640px; margin: 40px auto; display: flex; flex-direction: column; gap: 20px"
	>
		<h2>InstanceAiTestAgentPreviewPanel — playground</h2>

		<div style="border: 1px solid #444; border-radius: 8px; padding: 12px">
			<h3 style="margin-top: 0">AgentAvatar — all variations</h3>
			<table style="border-collapse: collapse">
				<thead>
					<tr>
						<th style="text-align: left; padding: 4px 12px 4px 0">kind \ size</th>
						<th v-for="size in avatarSizes" :key="size" style="text-align: left; padding: 4px 12px">
							{{ size }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="kind in avatarKinds" :key="kind">
						<td style="padding: 4px 12px 4px 0">{{ kind }}</td>
						<td v-for="size in avatarSizes" :key="size" style="padding: 4px 12px">
							<AgentAvatar :kind="kind" :size="size" />
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<label style="display: flex; flex-direction: column; gap: 4px">
			Sample question
			<input v-model="sampleInput" />
		</label>
		<label style="display: flex; flex-direction: column; gap: 4px">
			Sample answer (markdown)
			<textarea v-model="sampleOutput" rows="4" />
		</label>
		<div style="display: flex; gap: 20px; align-items: center">
			<label>
				Simulated delay (ms)
				<input v-model.number="delayMs" type="number" min="0" style="width: 80px" />
			</label>
			<label>
				<input v-model="useInitialCase" type="checkbox" />
				Skip to confirmation instantly (simulate builder's own test)
			</label>
		</div>
		<button type="button" style="align-self: flex-start" @click="reset">Reset / remount</button>

		<div style="border: 1px solid #444; border-radius: 8px; padding: 8px">
			<InstanceAiTestAgentPreviewPanel
				:key="panelKey"
				:target="{ agentId: 'agent-1', projectId: 'project-1' }"
				:initial-case="useInitialCase ? { message: sampleInput, response: sampleOutput } : null"
				@confirm="onConfirm"
				@dismiss="onDismiss"
				@open-evals="onOpenEvals"
			/>
		</div>

		<div>
			<h3>Event log</h3>
			<pre style="font-size: 12px; max-height: 200px; overflow-y: auto">{{ log.join('\n') }}</pre>
		</div>
	</div>
</template>
