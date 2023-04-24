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
	branchName: string;

	@IsBoolean()
	branchReadOnly: boolean;

	@IsHexColor()
	branchColor: string;

	@IsOptional()
	@IsString()
	readonly privateKey?: string;

	@IsOptional()
	@IsString()
	readonly publicKey?: string;
}
