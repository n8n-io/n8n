import { IsOptional, IsString } from 'class-validator';

export class SourceControlStage {
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
