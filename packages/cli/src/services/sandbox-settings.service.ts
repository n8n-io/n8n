import type { InstanceAiSandboxProvider } from '@n8n/api-types';
import { normalizeSandboxProvider as normalizeRuntimeSandboxProvider } from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { AgentsConfig, DeploymentConfig, InstanceAiConfig } from '@n8n/config';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import {
	InstanceCredentialBroker,
	type InstanceCredentialUse,
	type ResolvedInstanceCredential,
} from '@/credentials/instance-credential-broker';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

const N8N_SANDBOX_HEADER_NAME = 'x-api-key';

type SandboxCredential = {
	type: string;
	data: ICredentialDataDecryptedObject;
};

function requireConnectionValue(
	type: string,
	data: ICredentialDataDecryptedObject,
	field: string,
): string {
	const value = data[field];
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new UnprocessableRequestError(
			`The field "${field}" is required for provider connection type "${type}"`,
		);
	}
	return value.trim();
}

function requireHttpUrl(type: string, data: ICredentialDataDecryptedObject, field: string): string {
	const value = requireConnectionValue(type, data, field);
	try {
		const url = new URL(value);
		if (url.protocol === 'http:' || url.protocol === 'https:') return value;
	} catch {}
	throw new UnprocessableRequestError(
		`The field "${field}" must be a valid HTTP URL for provider connection type "${type}"`,
	);
}

function parseSandboxServiceCredential({ type, data }: SandboxCredential): string {
	const headerName = requireConnectionValue(type, data, 'name').toLowerCase();
	if (headerName !== N8N_SANDBOX_HEADER_NAME) {
		throw new UnprocessableRequestError(
			`The credential's header name must be "${N8N_SANDBOX_HEADER_NAME}" but is "${headerName}"`,
		);
	}
	return requireConnectionValue(type, data, 'value');
}

function parseDaytonaCredential({ type, data }: SandboxCredential): {
	apiUrl: string;
	apiKey: string;
} {
	return {
		apiUrl: requireHttpUrl(type, data, 'apiUrl'),
		apiKey: requireConnectionValue(type, data, 'apiKey'),
	};
}

export const INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY: InstanceCredentialUse = {
	id: 'instance-ai:sandbox:daytona',
	credentialTypes: ['daytonaApi'],
	validate: parseDaytonaCredential,
};

export const INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY: InstanceCredentialUse = {
	id: 'instance-ai:sandbox:n8n',
	credentialTypes: ['httpHeaderAuth'],
	validate: parseSandboxServiceCredential,
};

@Service()
export class SandboxSettingsService {
	private readonly config: InstanceAiConfig;

	private readonly agentsConfig: AgentsConfig;

	private readonly deploymentConfig: DeploymentConfig;

	private credentialUsesRegistered = false;

	constructor(
		globalConfig: GlobalConfig,
		private readonly instanceCredentialBroker: InstanceCredentialBroker,
		private readonly logger: Logger,
	) {
		this.config = globalConfig.instanceAi;
		this.agentsConfig = globalConfig.agents;
		this.deploymentConfig = globalConfig.deployment;
		this.config.sandboxProvider = this.getProvider();
	}

	isAgentSandboxEnabled(): boolean {
		return this.agentsConfig.sandboxEnabled || this.config.sandboxEnabled;
	}

	getProvider(): InstanceAiSandboxProvider {
		return normalizeRuntimeSandboxProvider(this.config.sandboxProvider);
	}

	registerCredentialUses(): void {
		if (this.credentialUsesRegistered) return;
		this.instanceCredentialBroker.registerUse(INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY);
		this.instanceCredentialBroker.registerUse(INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY);
		this.credentialUsesRegistered = true;
	}

	async resolveDaytonaConfig(): Promise<{ apiUrl?: string; apiKey?: string }> {
		const { daytonaApiUrl, daytonaApiKey } = this.config;
		const envConfig = {
			apiUrl: daytonaApiUrl || undefined,
			apiKey: daytonaApiKey || undefined,
		};
		const resolved = await this.resolveServiceCredential(
			INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY,
			'Daytona sandbox',
		);
		if (!resolved) return envConfig;
		try {
			return parseDaytonaCredential(resolved);
		} catch (error) {
			this.warnCredentialFallback(
				'Daytona sandbox',
				INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY.id,
				ensureError(error).message,
			);
			return envConfig;
		}
	}

	async resolveN8nSandboxConfig(
		ctx?: OperationContext,
	): Promise<{ serviceUrl?: string; apiKey?: string }> {
		const { n8nSandboxServiceUrl, n8nSandboxServiceApiKey } = this.config;
		const envConfig = {
			serviceUrl: n8nSandboxServiceUrl || undefined,
			apiKey: n8nSandboxServiceApiKey || undefined,
		};
		const resolved = await this.resolveServiceCredential(
			INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY,
			'n8n Sandbox',
			ctx,
		);
		if (!resolved) return envConfig;

		try {
			const apiKey = parseSandboxServiceCredential(resolved);
			return { serviceUrl: n8nSandboxServiceUrl || undefined, apiKey };
		} catch (error) {
			this.warnCredentialFallback(
				'n8n Sandbox',
				INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY.id,
				ensureError(error).message,
			);
			return envConfig;
		}
	}

	private async resolveServiceCredential(
		policy: InstanceCredentialUse,
		service: string,
		ctx?: OperationContext,
	): Promise<ResolvedInstanceCredential | null> {
		if (this.deploymentConfig.type === 'cloud') return null;
		const resolved = ctx
			? this.instanceCredentialBroker.resolveForUse(policy, ctx)
			: this.instanceCredentialBroker.resolveForUse(policy);
		return await resolved.catch((error: unknown) => {
			this.warnCredentialFallback(service, policy.id, ensureError(error).message);
			return null;
		});
	}

	private warnCredentialFallback(service: string, credentialUseId: string, reason: string): void {
		this.logger
			.scoped('instance-ai')
			.warn(`Could not resolve the configured ${service} credential; using environment fallback`, {
				credentialUseId,
				error: reason,
			});
	}
}
