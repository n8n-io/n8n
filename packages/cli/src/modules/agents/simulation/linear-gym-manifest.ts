import { OperationalError } from '@n8n/errors';
import { z } from 'zod';

const TIMEOUT_MS = 1000;
const TTL_MS = 30_000;

/** The part of a `sim-service/v1` document that the Linear backend reads. */
const manifestSchema = z.object({
	contract: z.literal('sim-service/v1'),
	service: z.literal('linear'),
	interfaces: z.object({
		mcp: z.array(z.object({ url: z.string().url(), status: z.string() })).optional(),
	}),
});

async function readMcpHosts(base: string, token: string): Promise<Set<string>> {
	// With `service`, the answer has the same shape when the Gym serves more than one vendor.
	const response = await fetch(`${base}/_sim/v1/manifest?service=linear`, {
		redirect: 'error',
		signal: AbortSignal.timeout(TIMEOUT_MS),
		headers: { accept: 'application/json', authorization: `Bearer ${token}` },
	});
	if (!response.ok) throw new OperationalError('The Gym did not report what it serves.');
	const { interfaces } = manifestSchema.parse(await response.json());
	const hosts = (interfaces.mcp ?? [])
		.filter(({ status }) => status === 'implemented')
		.map(({ url }) => new URL(url).host);
	return new Set(hosts.filter((host) => host !== ''));
}

/** Asks the Gym which MCP hosts it serves for Linear. Keeps a good answer for a short time. */
export class LinearGymManifest {
	private cached?: { base: string; expires: number; hosts: Promise<Set<string>> };

	/** Rejects when the Gym is down, is slow or sends a document that is not valid. */
	async mcpHosts(base: string, token: string): Promise<Set<string>> {
		const now = Date.now();
		if (this.cached?.base !== base || this.cached.expires <= now) {
			const entry = { base, expires: now + TTL_MS, hosts: readMcpHosts(base, token) };
			this.cached = entry;
			// A failure is not kept. The next call asks the Gym again.
			entry.hosts.catch(() => {
				if (this.cached === entry) this.cached = undefined;
			});
		}
		return await this.cached.hosts;
	}
}
