import { Logger } from '@n8n/backend-common';
import { CacheService } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';

/**
 * Long enough to cover a setup that someone leaves and returns to. After it
 * expires, clicking "Verify and save" in Meta again records a new handshake.
 */
const VERIFIED_TTL_MS = 7 * Time.days.toMilliseconds;

const cacheKey = (agentId: string) => `agents:whatsapp:webhook-verified:${agentId}`;

/**
 * Remembers that Meta completed the webhook handshake for an agent, so the
 * setup can confirm that step. The handshake can reach any main, so this uses
 * the shared cache and not process memory.
 */
@Service()
export class WhatsAppWebhookVerificationStore {
	constructor(
		private readonly cacheService: CacheService,
		private readonly logger: Logger,
	) {}

	/** Never throws: Meta has already received its answer when this runs. */
	async markVerified(agentId: string): Promise<void> {
		try {
			await this.cacheService.set(cacheKey(agentId), true, VERIFIED_TTL_MS);
		} catch (error) {
			this.logger.warn('[WhatsAppIntegration] Failed to record the webhook handshake', {
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Never throws: removing the channel has already succeeded when this runs,
	 * and a leftover record expires on its own.
	 */
	async clear(agentId: string): Promise<void> {
		try {
			await this.reset(agentId);
		} catch (error) {
			this.logger.warn('[WhatsAppIntegration] Failed to clear the webhook handshake', {
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Throws, unlike {@link clear}: the setup resets before it asks for a new
	 * handshake, and a record that survives would confirm the step for the
	 * wrong Meta app.
	 */
	async reset(agentId: string): Promise<void> {
		await this.cacheService.delete(cacheKey(agentId));
	}

	async isVerified(agentId: string): Promise<boolean> {
		return (await this.cacheService.get<boolean>(cacheKey(agentId))) === true;
	}
}
