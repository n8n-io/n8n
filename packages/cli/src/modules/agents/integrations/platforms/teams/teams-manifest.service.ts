import {
	TEAMS_DESCRIPTION_MAX,
	TEAMS_DISPLAY_NAME_MAX,
	type AgentTeamsIntegrationSettings,
	type TeamsAgentAppManifest,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { zipSync } from 'fflate';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { v5 as uuidv5 } from 'uuid';

import { sanitiseAppName } from '../../integration-helpers';

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
	// The same caps the settings schema enforces, so a value it accepts is never
	// truncated on its way into the manifest.
	shortName: TEAMS_DISPLAY_NAME_MAX,
	shortDescription: TEAMS_DESCRIPTION_MAX,
	fullName: 100,
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
	/**
	 * Where the app may be used and how it appears. Absent means direct chat
	 * only, with the name and description falling back to the agent's.
	 */
	settings?: AgentTeamsIntegrationSettings;
}

/**
 * Teams delivers only @mentions in a shared conversation unless the app asks to
 * read everything there. Each name is paired with the scope it depends on, so a
 * permission cannot be emitted without its surface.
 */
const READ_PERMISSIONS = [
	{
		setting: 'readAllChannelMessages',
		requires: 'teamChannels',
		name: 'ChannelMessage.Read.Group',
	},
	{
		setting: 'readAllGroupMessages',
		requires: 'groupChats',
		name: 'ChatMessage.Read.Chat',
	},
] as const;

/** The one sentence both the manifest and the setup defaults fall back to. */
function describeApp(appName: string): string {
	return `Chat with ${appName}, an agent powered by n8n.`;
}

@Service()
export class TeamsManifestService {
	buildManifest(options: BuildTeamsManifestOptions): TeamsAgentAppManifest {
		const appName = sanitiseAppName(
			options.settings?.displayName ?? options.agentName,
			LIMITS.fullName,
			DEFAULT_APP_NAME,
		);
		// Falls back to describing the chosen name, not the agent's, so a renamed
		// app does not describe itself as something else.
		const shortDescription = options.settings?.description ?? describeApp(appName);
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
				short: this.truncate(shortDescription, LIMITS.shortDescription),
				full: this.truncate(shortDescription, LIMITS.fullDescription),
			},
			icons: {
				color: 'color.png',
				outline: 'outline.png',
			},
			accentColor: ACCENT_COLOR,
			bots: [
				{
					botId: options.botId,
					scopes: this.buildScopes(options.settings),
					isNotificationOnly: false,
					supportsFiles: false,
				},
			],
			permissions: ['identity', 'messageTeamMembers'],
			validDomains: [],
			...this.buildReadPermissions(options.botId, options.settings),
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

	/** Direct chat is always on: it is what makes the connection testable. */
	private buildScopes(availability: BuildTeamsManifestOptions['settings']): string[] {
		return [
			'personal',
			...(availability?.teamChannels ? ['team'] : []),
			...(availability?.groupChats ? ['groupChat'] : []),
		];
	}

	/**
	 * `webApplicationInfo` is required alongside resource-specific permissions,
	 * so both appear together or neither does.
	 */
	private buildReadPermissions(
		botId: string,
		availability: BuildTeamsManifestOptions['settings'],
	): Partial<TeamsAgentAppManifest> {
		const resourceSpecific = READ_PERMISSIONS.filter(
			({ setting, requires }) => availability?.[setting] && availability?.[requires],
		).map(({ name }) => ({ name, type: 'Application' as const }));

		if (resourceSpecific.length === 0) return {};
		return {
			webApplicationInfo: { id: botId },
			authorization: { permissions: { resourceSpecific } },
		};
	}

	/** What the manifest falls back to, so the setup can show it before saving. */
	defaultIdentity(agentName: string): { displayName: string; description: string } {
		const appName = sanitiseAppName(agentName, LIMITS.fullName, DEFAULT_APP_NAME);
		return {
			displayName: this.truncate(appName, LIMITS.shortName),
			description: this.truncate(describeApp(appName), LIMITS.shortDescription),
		};
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

	/**
	 * Counted in code points, which is both what the manifest schema counts and
	 * what keeps the cut from landing inside an emoji.
	 */
	private truncate(value: string, max: number): string {
		const points = Array.from(value);
		return points.length <= max ? value : points.slice(0, max).join('').trimEnd();
	}
}
