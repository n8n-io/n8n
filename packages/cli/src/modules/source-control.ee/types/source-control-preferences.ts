import { IsBoolean, IsHexColor, IsOptional, IsString, IsIn, Matches } from 'class-validator';

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
	@Matches(/^[a-zA-Z0-9]/, {
		message: 'branchName must start with an alphanumeric character',
	})
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
	@IsIn(['ssh', 'https'])
	connectionType?: 'ssh' | 'https' = 'ssh';

	@IsOptional()
	@IsString()
	httpsUsername?: string;

	@IsOptional()
	@IsString()
	httpsPassword?: string;

	/** Write-only platform API token (e.g. GitHub PAT); never persisted in the preferences blob. */
	@IsOptional()
	@IsString()
	apiToken?: string;

	/** Read-only flag indicating whether an API token is stored. */
	@IsOptional()
	@IsBoolean()
	readonly hasApiToken?: boolean;

	/** Which credential the code-review API calls use. Defaults to PAT. */
	@IsOptional()
	@IsIn(['pat', 'githubApp'])
	apiAuthMethod?: 'pat' | 'githubApp' = 'pat';

	/** Write-only GitHub App ID; never persisted in the preferences blob. */
	@IsOptional()
	@IsString()
	githubAppId?: string;

	/** Write-only GitHub App private key (PEM); never persisted in the preferences blob. */
	@IsOptional()
	@IsString()
	githubAppPrivateKey?: string;

	/** Read-only flag indicating whether GitHub App credentials are stored. */
	@IsOptional()
	@IsBoolean()
	readonly hasGithubApp?: boolean;

	static fromJSON(json: Partial<SourceControlPreferences>): SourceControlPreferences {
		return new SourceControlPreferences(json);
	}

	static merge(
		preferences: Partial<SourceControlPreferences>,
		defaultPreferences: Partial<SourceControlPreferences>,
	): SourceControlPreferences {
		return new SourceControlPreferences({
			connected: preferences.connected ?? defaultPreferences.connected,
			repositoryUrl: preferences.repositoryUrl ?? defaultPreferences.repositoryUrl,
			branchName: preferences.branchName ?? defaultPreferences.branchName,
			branchReadOnly: preferences.branchReadOnly ?? defaultPreferences.branchReadOnly,
			branchColor: preferences.branchColor ?? defaultPreferences.branchColor,
			keyGeneratorType: preferences.keyGeneratorType ?? defaultPreferences.keyGeneratorType,
			connectionType: preferences.connectionType ?? defaultPreferences.connectionType,
			httpsUsername: preferences.httpsUsername ?? defaultPreferences.httpsUsername,
			httpsPassword: preferences.httpsPassword ?? defaultPreferences.httpsPassword,
			apiAuthMethod: preferences.apiAuthMethod ?? defaultPreferences.apiAuthMethod,
		});
	}
}
