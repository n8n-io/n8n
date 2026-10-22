import type { ContextAPI } from '@opentelemetry/api';

function hasActiveContextManager(context: ContextAPI, probeKey: symbol): boolean {
	return context.with(
		context.active().setValue(probeKey, true),
		() => context.active().getValue(probeKey) === true,
	);
}

export async function ensureContextManager(): Promise<void> {
	const { context, createContextKey } = await import('@opentelemetry/api');
	if (hasActiveContextManager(context, createContextKey('n8n.agents.context-probe'))) return;

	const { AsyncLocalStorageContextManager } = await import('@opentelemetry/context-async-hooks');
	const manager = new AsyncLocalStorageContextManager().enable();
	if (!context.setGlobalContextManager(manager)) manager.disable();
}
