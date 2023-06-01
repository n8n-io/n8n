import { IsOptional, IsString } from 'class-validator';

export class VersionControlStage {
	@IsString({ each: true })
	@IsOptional()
	fileNames?: Set<string>;

	@IsString({ each: true })
	@IsOptional()
	workflowIds?: Set<string>;

	@IsString({ each: true })
	@IsOptional()
	credentialIds?: Set<string>;
}
