import { IsBoolean, IsEmail, IsHexColor, IsOptional, IsString } from 'class-validator';

export class VersionControlPreferences {
	constructor(preferences: Partial<VersionControlPreferences> | undefined = undefined) {
		if (preferences) Object.assign(this, preferences);
	}

	@IsBoolean()
	connected: boolean;

	@IsString()
	repositoryUrl: string;

	@IsString()
	authorName: string;

	@IsEmail()
	authorEmail: string;

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

	static fromJSON(json: Partial<VersionControlPreferences>): VersionControlPreferences {
		return new VersionControlPreferences(json);
	}

	static merge(
		preferences: Partial<VersionControlPreferences>,
		defaultPreferences: Partial<VersionControlPreferences>,
	): VersionControlPreferences {
		return new VersionControlPreferences({
			connected: preferences.connected ?? defaultPreferences.connected,
			repositoryUrl: preferences.repositoryUrl ?? defaultPreferences.repositoryUrl,
			authorName: preferences.authorName ?? defaultPreferences.authorName,
			authorEmail: preferences.authorEmail ?? defaultPreferences.authorEmail,
			branchName: preferences.branchName ?? defaultPreferences.branchName,
			branchReadOnly: preferences.branchReadOnly ?? defaultPreferences.branchReadOnly,
			branchColor: preferences.branchColor ?? defaultPreferences.branchColor,
		});
	}
}
