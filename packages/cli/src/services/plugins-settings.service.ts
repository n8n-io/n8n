import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	PluginsSettingsDto,
	UpdatePluginSettingsDto,
	MergeDevIntegrationDto,
} from '@n8n/api-types';
import { Cipher } from 'n8n-core';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { UnexpectedError, UserError } from 'n8n-workflow';

import {
	PLUGIN_REGISTRY,
	getPluginById,
	getPluginByCredentialType,
} from '@/plugins/plugin-registry';

const MERGE_DEV_API_BASE = 'https://api.merge.dev/api/integrations';
const MERGE_DEV_INTEGRATIONS_URL = MERGE_DEV_API_BASE;
const MERGE_DEV_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface MergeDevApiIntegration {
	name: string;
	slug: string;
	categories: string[];
	square_image: string;
	color: string;
}

@Service()
export class PluginsSettingsService {
	private mergeDevCache: { data: MergeDevIntegrationDto[]; fetchedAt: number } | null = null;

	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cipher: Cipher,
	) {}

	// ─── REST API layer ───────────────────────────────────────────────────────

	async getPluginsSettings(): Promise<PluginsSettingsDto> {
		const plugins = await Promise.all(
			PLUGIN_REGISTRY.map(async (plugin) => ({
				id: plugin.id,
				credentialType: plugin.credentialType,
				displayName: plugin.displayName,
				description: plugin.description,
				managedToggleField: plugin.managedToggleField,
				enabled: await this.getPluginEnabled(plugin.id),
				fields: await Promise.all(
					plugin.managedFields.map(async (field) => ({
						key: field.storageKey,
						label: field.label,
						placeholder: field.placeholder,
						value: await this.getPluginField(plugin.id, field.storageKey),
					})),
				),
			})),
		);
		return { plugins };
	}

	async updatePluginSettings(dto: UpdatePluginSettingsDto): Promise<PluginsSettingsDto> {
		const plugin = getPluginById(dto.id);
		if (!plugin) {
			throw new UserError(`Unknown plugin: '${dto.id}'`);
		}

		if (dto.enabled !== undefined) {
			await this.setPluginEnabled(plugin.id, dto.enabled);
		}

		if (dto.fields) {
			for (const [key, value] of Object.entries(dto.fields)) {
				await this.setPluginField(plugin.id, key, value);
			}
		}

		return await this.getPluginsSettings();
	}

	// ─── Credential injection ─────────────────────────────────────────────────

	async injectPluginManagedCredentials(
		type: string,
		data: ICredentialDataDecryptedObject,
	): Promise<ICredentialDataDecryptedObject> {
		const plugin = getPluginByCredentialType(type);
		if (!plugin || !data[plugin.managedToggleField]) return data;

		const enabled = await this.getPluginEnabled(plugin.id);
		if (!enabled) {
			throw new UserError(
				`This credential requires the ${plugin.displayName} integration to be enabled. Ask your instance owner to turn it on in Settings → Plugins.`,
			);
		}

		let result = { ...data };
		for (const field of plugin.managedFields) {
			const value = await this.getPluginField(plugin.id, field.storageKey);
			result = { ...result, [field.credentialField]: value };
		}
		return result;
	}

	// ─── Merge.dev Link ───────────────────────────────────────────────────────

	async createMergeDevLinkToken(endUserEmail: string, category: string): Promise<string> {
		const enabled = await this.getPluginEnabled('mergeDev');
		if (!enabled) {
			throw new UserError('Merge.dev plugin is not enabled.');
		}

		const apiKey = await this.getPluginField('mergeDev', 'apiKey');
		if (!apiKey) {
			throw new UserError('Merge.dev API key is not configured.');
		}

		const response = await fetch(`${MERGE_DEV_API_BASE}/create-link-token`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				end_user_origin_id: crypto.randomUUID(),
				end_user_email_address: endUserEmail,
				end_user_organization_name: 'n8n',
				categories: [category],
			}),
		});

		if (!response.ok) {
			if (response.status === 429) {
				throw new UserError(
					'Merge.dev rate limit reached. Please wait a moment before trying again.',
				);
			}
			throw new UnexpectedError(
				`Failed to create Merge.dev link token: ${String(response.status)}`,
			);
		}

		const data = (await response.json()) as { link_token: string };
		return data.link_token;
	}

	async getMergeDevAccountToken(publicToken: string): Promise<string> {
		const apiKey = await this.getPluginField('mergeDev', 'apiKey');
		if (!apiKey) {
			throw new UserError('Merge.dev API key is not configured.');
		}

		const response = await fetch(`${MERGE_DEV_API_BASE}/account-token/${publicToken}`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});

		if (!response.ok) {
			throw new UnexpectedError(
				`Failed to retrieve Merge.dev account token: ${String(response.status)}`,
			);
		}

		const data = (await response.json()) as { account_token: string };
		return data.account_token;
	}

	// ─── Merge.dev integrations ──────────────────────────────────────────────

	async getMergeDevIntegrations(): Promise<MergeDevIntegrationDto[]> {
		const enabled = await this.getPluginEnabled('mergeDev');
		if (!enabled) return [];

		if (this.mergeDevCache && Date.now() - this.mergeDevCache.fetchedAt < MERGE_DEV_CACHE_TTL_MS) {
			return this.mergeDevCache.data;
		}

		const response = await fetch(MERGE_DEV_INTEGRATIONS_URL);
		if (!response.ok) {
			throw new UnexpectedError(
				`Failed to fetch Merge.dev integrations: ${String(response.status)}`,
			);
		}

		const raw = (await response.json()) as MergeDevApiIntegration[];
		const integrations: MergeDevIntegrationDto[] = raw.map((item) => ({
			name: item.name,
			slug: item.slug,
			categories: item.categories,
			squareImage: item.square_image,
			color: item.color,
		}));

		this.mergeDevCache = { data: integrations, fetchedAt: Date.now() };
		return integrations;
	}

	// ─── Generic plugin storage ───────────────────────────────────────────────

	private async getPluginEnabled(pluginId: string): Promise<boolean> {
		const row = await this.settingsRepository.findByKey(this.enabledStorageKey(pluginId));
		return row?.value === 'true';
	}

	private async setPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: this.enabledStorageKey(pluginId), value: String(enabled), loadOnStartup: false },
			['key'],
		);
	}

	private async getPluginField(pluginId: string, storageKey: string): Promise<string> {
		const row = await this.settingsRepository.findByKey(this.fieldStorageKey(pluginId, storageKey));
		return row ? this.decrypt(row.value) : '';
	}

	private async setPluginField(pluginId: string, storageKey: string, value: string): Promise<void> {
		await this.settingsRepository.upsert(
			{
				key: this.fieldStorageKey(pluginId, storageKey),
				value: this.cipher.encrypt(value),
				loadOnStartup: false,
			},
			['key'],
		);
	}

	private enabledStorageKey(pluginId: string): string {
		return `plugins.${pluginId}.enabled`;
	}

	private fieldStorageKey(pluginId: string, storageKey: string): string {
		return `plugins.${pluginId}.${storageKey}`;
	}

	private decrypt(encryptedValue: string): string {
		try {
			return this.cipher.decrypt(encryptedValue);
		} catch {
			throw new UnexpectedError(
				'Plugin credential field could not be decrypted. The encryption key may have changed.',
			);
		}
	}
}
