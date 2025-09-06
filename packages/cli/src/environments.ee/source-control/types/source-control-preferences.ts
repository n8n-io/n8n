import { IsBoolean, IsEnum, IsHexColor, IsOptional, IsString } from 'class-validator';

import { KeyPairType } from './key-pair-type';

export class SourceControlPreferences {
	constructor(preferences: Partial<SourceControlPreferences> | undefined = undefined) {
		if (preferences) Object.assign(this, preferences);
	}

	@IsBoolean()
	connected: boolean;

	@IsString()
	repositoryUrl: string;

	@IsString()
	branchName = 'main';

	@IsBoolean()
	branchReadOnly: boolean;

	@IsHexColor()
	branchColor: string;

	@IsOptional()
	@IsString()
	readonly publicKey?: string;

	@IsOptional()
	@IsBoolean()
	readonly initRepo?: boolean;

	@IsOptional()
	@IsString()
	readonly keyGeneratorType?: KeyPairType;

	@IsOptional()
	@IsEnum(['ssh', 'https'])
	protocol?: 'ssh' | 'https';

	@IsOptional()
	@IsString()
	username?: string;

	@IsOptional()
	@IsString()
	personalAccessToken?: string;

	static fromJSON(json: Partial<SourceControlPreferences>): SourceControlPreferences {
		return new SourceControlPreferences(json);
	}

	static merge(
		preferences: Partial<SourceControlPreferences>,
		defaultPreferences: Partial<SourceControlPreferences>,
	): SourceControlPreferences {
		const resolvedProtocol = preferences.protocol ?? defaultPreferences.protocol ?? 'ssh';

		// Clear HTTPS credentials when switching to SSH protocol
		let username = preferences.username ?? defaultPreferences.username;
		let personalAccessToken =
			preferences.personalAccessToken ?? defaultPreferences.personalAccessToken;

		if (resolvedProtocol === 'ssh') {
			// If explicitly switching to SSH, clear HTTPS credentials
			if (preferences.protocol === 'ssh') {
				username = undefined;
				personalAccessToken = undefined;
			}
		}

		return new SourceControlPreferences({
			connected: preferences.connected ?? defaultPreferences.connected,
			repositoryUrl: preferences.repositoryUrl ?? defaultPreferences.repositoryUrl,
			branchName: preferences.branchName ?? defaultPreferences.branchName,
			branchReadOnly: preferences.branchReadOnly ?? defaultPreferences.branchReadOnly,
			branchColor: preferences.branchColor ?? defaultPreferences.branchColor,
			keyGeneratorType: preferences.keyGeneratorType ?? defaultPreferences.keyGeneratorType,
			protocol: resolvedProtocol,
			username,
			personalAccessToken,
		});
	}
}
