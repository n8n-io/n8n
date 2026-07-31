import { DELEGATE_SUB_AGENT_CHILD_SUSPEND_PAYLOAD_KEY } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';

/** Remove server-owned continuation metadata before a suspension payload reaches a client. */
export function toClientSuspendPayload(payload: unknown): unknown {
	if (!isRecord(payload) || !('delegateCheckpoint' in payload)) return payload;
	if (DELEGATE_SUB_AGENT_CHILD_SUSPEND_PAYLOAD_KEY in payload) {
		return payload[DELEGATE_SUB_AGENT_CHILD_SUSPEND_PAYLOAD_KEY];
	}

	const clientPayload = { ...payload };
	delete clientPayload.delegateCheckpoint;
	return clientPayload;
}
