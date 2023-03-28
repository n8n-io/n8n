import { IsString } from 'class-validator';

export class EnvironmentPreferences {
	@IsString()
	remoteRepository: string;

	@IsString()
	email: string;

	@IsString()
	name: string;
}
