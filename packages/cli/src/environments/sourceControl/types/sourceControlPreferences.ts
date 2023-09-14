import { IsBoolean, IsHexColor, IsOptional, IsString } from 'class-validator';
import { KeyPairType } from './keyPairType';

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
		});
	}
}
