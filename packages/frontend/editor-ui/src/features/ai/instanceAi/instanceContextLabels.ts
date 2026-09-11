import type { InstanceAiTimelineEntry } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

type I18n = ReturnType<typeof useI18n>;

export type InstanceContextEntry = Extract<InstanceAiTimelineEntry, { type: 'instance-context' }>;

/** Only the legs that carried something, so an empty leg does not read as a zero result. */
function legSummary(i18n: I18n, entry: InstanceContextEntry): string {
	const { injection } = entry;
	if (injection.state !== 'injected') return '';

	const { legs } = injection;
	const parts: string[] = [];

	if (legs.inventory > 0) {
		parts.push(
			i18n.baseText('aiAssistant.instanceContext.trace.workflows', {
				adjustToNumber: legs.inventory,
			}),
		);
	}
	if (legs.events > 0) {
		parts.push(
			i18n.baseText('aiAssistant.instanceContext.trace.changes', { adjustToNumber: legs.events }),
		);
	}
	if (legs.runs > 0) {
		parts.push(
			i18n.baseText('aiAssistant.instanceContext.trace.runs', { adjustToNumber: legs.runs }),
		);
	}

	return parts.join(', ');
}

/**
 * Named rather than counted. "Went 2 deep" tells a reader nothing without the rung
 * table in front of them, whereas "opened an entry" is the thing that happened.
 */
function reachSummary(i18n: I18n, entry: InstanceContextEntry): string {
	return (entry.reach?.surfaces ?? [])
		.map((surface) => i18n.baseText(`aiAssistant.instanceContext.trace.surface.${surface}`))
		.join(', ');
}

/**
 * The label for the trace row that says what a turn was handed.
 *
 * Shared with the collapsed subline, which shows the tail entry's own label. One
 * derivation, because a second one would let the two disagree about the same turn — and
 * the states here are exactly the ones worth telling apart, so a wording that flattens
 * them in one place defeats the row.
 */
export function useInstanceContextLabel() {
	const i18n = useI18n();

	function getInstanceContextLabel(entry: InstanceContextEntry): string {
		// An empty block does not stop the agent reading further — the `activity` tool is
		// gated by the flag, not by whether a block was built. So a turn told nothing can
		// still have gone looking, and the row has to say so.
		if (entry.injection.state === 'absent') {
			// A broken read is not the same as a quiet instance, and it is the one a reader is
			// most likely hunting for, so it says so rather than blending into the empty case.
			const head =
				entry.injection.reason === 'failed'
					? i18n.baseText('aiAssistant.instanceContext.trace.failed')
					: i18n.baseText('aiAssistant.instanceContext.trace.none');

			return [head, reachSummary(i18n, entry)].filter(Boolean).join(' — ');
		}

		const head = entry.injection.isUpdate
			? i18n.baseText('aiAssistant.instanceContext.trace.readUpdate')
			: i18n.baseText('aiAssistant.instanceContext.trace.read');

		// Em-dash separated so the label reads as one sentence at a glance, which is all it
		// gets before the reader decides whether to expand it.
		return [head, legSummary(i18n, entry), reachSummary(i18n, entry)].filter(Boolean).join(' — ');
	}

	return { getInstanceContextLabel };
}
