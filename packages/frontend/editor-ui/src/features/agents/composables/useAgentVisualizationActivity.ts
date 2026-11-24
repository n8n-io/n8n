import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';
import type { AgentSseEvent } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { TIME } from '@/app/constants/durations';
import type { AgentVisualizationNode } from '../components/AgentVisualization.types';

/** Match observable runtime calls to configured items and their parent sections. */
export function findVisualizationActivity(
	root: AgentVisualizationNode | null,
	toolName: string,
	input: unknown,
): string[] {
	const candidates: Array<{ node: AgentVisualizationNode; ancestors: string[] }> = [];
	function visit(node: AgentVisualizationNode, ancestors: string[]) {
		candidates.push({ node, ancestors });
		for (const child of node.children ?? []) visit(child, [...ancestors, node.id]);
	}
	if (!root) return [];
	visit(root, []);
	const exact = candidates.filter(({ node }) => node.activity?.toolNames?.includes(toolName));
	const prefixes = candidates
		.filter(
			({ node }) => node.activity?.toolPrefix && toolName.startsWith(node.activity.toolPrefix),
		)
		.sort(
			(a, b) =>
				(b.node.activity?.toolPrefix?.length ?? 0) - (a.node.activity?.toolPrefix?.length ?? 0),
		);
	const matches = exact.length ? exact : prefixes.slice(0, 1);
	const ids = new Set(matches.flatMap(({ node, ancestors }) => [...ancestors, node.id]));
	if (matches.length) return [...ids];

	const args = isRecord(input) ? input : {};
	if (toolName === 'load_skill') {
		ids.add('knowledge');
		ids.add('skills');
		const skill = args.skillId ?? args.name;
		for (const { node, ancestors } of candidates) {
			if (
				typeof skill === 'string' &&
				(node.activity?.skillId === skill || (ancestors.includes('skills') && node.label === skill))
			) {
				ids.add(node.id);
			}
		}
	} else if (['find_file', 'search_text', 'read_file'].includes(toolName)) {
		ids.add('knowledge');
		const paths = Array.isArray(args.path) ? args.path : [args.path, args.file];
		for (const { node } of candidates) {
			if (!node.activity?.fileId) continue;
			if (
				args.fileId === node.activity.fileId ||
				paths.some(
					(path) =>
						typeof path === 'string' && (path === node.label || path.endsWith(`/${node.label}`)),
				)
			)
				ids.add(node.id);
		}
	} else if (['recall_memory', 'flag_memory'].includes(toolName)) {
		ids.add('memory');
	} else if (toolName === 'delegate_subagent') {
		ids.add('sub-agents');
	}
	return [...ids];
}

export function useAgentVisualizationActivity(
	root: Ref<AgentVisualizationNode | null>,
	sessionId: Ref<string | undefined>,
) {
	const running = ref(false);
	const calls = ref<Record<string, { toolName: string; input: unknown; active: boolean }>>({});
	const failures = ref<Record<string, { toolName: string; input: unknown }>>({});
	const failedNodeIds = computed(() => [
		...new Set(
			Object.values(failures.value).flatMap((call) =>
				findVisualizationActivity(root.value, call.toolName, call.input),
			),
		),
	]);
	const recent = ref<Record<string, string[]>>({});
	const timers = new Map<string, ReturnType<typeof setTimeout>>();
	const activeNodeIds = computed(() => [
		...new Set([
			...Object.values(calls.value)
				.filter((call) => call.active)
				.flatMap((call) => findVisualizationActivity(root.value, call.toolName, call.input)),
			...Object.values(recent.value).flat(),
		]),
	]);
	function reset() {
		running.value = false;
		calls.value = {};
		failures.value = {};
		recent.value = {};
		for (const timer of timers.values()) clearTimeout(timer);
		timers.clear();
	}
	function setStreaming(streaming: boolean) {
		running.value = streaming;
		if (!streaming) calls.value = {};
	}
	function settle(id: string, failed = false, canceled = false) {
		const call = calls.value[id];
		if (!call) return;
		if (failed || canceled) {
			if (failed && !canceled) failures.value[id] = { toolName: call.toolName, input: call.input };
			delete calls.value[id];
			return;
		}
		recent.value[id] = findVisualizationActivity(root.value, call.toolName, call.input);
		delete calls.value[id];
		clearTimeout(timers.get(id));
		// Keep short calls visible after the handler finishes.
		timers.set(
			id,
			setTimeout(() => {
				delete recent.value[id];
				timers.delete(id);
			}, TIME.SECOND),
		);
	}
	function onEvent(event: AgentSseEvent) {
		switch (event.type) {
			case 'execution-started':
				failures.value = {};
				running.value = true;
				calls.value = {};
				break;
			case 'tool-call':
				calls.value[event.toolCallId] = {
					toolName: event.toolName,
					input: event.input,
					active: calls.value[event.toolCallId]?.active ?? false,
				};
				break;
			case 'tool-execution-start':
				for (const [id, failure] of Object.entries(failures.value)) {
					if (failure.toolName === event.toolName) delete failures.value[id];
				}
				calls.value[event.toolCallId] = {
					toolName: event.toolName,
					input: calls.value[event.toolCallId]?.input,
					active: true,
				};
				break;
			case 'tool-execution-end':
				settle(event.toolCallId, event.isError);
				break;
			case 'tool-result':
				settle(event.toolCallId, event.isError, event.canceled);
				break;
			case 'tool-call-suspended':
				delete calls.value[event.payload.toolCallId];
				break;
			case 'finish':
			case 'done':
			case 'error':
				setStreaming(false);
				break;
		}
	}
	watch(sessionId, reset);
	onScopeDispose(reset);
	return { running, activeNodeIds, failedNodeIds, onEvent, setStreaming, reset };
}
