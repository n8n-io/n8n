import {
	type PreferenceMiningApproach,
	type PreferenceMiningOptions,
	type PreferenceMiningRecall,
	type PreferenceMiningRun,
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
	const approaches = ref<PreferenceMiningApproach[]>(['nodes', 'credentials']);
	const model = ref<StartPreferenceMiningDto['model']>('assistant');
	const maxOutputTokens = ref(16384);
	const minimumWorkflows = ref(3);
	const minimumShare = ref(0.7);
	const minimumMargin = ref(0.2);
	const run = ref<PreferenceMiningRun>();
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
	let timer: ReturnType<typeof setTimeout> | undefined;

	const labels = computed<Record<PreferenceMiningApproach, string>>(() => ({
		baseline: i18n.baseText('preferenceMining.approach.baseline'),
		nodes: i18n.baseText('preferenceMining.approach.nodes'),
		credentials: i18n.baseText('preferenceMining.approach.credentials'),
		workflows: i18n.baseText('preferenceMining.approach.workflows'),
		threads: i18n.baseText('preferenceMining.approach.threads'),
		combined: i18n.baseText('preferenceMining.approach.combined'),
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
			if (run.value?.status === 'running') {
				void miningApi(rootStore.restApiContext, run.value.projectId)
					.cancel(run.value.id)
					.catch(() => {});
			}
			stopPolling();
			run.value = undefined;
			preview.value = [];
			error.value = '';
			options.value = { assistant: { available: false, model: null } };
			contexts.value = [];
			folderId.value = '';
			loading.value = true;
			try {
				const loaded = await api().options();
				if (current === generation) options.value = loaded;
			} catch (cause) {
				if (current === generation) showError(cause);
			} finally {
				if (current === generation) loading.value = false;
			}
		},
		{ immediate: true },
	);

	async function poll(current: number) {
		if (current !== generation || !run.value) return;
		try {
			const next = await api().get(run.value.id);
			if (current !== generation) return;
			run.value = next;
			if (!contexts.value.length && next.sources) contexts.value = [...next.sources.contexts];
			if (next.status === 'running')
				timer = setTimeout(() => {
					void poll(current);
				}, 1500);
		} catch (cause) {
			if (current === generation) showError(cause);
		}
	}
	async function start() {
		const current = generation;
		const client = api();
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
				minimumWorkflows: minimumWorkflows.value,
				minimumShare: minimumShare.value,
				minimumMargin: minimumMargin.value,
			});
			if (current !== generation) {
				await client.cancel(created.id);
				return;
			}
			run.value = created;
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
		if (running.value && run.value)
			void miningApi(rootStore.restApiContext, run.value.projectId)
				.cancel(run.value.id)
				.catch(() => {});
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
		minimumWorkflows,
		minimumShare,
		minimumMargin,
		run,
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
