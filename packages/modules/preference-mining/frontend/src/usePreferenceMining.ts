import {
	type PreferenceMiningApproach,
	type PreferenceMiningOptions,
	type PreferenceMiningRecall,
	type PreferenceMiningRun,
	type PreferenceMiningRunSummary,
	type StartPreferenceMiningDto,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { request, ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { getNodeTypes } from '@n8n/rest-api-client/api/nodeTypes';

import { getMiningProjects, miningApi } from './preference-mining.api';

export function usePreferenceMining() {
	const i18n = useI18n();
	const rootStore = useRootStore();
	const route = useRoute();
	const router = useRouter();
	const projectId = computed(() =>
		typeof route.params.projectId === 'string' ? route.params.projectId : '',
	);
	const projects = ref<Awaited<ReturnType<typeof getMiningProjects>>>([]);
	const options = ref<PreferenceMiningOptions>({ assistant: { available: false, model: null } });
	const approaches = ref<PreferenceMiningApproach[]>([
		'folder-usage',
		'exploration-tools',
		'exploration',
	]);
	const model = ref<StartPreferenceMiningDto['model']>('assistant');
	const maxOutputTokens = ref(16384);
	const discoveryTask = ref(i18n.baseText('preferenceMining.discoveryTaskDefault'));
	const minimumWorkflows = ref(3);
	const minimumShare = ref(0.7);
	const minimumMargin = ref(0.2);
	const run = ref<PreferenceMiningRun>();
	const history = ref<PreferenceMiningRunSummary[]>([]);
	const historyTotal = ref(0);
	const historyLoading = ref(false);
	const loading = ref(false);
	const starting = ref(false);
	const error = ref('');
	const query = ref('');
	const folderId = ref('');
	const contexts = ref<string[]>([]);
	const preview = ref<PreferenceMiningRecall[]>([]);
	const recalling = ref(false);
	const typeNames = ref<Record<string, string>>({});
	const running = computed(() => run.value?.status === 'running');
	let generation = 0;
	let selection = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const labels = computed<Record<PreferenceMiningApproach, string>>(() => ({
		baseline: i18n.baseText('preferenceMining.approach.baseline'),
		nodes: i18n.baseText('preferenceMining.approach.nodes'),
		credentials: i18n.baseText('preferenceMining.approach.credentials'),
		workflows: i18n.baseText('preferenceMining.approach.workflows'),
		threads: i18n.baseText('preferenceMining.approach.threads'),
		combined: i18n.baseText('preferenceMining.approach.combined'),
		'folder-usage': i18n.baseText('preferenceMining.approach.folderUsage'),
		'exploration-tools': i18n.baseText('preferenceMining.approach.explorationTools'),
		exploration: i18n.baseText('preferenceMining.approach.exploration'),
	}));
	const statuses = computed(() => ({
		running: i18n.baseText('preferenceMining.status.running'),
		complete: i18n.baseText('preferenceMining.status.complete'),
		unavailable: i18n.baseText('preferenceMining.status.unavailable'),
		failed: i18n.baseText('preferenceMining.status.failed'),
		cancelled: i18n.baseText('preferenceMining.status.cancelled'),
	}));
	const api = () => miningApi(rootStore.restApiContext, projectId.value);

	function stopPolling() {
		if (timer) clearTimeout(timer);
		timer = undefined;
	}
	function showError(cause: unknown) {
		error.value =
			cause instanceof ResponseError ? cause.message : i18n.baseText('preferenceMining.error');
	}
	async function changeProject(value: string) {
		await router.push({ name: 'preference-mining', params: { projectId: value } });
	}
	watch(
		projectId,
		async () => {
			const current = ++generation;
			stopPolling();
			run.value = undefined;
			history.value = [];
			historyTotal.value = 0;
			preview.value = [];
			error.value = '';
			options.value = { assistant: { available: false, model: null } };
			contexts.value = [];
			folderId.value = '';
			loading.value = true;
			try {
				const loaded = await api().options();
				if (current !== generation) return;
				options.value = loaded;
				await loadHistory();
				if (current !== generation) return;
				const runId =
					typeof route.query.runId === 'string' ? route.query.runId : history.value[0]?.id;
				if (runId) await openRun(runId);
			} catch (cause) {
				if (current === generation) showError(cause);
			} finally {
				if (current === generation) loading.value = false;
			}
		},
		{ immediate: true },
	);

	async function poll(current: number, selected = selection) {
		if (current !== generation || selected !== selection || !run.value) return;
		try {
			const next = await api().get(run.value.id);
			if (current !== generation || selected !== selection) return;
			run.value = next;
			if (!contexts.value.length && next.sources) contexts.value = [...next.sources.contexts];
			if (next.status === 'running')
				timer = setTimeout(() => {
					void poll(current, selected);
				}, 1500);
			else await loadHistory();
		} catch (cause) {
			if (current === generation) showError(cause);
		}
	}
	async function loadHistory(append = false) {
		const current = generation;
		historyLoading.value = true;
		try {
			const page = await api().list(append ? history.value.length : 0);
			if (current !== generation) return;
			history.value = append ? [...history.value, ...page.items] : page.items;
			historyTotal.value = page.total;
		} catch (cause) {
			if (current === generation) showError(cause);
		} finally {
			if (current === generation) historyLoading.value = false;
		}
	}

	async function openRun(id: string) {
		const current = generation;
		const selected = ++selection;
		stopPolling();
		preview.value = [];
		error.value = '';
		try {
			const saved = await api().get(id);
			if (current !== generation || selected !== selection) return;
			run.value = saved;
			if (saved.settings) {
				approaches.value = [...saved.settings.approaches];
				model.value = saved.settings.model;
				maxOutputTokens.value = saved.settings.maxOutputTokens;
				discoveryTask.value = saved.settings.discoveryTask;
				minimumWorkflows.value = saved.settings.minimumWorkflows;
				minimumShare.value = saved.settings.minimumShare;
				minimumMargin.value = saved.settings.minimumMargin;
			}
			contexts.value = saved.sources?.contexts ?? [];
			folderId.value = '';
			await router.replace({ query: { ...route.query, runId: id } });
			if (saved.status === 'running') await poll(current, selected);
		} catch (cause) {
			if (current === generation && selected === selection) showError(cause);
		}
	}

	watch(
		() => route.query.runId,
		(id) => {
			if (!loading.value && typeof id === 'string' && id !== run.value?.id) void openRun(id);
		},
	);

	async function start() {
		const current = generation;
		const client = api();
		selection++;
		starting.value = true;
		error.value = '';
		preview.value = [];
		run.value = undefined;
		stopPolling();
		try {
			const created = await client.start({
				approaches: approaches.value,
				model: model.value,
				maxOutputTokens: maxOutputTokens.value,
				discoveryTask: discoveryTask.value,
				minimumWorkflows: minimumWorkflows.value,
				minimumShare: minimumShare.value,
				minimumMargin: minimumMargin.value,
			});
			if (current !== generation) {
				return;
			}
			run.value = created;
			await router.replace({ query: { ...route.query, runId: created.id } });
			await loadHistory();
			await poll(current);
		} catch (cause) {
			if (current === generation) showError(cause);
		} finally {
			starting.value = false;
		}
	}
	async function cancel() {
		if (!run.value) return;
		const current = generation;
		try {
			const stopped = await api().cancel(run.value.id);
			if (current === generation) {
				run.value = stopped;
				stopPolling();
				await loadHistory();
			}
		} catch (cause) {
			if (current === generation) showError(cause);
		}
	}
	async function recall() {
		if (!run.value) return;
		const current = generation;
		const runId = run.value.id;
		const input = {
			query: query.value,
			folderId: folderId.value || null,
			contexts: [...contexts.value],
			topK: 5,
		};
		recalling.value = true;
		error.value = '';
		try {
			const result = await api().recall(runId, input);
			if (
				current === generation &&
				run.value?.id === runId &&
				query.value === input.query &&
				(folderId.value || null) === input.folderId &&
				JSON.stringify(contexts.value) === JSON.stringify(input.contexts)
			)
				preview.value = result;
		} catch (cause) {
			if (current === generation) showError(cause);
		} finally {
			recalling.value = false;
		}
	}
	onMounted(async () => {
		void loadTypeNames();
		try {
			projects.value = await getMiningProjects(rootStore.restApiContext);
		} catch (cause) {
			showError(cause);
		}
	});
	onBeforeUnmount(() => {
		generation++;
		stopPolling();
	});

	async function loadTypeNames() {
		const catalogs = await Promise.allSettled([
			getNodeTypes(rootStore.baseUrl),
			request({ method: 'GET', baseURL: rootStore.baseUrl, endpoint: 'types/credentials.json' }),
		]);
		const names: Record<string, string> = {};
		for (const catalog of catalogs) {
			if (catalog.status !== 'fulfilled' || !Array.isArray(catalog.value)) continue;
			const entries: unknown[] = catalog.value;
			for (const entry of entries) {
				if (
					entry &&
					typeof entry === 'object' &&
					'name' in entry &&
					typeof entry.name === 'string' &&
					'displayName' in entry &&
					typeof entry.displayName === 'string'
				)
					names[entry.name] = entry.displayName;
			}
		}
		typeNames.value = names;
	}

	return {
		i18n,
		projectId,
		projects,
		options,
		approaches,
		model,
		maxOutputTokens,
		discoveryTask,
		minimumWorkflows,
		minimumShare,
		minimumMargin,
		run,
		history,
		historyTotal,
		historyLoading,
		loadHistory,
		openRun,
		loading,
		starting,
		error,
		query,
		folderId,
		contexts,
		preview,
		recalling,
		running,
		labels,
		statuses,
		typeNames,
		changeProject,
		start,
		cancel,
		recall,
	};
}
