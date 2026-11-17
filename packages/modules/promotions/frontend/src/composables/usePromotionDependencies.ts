import type { PromotionDependencyReport, PromotionDirection } from '@n8n/api-types';
import { computed, ref, watch, type Ref } from 'vue';

import {
	dependencyIssueCount,
	gapGroupOf,
	noConfirmations,
	pendingConfirmations,
	scopeDependencyReport,
	toConfirmationPayload,
	type ApplyConfirmations,
} from '../promotionDependencies';
import type { ResourceKey, SelectionGraph } from '../promotionPreview.selection';

/** Why the dependencies stop the operation. The first reason that applies is shown. */
export type DependencyStop =
	| 'hardBlocks'
	| 'strictGaps'
	| 'unknownGaps'
	| 'grants'
	| 'deletionCallers'
	| 'credentialHomes';

/**
 * The dependency report of the preview page for the current selection, and the confirmations
 * that the user gave for it. Everything is empty when the server sends no report.
 */
export function usePromotionDependencies({
	source,
	operationReport,
	graph,
	included,
	direction,
}: {
	/** The report of the preview. It covers every change that the preview lists. */
	source: Ref<PromotionDependencyReport | null>;
	/**
	 * The last report that the server computed for a selection: the dry run of the current
	 * selection, an operation that stopped, or the page that handed its selection over. It wins
	 * over the preview.
	 */
	operationReport: Ref<PromotionDependencyReport | null>;
	graph: Ref<SelectionGraph | null>;
	/** Everything that the operation writes: the selection, what comes with it, and the included items. */
	included: Ref<ReadonlySet<ResourceKey>>;
	direction: Ref<PromotionDirection>;
}) {
	const confirmations = ref<ApplyConfirmations>(noConfirmations());

	// A new preview source starts without confirmations. A refresh of the same page keeps them.
	watch(
		() => graph.value === null,
		(isEmpty) => {
			if (isEmpty) confirmations.value = noConfirmations();
		},
	);

	const report = computed((): PromotionDependencyReport | null => {
		// The filter is the instant view while the report of a new selection is on its way: a gap
		// leaves when the user includes its target or clears its consumer.
		const base = operationReport.value ?? source.value;
		if (!base || !graph.value) return null;
		return scopeDependencyReport(base, {
			selected: included.value,
			listed: new Set(graph.value.resources.keys()),
		});
	});

	const gapCount = computed(() => report.value?.gaps.length ?? 0);
	const issueCount = computed(() => (report.value ? dependencyIssueCount(report.value) : 0));
	const pending = computed(() =>
		report.value && direction.value === 'apply'
			? pendingConfirmations(report.value, confirmations.value)
			: [],
	);
	const stop = computed((): DependencyStop | undefined => {
		if (!report.value) return undefined;
		if (report.value.hardBlocks.length > 0) return 'hardBlocks';
		if (gapCount.value > 0 && !report.value.allowIncomplete) return 'strictGaps';
		// A gap of a group that this client does not know cannot be confirmed here.
		if (report.value.gaps.some((gap) => gapGroupOf(gap) === 'unknown')) return 'unknownGaps';
		return pending.value[0];
	});
	/**
	 * True when the operation continues with gaps after the user confirms them. Another
	 * confirmation of the report can still be pending.
	 */
	const needsGapConfirmation = computed(
		() =>
			gapCount.value > 0 &&
			stop.value !== 'hardBlocks' &&
			stop.value !== 'strictGaps' &&
			stop.value !== 'unknownGaps',
	);
	const payload = computed(() =>
		toConfirmationPayload(report.value, confirmations.value, direction.value),
	);

	function setGrant(id: string, accepted: boolean) {
		const grantIds = new Set(confirmations.value.grantIds);
		if (accepted) grantIds.add(id);
		else grantIds.delete(id);
		confirmations.value = { ...confirmations.value, grantIds };
	}

	function setDeletionCallers(accepted: boolean) {
		confirmations.value = { ...confirmations.value, deletionCallers: accepted };
	}

	function setCredentialHome(credentialId: string, projectId: string) {
		confirmations.value = {
			...confirmations.value,
			credentialHomes: { ...confirmations.value.credentialHomes, [credentialId]: projectId },
		};
	}

	return {
		report,
		confirmations,
		gapCount,
		issueCount,
		stop,
		needsGapConfirmation,
		payload,
		setGrant,
		setDeletionCallers,
		setCredentialHome,
	};
}
