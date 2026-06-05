import { SsrfProtectionConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { AxiosInstance, AxiosRequestConfig, CreateAxiosDefaults } from 'axios';
import axios from 'axios';
import { applyAxiosSsrfProtection } from 'n8n-core';
import type { LookupFunction } from 'node:net';

import { SsrfProtectionService } from './ssrf-protection.service';

/**
 * Factory for axios instances that are protected against Server-Side Request
 * Forgery (SSRF) by default.
 *
 * Prefer {@link create} for any outbound HTTP call whose target is influenced
 * by user input (credentials, workflow data, admin-configured URLs, etc.).
 *
 * {@link createUnsafe} is an explicit opt-out for calls to trusted, hardcoded,
 * n8n-controlled endpoints where protection is unnecessary. Reach for it only
 * when you can justify why the target can never be attacker-controlled.
 */
@Service()
export class SafeAxiosFactory {
	constructor(
		private readonly ssrfConfig: SsrfProtectionConfig,
		private readonly ssrfProtectionService: SsrfProtectionService,
	) {}

	/**
	 * Creates an axios instance with SSRF protection applied (when
	 * `N8N_SSRF_PROTECTION_ENABLED` is set). Each outbound request is validated
	 * against the configured allow/block lists before being sent, and resolved
	 * IPs are re-validated at connection time to defeat DNS rebinding.
	 */
	create(defaults?: CreateAxiosDefaults): AxiosInstance {
		const instance = axios.create(defaults);
		if (this.ssrfConfig.enabled) {
			this.protect(instance);
		}
		return instance;
	}

	/**
	 * Creates a plain axios instance WITHOUT SSRF protection.
	 *
	 * Only use for requests to trusted, hardcoded, n8n-controlled endpoints
	 * (e.g. the n8n license server). Never use it for any target that can be
	 * influenced by user input.
	 */
	createUnsafe(defaults?: CreateAxiosDefaults): AxiosInstance {
		return axios.create(defaults);
	}

	/**
	 * Validates a URL against SSRF protection rules without performing a
	 * request. Returns immediately when protection is disabled. Throws if the
	 * URL resolves to a blocked address.
	 */
	async validateUrl(url: string | URL): Promise<void> {
		if (!this.ssrfConfig.enabled) return;
		const result = await this.ssrfProtectionService.validateUrl(url);
		if (!result.ok) throw result.error;
	}

	/**
	 * Returns a TOCTOU-safe DNS lookup function to embed into custom HTTP(S)
	 * agents (e.g. proxy- or TLS-customized agents), or `undefined` when
	 * protection is disabled. Pair it with {@link validateUrl} for a pre-flight
	 * check on callsites that cannot use {@link create}.
	 */
	secureLookup(): LookupFunction | undefined {
		return this.ssrfConfig.enabled
			? this.ssrfProtectionService.createSecureLookup()
			: undefined;
	}

	private protect(instance: AxiosInstance): void {
		instance.interceptors.request.use(async (config) => {
			await this.validateRequestUrl(config);
			applyAxiosSsrfProtection(config, this.ssrfProtectionService);
			return config;
		});
	}

	private async validateRequestUrl(config: AxiosRequestConfig): Promise<void> {
		const url = this.resolveUrl(config);
		if (!url) return;
		const result = await this.ssrfProtectionService.validateUrl(url);
		if (!result.ok) throw result.error;
	}

	private resolveUrl(config: AxiosRequestConfig): string | undefined {
		const { url, baseURL } = config;
		if (!url && !baseURL) return undefined;
		try {
			return baseURL ? new URL(url ?? '', baseURL).href : url;
		} catch {
			return url ?? baseURL;
		}
	}
}
