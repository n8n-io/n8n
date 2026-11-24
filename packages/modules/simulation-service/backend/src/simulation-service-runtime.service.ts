import type { Gym, GymManifest, LlmBackendConfig, Tenant } from '@n8n/ai-gym';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { OperationalError } from '@n8n/errors';

import { SimulationServiceConfig } from './simulation-service.config';
import type { SimulationServiceSession } from './types';

/**
 * Manages the lazy-loaded in-process `@n8n/ai-gym` native Zig engine and creates
 * isolated copy-on-write tenants for workflow simulations and agent sandboxes.
 */
@Service()
export class SimulationServiceRuntimeService {
	private gymPromise: Promise<Gym> | undefined;
	private gym: Gym | undefined;
	private cachedManifest: GymManifest | undefined;
	private activeSessions = 0;

	constructor(
		private readonly config: SimulationServiceConfig,
		private readonly logger: Logger,
	) {}

	private async ensureGym(): Promise<{ gym: Gym; manifest: GymManifest }> {
		if (this.gym && this.cachedManifest) {
			return { gym: this.gym, manifest: this.cachedManifest };
		}

		if (!this.gymPromise) {
			this.gymPromise = this.initGym();
		}

		try {
			const gym = await this.gymPromise;
			const manifest = this.cachedManifest ?? (await gym.manifest());
			this.gym = gym;
			this.cachedManifest = manifest;
			return { gym, manifest };
		} catch (error) {
			this.gymPromise = undefined;
			throw error;
		}
	}

	private async initGym(): Promise<Gym> {
		// Lazy-load the native N-API addon only when a simulation is actually requested.
		const { Gym: GymCtor, rawFetch } = await import('@n8n/ai-gym');
		const gym = await GymCtor.create({
			mode: 'in-process',
			maxTenants: this.config.maxTenants,
			maxRecords: this.config.maxRecords,
			maxBlocks: this.config.maxBlocks,
			monitorRingCap: this.config.monitorRingCap,
			outboundFetch: rawFetch,
		});

		this.cachedManifest = await gym.manifest();

		if (this.config.llmBaseUrl && this.config.llmModel) {
			await gym.setLlmBackend({
				enabled: true,
				base_url: this.config.llmBaseUrl,
				model: this.config.llmModel,
				api_key: this.config.llmApiKey || undefined,
			});
			this.logger.info('Configured simulation-service upstream LLM backend', {
				scopes: ['simulation-service'],
				model: this.config.llmModel,
			});
		}

		this.logger.info('Initialized in-process simulation-service engine', {
			scopes: ['simulation-service'],
			vendorCount: this.cachedManifest.vendors.length,
		});

		return gym;
	}

	async getManifest(): Promise<GymManifest> {
		if (this.cachedManifest) {
			return this.cachedManifest;
		}

		// Load the static vendor manifest once without keeping the native slab allocated when idle.
		const { manifest } = await this.ensureGym();
		this.releaseIfIdle();
		return manifest;
	}

	async createSession(opts?: {
		id?: string;
		llmBackend?: LlmBackendConfig;
	}): Promise<SimulationServiceSession> {
		this.activeSessions += 1;
		let gym: Gym;
		let manifest: GymManifest;
		try {
			const ensured = await this.ensureGym();
			gym = ensured.gym;
			manifest = ensured.manifest;
		} catch (error) {
			this.activeSessions -= 1;
			this.releaseIfIdle();
			throw error;
		}

		let tenant: Tenant;
		try {
			tenant = await gym.createTenant({ id: opts?.id });
		} catch (error) {
			this.activeSessions -= 1;
			this.releaseIfIdle();
			throw new OperationalError('Failed to create simulation-service tenant', {
				cause: error instanceof Error ? error : undefined,
			});
		}

		if (opts?.llmBackend) {
			try {
				await tenant.setLlmBackend({
					enabled: opts.llmBackend.enabled ?? true,
					base_url: opts.llmBackend.base_url,
					model: opts.llmBackend.model,
					api_key: opts.llmBackend.api_key,
				});
			} catch (error) {
				await tenant.destroy().catch(() => undefined);
				this.activeSessions -= 1;
				this.releaseIfIdle();
				throw error;
			}
		}

		let closed = false;
		return {
			tenant,
			manifest,
			close: async () => {
				if (closed) return;
				closed = true;
				try {
					await tenant.destroy();
				} catch (error) {
					this.logger.warn('Failed to destroy simulation-service tenant cleanly', {
						scopes: ['simulation-service'],
						tenantId: tenant.id,
						error: error instanceof Error ? error.message : String(error),
					});
				} finally {
					this.activeSessions = Math.max(0, this.activeSessions - 1);
					this.releaseIfIdle();
				}
			},
		};
	}

	private releaseIfIdle(): void {
		if (this.activeSessions === 0 && this.gym) {
			this.gym.close();
			this.gym = undefined;
			this.gymPromise = undefined;
		}
	}

	shutdown(): void {
		this.activeSessions = 0;
		if (this.gym) {
			this.gym.close();
			this.gym = undefined;
			this.gymPromise = undefined;
		}
		this.cachedManifest = undefined;
	}
}
