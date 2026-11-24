import { Post, RestController } from '@n8n/decorators';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

/**
 * Dev-only endpoints. Registered only when `N8N_DEV_RELOAD=true`.
 *
 * The published image cannot watch the filesystem (no musl prebuild of
 * `@parcel/watcher`, and inotify does not cross a bind mount), so reload is a
 * push from whoever owns the compiler — see `@n8n/node-cli`'s `dev` command.
 */
@RestController('/dev')
export class DevController {
	constructor(private readonly loadNodesAndCredentials: LoadNodesAndCredentials) {}

	/**
	 * Re-read custom node files already on disk. Takes no payload.
	 * Unauthenticated but rate limited: a reload is CPU-expensive
	 * (postProcessLoaders rebuilds the full type registry), and this may run on
	 * an instance where the var was set by mistake. 100/min never throttles a
	 * human dev loop, but caps abuse.
	 */
	@Post('/reload', { skipAuth: true, ipRateLimit: { limit: 100, windowMs: 60_000 } })
	async reload() {
		const reloaded = await this.loadNodesAndCredentials.reloadCustomNodes();
		return { reloaded };
	}
}
