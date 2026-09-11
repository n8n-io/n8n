import { ModuleRegistry } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';

import { AbstractServer } from '@/abstract-server';
import { ChatServer } from '@/chat/chat-server';
import { TwilioVoiceServer } from '@/modules/agents/integrations/platforms/twilio-voice-server';

@Service()
export class WebhookServer extends AbstractServer {
	/** Mounts `/metrics` so dedicated webhook procs are scrapeable. */
	async configure(): Promise<void> {
		if (this.globalConfig.endpoints.metrics.enable) {
			const { PrometheusMetricsService } = await import('@/metrics/prometheus/index.js');
			Container.get(PrometheusMetricsService).init(this.app);
		}
	}

	/** The chat widget opens its WebSocket against the same origin that served the chat webhook */
	protected setupPushServer() {
		Container.get(ChatServer).setup(this.server, this.app);
		if (Container.get(ModuleRegistry).isActive('agents')) {
			Container.get(TwilioVoiceServer).setup(this.server);
		}
	}
}
