<template>
	<div class="flex-1 flex flex-col min-h-0">
		<!-- Eval list header -->
		<div class="px-4 py-3 border-b border-gray-800">
			<div class="flex items-center justify-between mb-2">
				<span class="text-sm font-medium text-gray-300">Attached Evals</span>
				<span v-if="evalNames.length" class="text-xs text-gray-500"
					>{{ evalNames.length }} eval{{ evalNames.length !== 1 ? 's' : '' }}</span
				>
			</div>
			<div v-if="!evalNames.length" class="text-sm text-gray-600">
				No evals attached. Add <code class="text-gray-400">.eval()</code> to your agent.
			</div>
			<div v-else class="flex flex-wrap gap-1">
				<span
					v-for="name in evalNames"
					:key="name"
					class="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-400"
				>
					{{ name }}
				</span>
			</div>
		</div>

		<!-- Dataset input -->
		<div class="px-4 py-3 border-b border-gray-800">
			<label class="block text-sm text-gray-400 mb-1">Dataset (JSON array)</label>
			<textarea
				v-model="datasetText"
				class="w-full h-32 px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-gray-100 text-sm font-mono focus:outline-none focus:border-blue-500 resize-none"
				placeholder='[{ "input": "What is 2+2?", "expected": "4" }]'
			/>
			<div v-if="parseError" class="mt-1 text-xs text-red-400">{{ parseError }}</div>
			<button
				class="mt-2 w-full px-3 py-2 text-sm rounded-md font-medium transition-colors"
				:class="
					canRun
						? 'bg-emerald-600 hover:bg-emerald-700 text-white'
						: 'bg-gray-800 text-gray-600 cursor-not-allowed'
				"
				:disabled="!canRun || running"
				@click="runEvals"
			>
				{{ running ? 'Running...' : 'Run Evaluations' }}
			</button>
		</div>

		<!-- Results -->
		<div class="flex-1 overflow-auto px-4 py-3">
			<div v-if="!results && !running" class="text-sm text-gray-600">
				Enter a dataset and click Run to see results.
			</div>

			<!-- Summary -->
			<div v-if="results" class="mb-4">
				<h3 class="text-sm font-medium text-gray-300 mb-2">Summary</h3>
				<div class="space-y-1">
					<div
						v-for="(stats, evalName) in results.summary"
						:key="evalName"
						class="flex items-center gap-2 text-sm"
					>
						<span class="text-gray-400 min-w-[120px] truncate">{{ evalName }}</span>
						<span
							class="font-mono text-xs px-2 py-0.5 rounded"
							:class="
								stats.failed === 0
									? 'bg-emerald-900/50 text-emerald-400'
									: 'bg-red-900/50 text-red-400'
							"
						>
							{{ stats.passed }}/{{ stats.total }} passed
						</span>
					</div>
				</div>
			</div>

			<!-- Per-row results -->
			<div v-if="results" class="space-y-2">
				<h3 class="text-sm font-medium text-gray-300">Details</h3>
				<div
					v-for="(run, idx) in results.runs"
					:key="idx"
					class="p-3 rounded-md bg-gray-900 border border-gray-800 text-sm"
				>
					<div class="text-gray-400 text-xs mb-1">Row {{ idx + 1 }}</div>
					<div class="text-gray-300 mb-1 truncate">
						<span class="text-gray-500">Input:</span> {{ run.input }}
					</div>
					<div v-if="run.expected" class="text-gray-300 mb-1 truncate">
						<span class="text-gray-500">Expected:</span> {{ run.expected }}
					</div>
					<div class="text-gray-300 mb-2 truncate">
						<span class="text-gray-500">Output:</span> {{ run.output }}
					</div>
					<div class="space-y-1">
						<div
							v-for="(score, scoreName) in run.scores"
							:key="scoreName"
							class="flex items-center gap-2 text-xs"
						>
							<span class="text-gray-500 min-w-[100px]">{{ scoreName }}</span>
							<span
								class="font-mono px-1.5 py-0.5 rounded font-medium"
								:class="
									score.pass ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
								"
							>
								{{ score.pass ? 'PASS' : 'FAIL' }}
							</span>
							<span class="text-gray-600 truncate">{{ score.reasoning }}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
interface EvalScore {
	pass: boolean;
	reasoning: string;
}

interface EvalRunResult {
	input: string;
	output: string;
	expected?: string;
	scores: Record<string, EvalScore>;
}

interface EvalResults {
	runs: EvalRunResult[];
	summary: Record<string, { passed: number; failed: number; total: number }>;
}

const props = defineProps<{
	evalNames: string[];
}>();

const DATASET_STORAGE_KEY = 'n8n-agents-eval-dataset';
const defaultDataset = '[\n  { "input": "What is 2+2?", "expected": "4" }\n]';
const datasetText = ref(localStorage.getItem(DATASET_STORAGE_KEY) ?? defaultDataset);
const parseError = ref('');
const running = ref(false);
const results = ref<EvalResults | undefined>();

watch(datasetText, (val) => localStorage.setItem(DATASET_STORAGE_KEY, val));

const parsedDataset = computed(() => {
	try {
		const parsed = JSON.parse(datasetText.value);
		if (!Array.isArray(parsed)) throw new Error('Must be an array');
		if (!parsed.every((r: Record<string, unknown>) => typeof r.input === 'string')) {
			throw new Error('Each row must have an "input" string');
		}
		parseError.value = '';
		return parsed as Array<{ input: string; expected?: string }>;
	} catch (e) {
		parseError.value = e instanceof Error ? e.message : 'Invalid JSON';
		return undefined;
	}
});

const canRun = computed(() => props.evalNames.length > 0 && parsedDataset.value !== undefined);

async function runEvals() {
	if (!parsedDataset.value) return;

	running.value = true;
	results.value = undefined;
	parseError.value = '';

	try {
		const response = await $fetch<{ results: EvalResults }>('/api/eval/run', {
			method: 'POST',
			body: { dataset: parsedDataset.value },
		});

		results.value = response.results;
	} catch (e: unknown) {
		const fetchErr = e as { data?: { message?: string }; statusMessage?: string };
		parseError.value = fetchErr.data?.message ?? fetchErr.statusMessage ?? 'Eval run failed';
	} finally {
		running.value = false;
	}
}
</script>
