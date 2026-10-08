import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { z } from 'zod';

const HEALTHZ_TIMEOUT_MS = 3_000;
/** How long a service that has the port route is trusted to keep it. */
const SUPPORTED_CACHE_MS = 10 * 60_000;
/** A service without the route is asked again sooner, so an upgrade shows quickly. */
const UNSUPPORTED_CACHE_MS = 30_000;

/** Older services leave out `capabilities`; they have no port route. */
const healthzSchema = z.object({ capabilities: z.array(z.string()).optional() });

/**
 * Whether a sandbox service can serve a sandbox port over HTTP. The service
 * lists `ports` in the `capabilities` of its `/healthz` answer.
 */
@Service()
export class SandboxPortCapability {
	private readonly logger: Logger;

	private readonly answers = new Map<string, { supported: boolean; until: number }>();

	constructor(
		logger: Logger,
		private readonly outboundHttp: OutboundHttp,
	) {
		this.logger = logger.scoped('agents');
	}

	async assertSupported(serviceUrl: string): Promise<void> {
		if (!(await this.supportsPorts(serviceUrl))) {
			throw new BadRequestError('This sandbox service cannot show app previews yet.');
		}
	}

	private async supportsPorts(serviceUrl: string): Promise<boolean> {
		const cached = this.answers.get(serviceUrl);
		if (cached && Date.now() < cached.until) return cached.supported;
		const supported = await this.readCapability(serviceUrl);
		const ttl = supported ? SUPPORTED_CACHE_MS : UNSUPPORTED_CACHE_MS;
		this.answers.set(serviceUrl, { supported, until: Date.now() + ttl });
		return supported;
	}

	private async readCapability(serviceUrl: string): Promise<boolean> {
		try {
			const body = await this.outboundHttp
				// The sandbox service URL is admin-configured and is often an internal host.
				.requests({ useDefaultSsrfPolicy: 'unsafe' })
				.request<unknown>({
					method: 'GET',
					url: `${serviceUrl}/healthz`,
					json: true,
					timeout: HEALTHZ_TIMEOUT_MS,
				});
			const parsed = healthzSchema.safeParse(body);
			return parsed.success && (parsed.data.capabilities?.includes('ports') ?? false);
		} catch (error) {
			this.logger.warn('Could not read the sandbox service capabilities', {
				error: ensureError(error).message,
			});
			return false;
		}
	}
}
