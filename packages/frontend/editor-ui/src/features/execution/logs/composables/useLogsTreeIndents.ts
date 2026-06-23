import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { LogTreeEntry } from '@/features/execution/logs/logs.types';

export interface LogTreeIndent {
	straight: boolean;
	curved: boolean;
}

/**
 * Computes the tree-connector indents for a log row by walking the entry's
 * parent back-pointers. Shared by node rows and group rows so both draw the
 * same curved/straight connectors regardless of entry kind.
 */
export function useLogsTreeIndents(entry: MaybeRefOrGetter<LogTreeEntry>) {
	return computed<LogTreeIndent[]>(() => {
		const ret: LogTreeIndent[] = [];
		const self = toValue(entry);
		let data: LogTreeEntry = self;

		while (data.parent !== undefined) {
			const siblings = data.parent.children ?? [];
			const lastSibling = siblings[siblings.length - 1];

			ret.unshift({ straight: lastSibling?.id !== data.id, curved: data === self });
			data = data.parent;
		}

		return ret;
	});
}
