import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { Telemetry } from '@/telemetry';

/**
 * Reports how far a WhatsApp setup got on the n8n side. The credential step is
 * reported by the editor, because only it knows when a check was a re-check.
 * Meta's handshake reaches the backend directly, so it is reported here.
 */
@Service()
export class WhatsAppSetupTelemetryService {
	constructor(private readonly telemetry: Telemetry) {}

	/** Never throws: Meta has already received its answer when this runs. */
	webhookVerified(agentId: string, phase: 'setup' | 'connected'): void {
		try {
			this.telemetry.track(TELEMETRY_EVENT.AGENTS.AGENT_WHATSAPP_WEBHOOK_VERIFIED, {
				agent_id: agentId,
				phase,
			});
		} catch {
			// A failed report must not change the answer Meta gets.
		}
	}
}
