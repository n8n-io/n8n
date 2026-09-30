<script setup lang="ts">
/**
 * SCRATCH / LOCAL-ONLY. Not part of any feature — a throwaway harness for
 * iterating on InstanceAiTestAgentPreviewPanel's UI without a real agent
 * builder run. Stubs agentEvalsStore's actions with instant, editable canned
 * data. Only reachable via /dev/test-agent-preview, and only in dev mode
 * (see the route guard in router.ts). Delete freely.
 */
import { ref } from 'vue';
import { useAgentEvalsStore } from '@/features/agents/agentEvals.store';
import AgentAvatar, {
	type AgentAvatarKind,
	type AgentAvatarSize,
} from '@/features/agents/components/AgentAvatar.vue';
import InstanceAiTestAgentPreviewPanel from '@/features/ai/instanceAi/components/InstanceAiTestAgentPreviewPanel.vue';

const avatarKinds: AgentAvatarKind[] = ['pass', 'work', 'fail', 'idle', 'strong', 'waiting'];
const avatarSizes: AgentAvatarSize[] = ['xs', 'row', 'sm', 'md'];

const store = useAgentEvalsStore();

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

function stubStore() {
	rowCounter = 0;

	store.generateDraftCases = async (_projectId, _agentId, options) => {
		await wait(delayMs.value);
		const count = options?.count ?? 1;
		const cases = Array.from({ length: count }, (_, i) => ({
			input: count === 1 ? sampleInput.value : `Sample question ${i + 1} about something else`,
			whatToCheck: 'mentions the key detail',
		}));
		logLine(`generateDraftCases(count=${count}) → ${cases.length} case(s)`);
		return { datasetId: 'dev-dataset', dataTableId: 'dev-table', cases };
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
			results: [
				{
					status: 'success',
					input: { input: sampleInput.value },
					output: { finalText: sampleOutput.value },
				},
			],
			resultsCount: 1,
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
		[
			{ rowId: ++rowCounter, input: sampleInput.value, whatToCheck: 'mentions the key detail' },
		] as never;

	store.updateCase = async (_projectId, _source, rowId, value) => {
		logLine(`updateCase(rowId=${rowId}, input=${JSON.stringify(value.input)})`);
		return true;
	};

	store.createCase = async (_projectId, _source, value) => {
		await wait(delayMs.value);
		const rowId = ++rowCounter;
		logLine(`createCase(rowId=${rowId}, input=${JSON.stringify(value.input)})`);
		return { rowId, input: value.input, whatToCheck: value.whatToCheck } as never;
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
