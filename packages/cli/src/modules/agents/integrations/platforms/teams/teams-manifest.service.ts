import type { TeamsAgentAppManifest } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { zipSync } from 'fflate';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { v5 as uuidv5 } from 'uuid';

const MANIFEST_VERSION = '1.16';
const MANIFEST_SCHEMA = `https://developer.microsoft.com/json-schemas/teams/v${MANIFEST_VERSION}/MicrosoftTeams.schema.json`;

/** Matches the colour of the bundled icons. */
const ACCENT_COLOR = '#EA4B71';

const DEFAULT_APP_NAME = 'n8n Agent';

/**
 * Fixed namespace for the manifest id, so the GUID for an agent never changes.
 * Teams keys an installed app on this id: a new one installs a second app
 * instead of updating the first.
 */
const MANIFEST_ID_NAMESPACE = 'b6b3f2a4-1c5e-4d9a-9f3b-7e2c8a1d4f60';

/** Teams rejects anything longer, naming the field. */
const LIMITS = {
	shortName: 30,
	fullName: 100,
	shortDescription: 80,
	fullDescription: 4000,
	developerName: 32,
} as const;

export interface BuildTeamsManifestOptions {
	agentName: string;
	agentId: string;
	/** Application (client) ID of the Entra app backing the bot. */
	botId: string;
	/** Drives the manifest version, so a re-upload is an update. */
	agentUpdatedAt: Date;
}

@Service()
export class TeamsManifestService {
	buildManifest(options: BuildTeamsManifestOptions): TeamsAgentAppManifest {
		const appName = this.sanitiseName(options.agentName);
		return {
			$schema: MANIFEST_SCHEMA,
			manifestVersion: MANIFEST_VERSION,
			version: this.buildVersion(options.agentUpdatedAt),
			id: this.buildManifestId(options.agentId),
			packageName: `io.n8n.agent.${this.buildManifestId(options.agentId)}`,
			developer: {
				name: this.truncate('n8n', LIMITS.developerName),
				websiteUrl: 'https://n8n.io',
				privacyUrl: 'https://n8n.io/legal/privacy',
				termsOfUseUrl: 'https://n8n.io/legal/terms',
			},
			name: {
				short: this.truncate(appName, LIMITS.shortName),
				full: this.truncate(appName, LIMITS.fullName),
			},
			description: {
				short: this.truncate(
					`Chat with ${appName}, an agent powered by n8n.`,
					LIMITS.shortDescription,
				),
				full: this.truncate(
					`${appName} is an AI agent built in n8n. Send it a direct message in Microsoft Teams and it replies in the same conversation.`,
					LIMITS.fullDescription,
				),
			},
			icons: {
				color: 'color.png',
				outline: 'outline.png',
			},
			accentColor: ACCENT_COLOR,
			bots: [
				{
					botId: options.botId,
					// Direct messages only, matching what the channel supports today.
					scopes: ['personal'],
					isNotificationOnly: false,
					supportsFiles: false,
				},
			],
			permissions: ['identity', 'messageTeamMembers'],
			validDomains: [],
		};
	}

	/**
	 * A flat zip. A nested folder is the single most common reason the Teams
	 * upload fails, so entries are added by name and never by directory.
	 */
	async buildPackage(options: BuildTeamsManifestOptions): Promise<Buffer> {
		const manifest = this.buildManifest(options);
		const [color, outline] = await Promise.all([
			readFile(join(__dirname, 'assets', 'color.png')),
			readFile(join(__dirname, 'assets', 'outline.png')),
		]);

		// Keys carry no path separator, so the archive has no directory entries.
		return Buffer.from(
			zipSync({
				'manifest.json': Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
				'color.png': color,
				'outline.png': outline,
			}),
		);
	}

	/** Stable per agent, so a re-download updates the same Teams app. */
	buildManifestId(agentId: string): string {
		return uuidv5(agentId, MANIFEST_ID_NAMESPACE);
	}

	/**
	 * Teams only accepts an update whose version is higher than the installed
	 * one, so the version tracks the agent rather than being a constant. Major
	 * stays 1 because Teams rejects a leading 0.
	 */
	private buildVersion(updatedAt: Date): string {
		const millis = Math.max(0, updatedAt.getTime());
		const days = Math.floor(millis / 86_400_000);
		const secondsIntoDay = Math.floor((millis % 86_400_000) / 1000);
		return `1.${days}.${secondsIntoDay}`;
	}

	private sanitiseName(raw: string): string {
		const cleaned = raw
			.replace(/[^a-zA-Z0-9 ._-]/g, '')
			.replace(/\s+/g, ' ')
			.trim();
		return cleaned.length > 0 ? cleaned : DEFAULT_APP_NAME;
	}

	private truncate(value: string, max: number): string {
		return value.length <= max ? value : value.slice(0, max).trimEnd();
	}
}
