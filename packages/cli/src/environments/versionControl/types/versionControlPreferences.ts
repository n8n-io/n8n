import { IsBoolean, IsEmail, IsHexColor, IsOptional, IsString, IsUrl } from 'class-validator';

export class VersionControlPreferences {
	@IsBoolean()
	connected: boolean;

	@IsString()
	@IsUrl()
	repositoryUrl: string;

	@IsString()
	authorName: string;

	@IsString()
	@IsEmail()
	authorEmail: string;

	@IsString()
	branchName: string;

	@IsBoolean()
	branchReadOnly: boolean;

	@IsString()
	@IsHexColor()
	branchColor: string;

	@IsOptional()
	@IsString()
	readonly privateKey?: string;

	@IsOptional()
	@IsString()
	readonly publicKey?: string;
}
