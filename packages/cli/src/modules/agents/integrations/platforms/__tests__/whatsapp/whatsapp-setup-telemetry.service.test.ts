import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import { WhatsAppSetupTelemetryService } from '../../whatsapp/whatsapp-setup-telemetry.service';

describe('WhatsAppSetupTelemetryService', () => {
	let telemetry: ReturnType<typeof mock<Telemetry>>;
	let service: WhatsAppSetupTelemetryService;

	beforeEach(() => {
		telemetry = mock<Telemetry>();
		service = new WhatsAppSetupTelemetryService(telemetry);
	});

	it.each(['setup', 'connected'] as const)('reports a %s handshake', (phase) => {
		service.webhookVerified('agent-1', phase);

		expect(telemetry.track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.AGENT_WHATSAPP_WEBHOOK_VERIFIED,
			{ agent_id: 'agent-1', phase },
		);
	});

	it('does not throw when reporting fails, so Meta still gets its answer', () => {
		telemetry.track.mockImplementation(() => {
			throw new Error('transport down');
		});

		expect(() => service.webhookVerified('agent-1', 'setup')).not.toThrow();
	});
});
