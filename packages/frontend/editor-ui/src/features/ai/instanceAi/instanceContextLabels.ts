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

/** Name each surface so readers do not need the depth scale. */
function reachSummary(i18n: I18n, entry: InstanceContextEntry): string {
	return (entry.reach?.surfaces ?? [])
		.map((surface) => i18n.baseText(`aiAssistant.instanceContext.trace.surface.${surface}`))
		.join(', ');
}

/** Share the label with the collapsed trace. */
export function useInstanceContextLabel() {
	const i18n = useI18n();

	function getInstanceContextLabel(entry: InstanceContextEntry): string {
		// A turn can read activity even when its opening block is empty.
		if (entry.injection.state === 'absent') {
			// Keep failed reads distinct from empty results.
			const head =
				entry.injection.reason === 'failed'
					? i18n.baseText('aiAssistant.instanceContext.trace.failed')
					: i18n.baseText('aiAssistant.instanceContext.trace.none');

			return [head, reachSummary(i18n, entry)].filter(Boolean).join(' — ');
		}

		const head = entry.injection.isUpdate
			? i18n.baseText('aiAssistant.instanceContext.trace.readUpdate')
			: i18n.baseText('aiAssistant.instanceContext.trace.read');

		return [head, legSummary(i18n, entry), reachSummary(i18n, entry)].filter(Boolean).join(' — ');
	}

	return { getInstanceContextLabel };
}
