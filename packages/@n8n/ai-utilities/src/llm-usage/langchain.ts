// The LangChain part of the library, in its own entry, so that `@n8n/ai-utilities/llm-usage`
// does not load `@langchain/core`. Importing this entry also initializes the LangChain
// AsyncLocalStorage.
import { registerConfigureHook, setContextVariable } from '@langchain/core/context';
import { AsyncLocalStorageProviderSingleton } from '@langchain/core/singletons';

import { LlmUsageCallbackHandler } from './langchain-handler';
import { callContextStorage, getLlmUsageSink } from './state';
import type { LlmCallContext } from './types';

const LANGCHAIN_HANDLER_VARIABLE = 'n8n_llm_usage_handler';

/**
 * Returns a shallow copy of `store` with the same prototype. `run` with the active store opens
 * no new scope, and the helpers below write with `enterWith`, so they would change the
 * caller's store. The prototype keeps a LangSmith run tree intact.
 */
function copyOfStore(store: unknown): object {
	if (typeof store !== 'object' || store === null) return {};
	const copy: object = Object.create(Reflect.getPrototypeOf(store));
	return Object.assign(copy, store);
}

/** Runs `fn` in a scope that also reports the LangChain calls made inside it. */
function runWithLangChainUsage<T>(context: LlmCallContext, fn: () => T): T {
	if (!getLlmUsageSink()) return fn();

	const langChainStorage = AsyncLocalStorageProviderSingleton.getInstance();
	return callContextStorage.run(context, () =>
		// LangChain keeps its hook list inside its own store, so each scope registers it again.
		// The copy keeps LangSmith tracing and other context variables of the caller.
		langChainStorage.run(copyOfStore(langChainStorage.getStore()), () => {
			registerConfigureHook({ contextVar: LANGCHAIN_HANDLER_VARIABLE });
			setContextVariable(LANGCHAIN_HANDLER_VARIABLE, new LlmUsageCallbackHandler(context));
			return fn();
		}),
	);
}

/**
 * Reports the LangChain calls of a lazily consumed async iterable, for callers whose models
 * n8n does not trace, such as the AI Workflow Builder. A generator body runs in the context
 * of the caller of `next()`, so each step runs inside the scope.
 */
export async function* withLangChainUsageIterable<T>(
	context: LlmCallContext,
	iterable: AsyncIterable<T>,
): AsyncGenerator<T, void> {
	const iterator = iterable[Symbol.asyncIterator]();
	let finished = false;
	try {
		while (true) {
			const step = await runWithLangChainUsage(context, async () => await iterator.next());
			if (step.done) {
				finished = true;
				return;
			}
			yield step.value;
		}
	} finally {
		// The consumer stopped early: let the source clean up.
		if (!finished) await iterator.return?.();
	}
}
