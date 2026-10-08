import type { SandboxPortRoute, WorkspaceSandbox } from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { BadRequestError, OperationalError, ServiceUnavailableError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { z } from 'zod';

const HEALTHZ_TIMEOUT_MS = 3_000;
/** How long a service that has the port route is trusted to keep it. */
const SUPPORTED_CACHE_MS = 10 * 60_000;
/** A service without the route is asked again sooner, so an upgrade shows quickly. */
const UNSUPPORTED_CACHE_MS = 30_000;

const UNREACHABLE_MESSAGE =
	'Could not reach the sandbox service to open the app preview. Try again in a moment.';

/** Older services leave out `capabilities`; they have no port route. */
const healthzSchema = z.object({ capabilities: z.array(z.string()).optional() });

const healthzResponseSchema = z.object({ statusCode: z.number(), body: z.unknown() });

/**
 * Finds the route to a sandbox port and checks that its sandbox service can
 * serve it over HTTP. The service lists `ports` in the `capabilities` of its
 * `/healthz` answer.
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

	/** The route to `port` of `sandbox`, on a service that can serve it. */
	async resolveRoute(sandbox: WorkspaceSandbox, port: number): Promise<SandboxPortRoute> {
		if (!sandbox.getPortRoute) {
			throw new BadRequestError('This sandbox cannot show app previews');
		}
		// The route call may start the sandbox, so a service fault can show here first.
		const route = await sandbox.getPortRoute(port).catch((error: unknown) => {
			throw this.unreachable('Could not find the port route of the sandbox', error);
		});
		await this.assertSupported(route.serviceUrl);
		return route;
	}

	async assertSupported(serviceUrl: string): Promise<void> {
		if (!(await this.supportsPorts(serviceUrl))) {
			throw new BadRequestError('This sandbox service cannot show app previews yet.');
		}
	}

	private async supportsPorts(serviceUrl: string): Promise<boolean> {
		const cached = this.answers.get(serviceUrl);
		if (cached && Date.now() < cached.until) return cached.supported;
		// A fault is not cached, because it can pass soon.
		const supported = await this.readCapability(serviceUrl).catch((error: unknown) => {
			throw this.unreachable('Could not read the sandbox service capabilities', error);
		});
		const ttl = supported ? SUPPORTED_CACHE_MS : UNSUPPORTED_CACHE_MS;
		this.answers.set(serviceUrl, { supported, until: Date.now() + ttl });
		return supported;
	}

	/** The user gets a short answer that they can act on, and the cause stays in the log. */
	private unreachable(logMessage: string, error: unknown): ServiceUnavailableError {
		this.logger.warn(logMessage, { error: ensureError(error).message });
		return new ServiceUnavailableError(UNREACHABLE_MESSAGE);
	}

	/**
	 * A 4xx answer means that the service has no such route, so no previews. A
	 * 5xx answer or no answer is a fault that can pass, so it throws.
	 */
	private async readCapability(serviceUrl: string): Promise<boolean> {
		const response = await this.outboundHttp
			// The sandbox service URL is admin-configured and is often an internal host.
			.requests({ useDefaultSsrfPolicy: 'unsafe' })
			.request<unknown>({
				method: 'GET',
				url: `${serviceUrl}/healthz`,
				json: true,
				timeout: HEALTHZ_TIMEOUT_MS,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			});
		const { statusCode, body } = healthzResponseSchema.parse(response);
		if (statusCode >= 500) {
			throw new OperationalError(`The sandbox service answered /healthz with ${statusCode}`);
		}
		if (statusCode >= 300) return false;
		const parsed = healthzSchema.safeParse(body);
		return parsed.success && (parsed.data.capabilities?.includes('ports') ?? false);
	}
}
