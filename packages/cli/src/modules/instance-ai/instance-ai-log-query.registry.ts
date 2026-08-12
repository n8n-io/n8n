import type { InstanceAiLogQueryPort } from '@n8n/instance-ai';

/**
 * A slot the Instance AI adapter offers and the operator-console module fills.
 *
 * The two are independent opt-in modules, so neither may import the other's
 * services directly. Instance AI declares the seam; operator-console registers
 * into it at init if it is enabled.
 *
 * **Presence is the gate** — when the slot is empty (module disabled, or
 * `N8N_OPERATOR_CONSOLE_AI_TOOL=false`) the context field stays `undefined` and
 * the `logs` tool is never registered with the agent.
 *
 * Deliberately a module-scoped holder rather than a DI service: this is
 * process-local wiring set once at startup, and reading it through
 * `Container.get` inside `createContext` would break on the adapter tests that
 * stub the container wholesale. Nothing per-user or per-thread belongs here.
 */
let port: InstanceAiLogQueryPort | undefined;

export function setInstanceAiLogQueryPort(logQueryPort: InstanceAiLogQueryPort) {
	port = logQueryPort;
}

export function getInstanceAiLogQueryPort(): InstanceAiLogQueryPort | undefined {
	return port;
}

/** Test seam. */
export function clearInstanceAiLogQueryPort() {
	port = undefined;
}
