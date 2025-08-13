import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { VIEWS } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { NinjaKeysCommand } from './useCommandBar';
import debounce from 'lodash/debounce';

export function useRootCommandBar(): {
	hotkeys: NinjaKeysCommand[] | ReturnType<typeof computed<NinjaKeysCommand[]>>;
	onCommandBarChange: (event: CustomEvent) => void;
} {
	const router = useRouter();
	const route = useRoute();
	const workflowsStore = useWorkflowsStore();

	const searchResults = ref<{ id: string; name: string }[]>([]);

	const workflowItemCommands = computed<NinjaKeysCommand[]>(() => {
		return (searchResults.value || []).map((w) => ({
			id: w.id,
			title: w.name || '(unnamed workflow)',
			parent: 'Workflows',
			section: 'Workflows',
			handler: () => {
				void router.push({ name: VIEWS.WORKFLOW, params: { name: w.id } });
			},
		}));
	});

	const hotkeys = computed<NinjaKeysCommand[]>({
		get() {
			const items = workflowItemCommands.value;
			return [
				{
					id: 'Workflows',
					title: 'Search workflows',
					section: 'Workflows',
					children: items.map((i) => i.id),
				},
				...items,
			];
		},
		set(_value: NinjaKeysCommand[]) {
			// no-op setter to satisfy WritableComputedRef typing where used
		},
	});

	const fetchResults = debounce(async (query: string) => {
		try {
			const trimmed = (query || '').trim();
			if (trimmed.length < 2) {
				searchResults.value = [];
				return;
			}
			const results = await workflowsStore.searchWorkflows({
				projectId: route.params.projectId as string | undefined,
				name: trimmed,
			});
			searchResults.value = results.map((w) => ({ id: w.id, name: w.name }));
		} catch {
			searchResults.value = [];
		}
	}, 300);

	function onCommandBarChange(event: CustomEvent) {
		const query = (event as unknown as { detail?: { search?: string } }).detail?.search ?? '';
		fetchResults(query);
	}

	return {
		hotkeys,
		onCommandBarChange,
	};
}
