import { useI18n } from '@n8n/i18n';

import type { WorkflowBuildStep } from '../instanceAi.workflowStaging';
import { humanizeFileLabel } from '../toolLabels';

const LIST_LIMIT = 3;

/** The status line text of the draft canvas for a step of the agent. */
export function useWorkflowBuildStepLabel() {
	const i18n = useI18n();

	function formatList(items: string[]): string {
		const unique = [...new Set(items)];
		const shown = unique.slice(0, LIST_LIMIT).join(', ');
		if (unique.length <= LIST_LIMIT) return shown;
		return i18n.baseText('instanceAi.workflowDraft.list.more', {
			interpolate: { items: shown, count: String(unique.length - LIST_LIMIT) },
		});
	}

	function fixingLabel(issueCount: number): string {
		if (issueCount === 0) return i18n.baseText('instanceAi.workflowDraft.step.fixing');
		return i18n.baseText('instanceAi.workflowDraft.step.fixingCount', {
			adjustToNumber: issueCount,
			interpolate: { count: String(issueCount) },
		});
	}

	return (
		step: WorkflowBuildStep,
		context: { nodeTypeName: (nodeType: string) => string | undefined; issueCount: number },
	): string => {
		switch (step.kind) {
			case 'searching':
				if (step.queries.length === 0) break;
				return i18n.baseText('instanceAi.workflowDraft.step.searching', {
					interpolate: { list: formatList(step.queries) },
				});
			case 'referencing':
				return i18n.baseText('instanceAi.workflowDraft.step.referencing', {
					interpolate: { name: humanizeFileLabel(step.filePath ?? step.skill) },
				});
			case 'reading':
				if (step.nodeTypes.length === 0) break;
				return i18n.baseText('instanceAi.workflowDraft.step.reading', {
					interpolate: {
						list: formatList(step.nodeTypes.map((type) => context.nodeTypeName(type) ?? type)),
					},
				});
			case 'writing':
				return i18n.baseText('instanceAi.workflowDraft.step.writing');
			case 'building':
				return i18n.baseText('instanceAi.workflowDraft.step.building');
			case 'fixing':
				return fixingLabel(context.issueCount);
			case 'preparing':
				break;
		}
		return i18n.baseText('instanceAi.workflowDraft.step.preparing');
	};
}
