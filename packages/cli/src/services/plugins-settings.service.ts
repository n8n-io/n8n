import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { PluginsSettingsDto, UpdatePluginSettingsDto } from '@n8n/api-types';
import { Cipher } from 'n8n-core';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { UnexpectedError, UserError } from 'n8n-workflow';

import {
	PLUGIN_REGISTRY,
	getPluginById,
	getPluginByCredentialType,
} from '@/plugins/plugin-registry';

@Service()
export class PluginsSettingsService {
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
