import type {
	PromotionDependencyReport,
	PromotionDirection,
	PromotionEnvironmentSelectionProject,
} from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useRootStore } from '@n8n/stores/useRootStore';
import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

import { getPromotionDependencyReport } from '../promotions.api';

/** The selection changes with each click, so the request waits for a short pause. */
const DEBOUNCE_MS = 300;

export type ReportSelection = {
	environmentId: string;
	projects: PromotionEnvironmentSelectionProject[];
	/** Apply only: the home of each credential without an owner. It changes the report. */
	credentialHomes?: Record<string, string>;
	/** The revision of the preview. A new preview needs a new report. */
	revision?: string;
};

/**
 * Asks the server for the dependency report of the current selection, from the same check as
 * the operation. Nothing is written. Each answer goes to `report`. While a request is on its
 * way, `checking` is true and the page shows its own filtered view of the last report.
 *
 * `selection` is `null` when the page has nothing to ask, such as an empty selection.
 */
export function usePromotionSelectionReport({
	selection,
	direction,
	report,
}: {
	selection: Ref<ReportSelection | null>;
	direction: Ref<PromotionDirection>;
	/** The slot of the last server report for a selection. */
	report: Ref<PromotionDependencyReport | null>;
}) {
	const rootStore = useRootStore();
	const { next } = useLatestFetch();
	const checking = ref(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function load(current: ReportSelection, isLatest: () => boolean) {
		try {
			const result = await getPromotionDependencyReport(
				rootStore.publicApiContext,
				current.environmentId,
				direction.value,
				{
					projects: current.projects,
					...(current.credentialHomes && Object.keys(current.credentialHomes).length > 0
						? { credentialHomes: current.credentialHomes }
						: {}),
				},
			);
			if (isLatest()) report.value = result;
		} catch {
			// The page keeps its filtered view. The operation checks again before it writes.
		} finally {
			if (isLatest()) checking.value = false;
		}
	}

	watch(
		() => (selection.value ? JSON.stringify([direction.value, selection.value]) : null),
		(key, previous) => {
			clearTimeout(timer);
			// Also makes a response of an older selection stale.
			const isLatest = next();
			const current = selection.value;
			if (key === null || !current) {
				checking.value = false;
				return;
			}
			checking.value = true;
			// The first report of a page has nothing to wait for.
			timer = setTimeout(
				() => {
					// `load` handles its own failure.
					load(current, isLatest).catch(() => {});
				},
				previous ? DEBOUNCE_MS : 0,
			);
		},
		{ immediate: true },
	);

	onBeforeUnmount(() => clearTimeout(timer));

	return { checking };
}
