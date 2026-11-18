import { createHmac } from 'node:crypto';

/**
 * Kept as it was when the agents module owned it: the codes in events that
 * were sent before the move must stay comparable with the codes sent after it.
 */
const KNOWLEDGE_TELEMETRY_KEY_LABEL = 'agent-knowledge-telemetry';

/**
 * Make sure a knowledge code cannot be matched to a known file or source name outside this instance.
 * The derived key keeps these codes apart from other uses of the instance secret.
 */
export function createKnowledgeTelemetryHmac(instanceSecret: string) {
	const key = createHmac('sha256', instanceSecret).update(KNOWLEDGE_TELEMETRY_KEY_LABEL).digest();
	return createHmac('sha256', key);
}
