import type {
	AiActivityItem,
	AiActivityRenderItem,
	AiActivityToolGroupItem,
	AiActivityToolItem,
} from './types';

/**
 * Puts adjacent tool calls into one group. By default a single call stays a row;
 * `minGroupSize: 1` groups it too.
 */
export function groupActivityItems<TTool>(
	items: Array<AiActivityItem<TTool>>,
	{ minGroupSize = 2 }: { minGroupSize?: number } = {},
): Array<AiActivityRenderItem<TTool>> {
	const result: Array<AiActivityRenderItem<TTool>> = [];
	let run: Array<AiActivityToolItem<TTool>> = [];

	function flush() {
		if (run.length >= minGroupSize) {
			result.push({ kind: 'tools', id: `tools-${run[0].id}`, items: run });
		} else {
			result.push(...run);
		}
		run = [];
	}

	for (const item of items) {
		if (item.kind === 'tool') {
			run.push(item);
			continue;
		}
		flush();
		result.push(item);
	}
	flush();

	return result;
}

/** A group shimmers while one of its calls runs. A waiting call does not count. */
export function isToolGroupLoading<TTool>(group: AiActivityToolGroupItem<TTool>): boolean {
	return group.items.some((item) => item.loading === true && item.waiting !== true);
}

/** True when the body of a tool call has something to show. */
export function hasToolBody<TTool>(item: AiActivityToolItem<TTool>): boolean {
	return (
		Boolean(item.details) ||
		item.input !== undefined ||
		item.output !== undefined ||
		item.outputView !== undefined ||
		(item.children?.length ?? 0) > 0
	);
}
