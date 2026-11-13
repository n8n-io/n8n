import type { AssistantRuntime } from '@n8n/telemetry';
import { hasInjectionContext, inject, type InjectionKey } from 'vue';

/** The runtime of the Assistant thread that renders a card. The telemetry reports it. */
export const ASSISTANT_RUNTIME: InjectionKey<AssistantRuntime> = Symbol('assistantRuntime');

/** Cards that both runtimes render read the runtime here. The current runtime provides none. */
export function useAssistantRuntime(): AssistantRuntime {
	return hasInjectionContext() ? inject(ASSISTANT_RUNTIME, 'instance-ai') : 'instance-ai';
}
