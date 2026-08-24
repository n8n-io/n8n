import type {
	InstanceGitConnectionPublicDto,
	UpdateInstanceGitConnectionDto,
} from '@n8n/api-types';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { jsonParse, OperationalError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { INSTANCE_GIT_CONNECTION_SETTINGS_DB_KEY } from './constants';
import {
	computeAuthenticationUpdate,
	emptyGitAuthMaterial,
	gitAuthDeps,
	type GitAuthMaterial,
} from './git-connections-auth.utils';
import { GitConnectionsGitService } from './git-connections-git.service';

/**
 * Persisted shape of the singleton instance connection. Mirrors the project
 * `GitConnection` entity (minus `name`, plus `enabled`), but everything is
 * nullable so the settings are readable before the connection is configured.
 * Reuses {@link GitAuthMaterial} for the shared auth fields. Secrets are stored
 * inline, encrypted, and stripped in {@link toPublic}.
 */
type InstanceGitConnectionPreferences = GitAuthMaterial & {
	enabled: boolean;
	repositoryUrl: string | null;
	branchName: string | null;
	/** Last reconciled commit; server-managed, not set by this settings-only feature yet. */
	baseCommit: string | null;
	createdAt: string | null;
	updatedAt: string | null;
};

@Service()
export class InstanceGitConnectionService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly gitService: GitConnectionsGitService,
		private readonly cipher: Cipher,
	) {}

	async get(): Promise<InstanceGitConnectionPublicDto> {
		return this.toPublic(await this.getPreferences());
	}

	async update(input: UpdateInstanceGitConnectionDto): Promise<InstanceGitConnectionPublicDto> {
		if (Object.keys(input).length === 0) {
			throw new BadRequestError('At least one field is required');
		}

		const current = await this.getPreferences();

		// Validate the target URL and branch before applying auth, so invalid input
		// fails fast instead of generating a throwaway SSH key pair first.
		const targetType = input.connectionType ?? current.connectionType;
		const targetUrl = input.repositoryUrl ?? current.repositoryUrl;

		// A repository URL is only meaningful with a connection type to validate it
		// against; reject rather than persist an unvalidated (and unusable) URL.
		if (input.repositoryUrl !== undefined && !targetType) {
			throw new BadRequestError('Connection type is required to set a repository URL');
		}
		if (targetUrl && targetType) this.gitService.validateRepositoryUrl(targetUrl, targetType);
		if (input.branchName) await this.gitService.validateBranchName(input.branchName);

		const targetEnabled = input.enabled ?? current.enabled;
		// Reject an enable with no configured target before the auth step, so the
		// request fails fast instead of generating a throwaway SSH key pair first.
		// The credential half of the precondition depends on the auth result and is
		// checked by assertConfigured below.
		if (targetEnabled && (!targetUrl || !targetType)) {
			throw new BadRequestError(
				'A repository URL and connection type are required to enable the instance Git connection',
			);
		}

		const updated: InstanceGitConnectionPreferences = { ...current };
		if (input.repositoryUrl !== undefined) updated.repositoryUrl = input.repositoryUrl;
		if (input.branchName !== undefined) updated.branchName = input.branchName;

		const auth = await computeAuthenticationUpdate(
			current,
			input,
			gitAuthDeps(this.gitService, this.cipher),
		);
		if (auth) Object.assign(updated, auth);

		if (targetEnabled) this.assertConfigured(updated);
		updated.enabled = targetEnabled;

		const now = new Date().toISOString();
		// `createdAt` marks the first update, not the first full configuration: we
		// intentionally stamp it even for a no-op update (e.g. disabling a connection
		// that was never configured).
		updated.createdAt = current.createdAt ?? now;
		updated.updatedAt = now;

		await this.save(updated);
		return this.toPublic(updated);
	}

	/** A connection can only be enabled once it is fully usable. */
	private assertConfigured(prefs: InstanceGitConnectionPreferences) {
		if (!prefs.repositoryUrl || !prefs.connectionType) {
			throw new BadRequestError(
				'A repository URL and connection type are required to enable the instance Git connection',
			);
		}
		if (prefs.connectionType === 'ssh' && !prefs.encryptedPrivateKey) {
			throw new BadRequestError(
				'SSH credentials are required to enable the instance Git connection',
			);
		}
		if (
			prefs.connectionType === 'https' &&
			(!prefs.encryptedUsername || !prefs.encryptedPassword)
		) {
			throw new BadRequestError(
				'HTTPS credentials are required to enable the instance Git connection',
			);
		}
	}

	private async getPreferences(): Promise<InstanceGitConnectionPreferences> {
		const setting = await this.settingsRepository.findByKey(
			INSTANCE_GIT_CONNECTION_SETTINGS_DB_KEY,
		);
		if (!setting?.value) return this.defaultPreferences();
		const stored = jsonParse<Partial<InstanceGitConnectionPreferences> | null>(setting.value, {
			fallbackValue: null,
		});
		if (!stored) return this.defaultPreferences();
		// Merge over defaults so a settings row written before a field existed still parses.
		return { ...this.defaultPreferences(), ...stored };
	}

	private defaultPreferences(): InstanceGitConnectionPreferences {
		return {
			...emptyGitAuthMaterial(),
			enabled: false,
			repositoryUrl: null,
			branchName: null,
			baseCommit: null,
			createdAt: null,
			updatedAt: null,
		};
	}

	private async save(prefs: InstanceGitConnectionPreferences) {
		try {
			await this.settingsRepository.upsertByKey(
				INSTANCE_GIT_CONNECTION_SETTINGS_DB_KEY,
				JSON.stringify(prefs),
				false,
				{},
			);
		} catch (error) {
			throw new OperationalError('Failed to save instance Git connection settings', {
				cause: error,
			});
		}
	}

	private toPublic(prefs: InstanceGitConnectionPreferences): InstanceGitConnectionPublicDto {
		return {
			enabled: prefs.enabled,
			repositoryUrl: prefs.repositoryUrl,
			branchName: prefs.branchName,
			connectionType: prefs.connectionType,
			publicKey: prefs.publicKey,
			keyGeneratorType: prefs.keyGeneratorType,
			baseCommit: prefs.baseCommit,
			createdAt: prefs.createdAt,
			updatedAt: prefs.updatedAt,
		};
	}
}
