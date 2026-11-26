import type {
	AiActivityItem,
	AiActivityRenderItem,
	AiActivityToolGroupItem,
	AiActivityToolItem,
} from './types';

/** Puts two or more adjacent tool calls into one group. A single call stays a row. */
export function groupActivityItems<TTool>(
	items: Array<AiActivityItem<TTool>>,
): Array<AiActivityRenderItem<TTool>> {
	const result: Array<AiActivityRenderItem<TTool>> = [];
	let run: Array<AiActivityToolItem<TTool>> = [];

	function flush() {
		if (run.length > 1) {
			result.push({ kind: 'tools', id: `tools-${run[0].id}`, items: run });
		} else if (run.length === 1) {
			result.push(run[0]);
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
