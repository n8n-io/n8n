import { IsString } from 'class-validator';

export class VersionControlPreferences {
	@IsString()
	privateKey: string;

	@IsString()
	publicKey: string;
}
