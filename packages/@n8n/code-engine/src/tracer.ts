import type {
	CallableMetadata,
	ClassMetadata,
	ExecutionTrace,
	TraceNode,
	TraceEdge,
} from './types';

export interface TraceCallbacks {
	onNodeEnter?: (nodeId: string, meta: CallableMetadata, args: unknown[]) => void;
	onNodeExit?: (
		nodeId: string,
		meta: CallableMetadata,
		output: unknown,
		durationMs: number,
		error?: string,
	) => void;
}

interface TracedResult<T> {
	proxy: T;
	getTrace: () => ExecutionTrace;
}

export function createTracedInstance<T extends object>(
	instance: T,
	metadata: ClassMetadata,
	callbacks?: TraceCallbacks,
): TracedResult<T> {
	const callableKeys = new Set(metadata.callables.map((c) => c.propertyKey));
	const callableMap = new Map(metadata.callables.map((c) => [c.propertyKey, c]));

	const traceNodes: TraceNode[] = [];
	const traceEdges: TraceEdge[] = [];
	// Tracks the synchronous call chain. Entries are popped immediately when an
	// async callable returns a promise, so that concurrent async calls correctly
	// attribute their parent to the caller rather than a sibling.
	const activeNodes: string[] = [];
	let pendingAsync = 0;
	let traceStartedAt = 0;
	let traceCompletedAt = 0;
	let traceError: string | undefined;

	const checkComplete = () => {
		if (activeNodes.length === 0 && pendingAsync === 0) {
			traceCompletedAt = Date.now();
		}
	};

	const proxy = new Proxy(instance, {
		get(target, prop, receiver) {
			const value: unknown = Reflect.get(target, prop, receiver);
			if (typeof prop !== 'string' || typeof value !== 'function') return value;
			// Bind all methods to the proxy so this.xxx() calls go through the proxy
			const fn = value as (...args: unknown[]) => unknown;
			if (!callableKeys.has(prop)) return fn.bind(receiver);

			return (...args: unknown[]) => {
				const callableMeta = callableMap.get(prop)!;
				const nodeId = prop;

				if (traceStartedAt === 0) {
					traceStartedAt = Date.now();
				}

				// Record edge from parent (top of active stack) to this node.
				// Captured at call-time so concurrent async callables get the
				// correct parent.
				if (activeNodes.length > 0) {
					traceEdges.push({
						from: activeNodes[activeNodes.length - 1],
						to: nodeId,
					});
				}

				const traceNode: TraceNode = {
					id: nodeId,
					label: callableMeta.description,
					type: 'callable',
					input: [...args],
					output: undefined,
					startedAt: Date.now(),
					completedAt: 0,
				};

				activeNodes.push(nodeId);

				const start = Date.now();
				callbacks?.onNodeEnter?.(nodeId, callableMeta, args);

				const recordSuccess = (result: unknown) => {
					traceNode.output = result;
					traceNode.completedAt = Date.now();
					traceNodes.push(traceNode);
					callbacks?.onNodeExit?.(nodeId, callableMeta, result, Date.now() - start);
				};

				const recordError = (err: unknown) => {
					const message = err instanceof Error ? err.message : String(err);
					traceNode.error = message;
					traceNode.completedAt = Date.now();
					traceNodes.push(traceNode);
					traceError = message;
					callbacks?.onNodeExit?.(nodeId, callableMeta, undefined, Date.now() - start, message);
				};

				try {
					const result: unknown = fn.apply(proxy, args);

					if (
						result !== null &&
						result !== undefined &&
						typeof (result as { then?: unknown }).then === 'function'
					) {
						// Pop immediately — the synchronous portion of this
						// callable is done. Waiting for the promise to resolve
						// before popping would cause sibling async calls to see
						// this node as their parent instead of the true caller.
						activeNodes.pop();
						pendingAsync++;
						return (result as Promise<unknown>).then(
							(resolved) => {
								recordSuccess(resolved);
								pendingAsync--;
								checkComplete();
								return resolved;
							},
							(err) => {
								recordError(err);
								pendingAsync--;
								checkComplete();
								throw err;
							},
						);
					}

					recordSuccess(result);
					activeNodes.pop();
					checkComplete();
					return result;
				} catch (err) {
					recordError(err);
					activeNodes.pop();
					checkComplete();
					throw err;
				}
			};
		},
	});

	function getTrace(): ExecutionTrace {
		return {
			nodes: traceNodes,
			edges: traceEdges,
			startedAt: traceStartedAt,
			completedAt: traceCompletedAt || Date.now(),
			status: traceError ? 'error' : 'success',
			error: traceError,
		};
	}

	return { proxy, getTrace };
}
