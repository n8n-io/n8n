import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class VersionControlPushWorkFolder {
	@IsBoolean()
	@IsOptional()
	force?: boolean;

	@IsString({ each: true })
	@IsOptional()
	fileNames?: Set<string>;

	@IsString({ each: true })
	@IsOptional()
	workflowIds?: Set<string>;

	@IsString({ each: true })
	@IsOptional()
	credentialIds?: Set<string>;

	@IsString()
	@IsOptional()
	message?: string;

	@IsBoolean()
	@IsOptional()
	skipDiff?: boolean;
}
