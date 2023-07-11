import { IsBoolean, IsOptional, IsString } from 'class-validator';
import type { SourceControlledFile } from './sourceControlledFile';

export class SourceControlPushWorkFolder {
	@IsBoolean()
	@IsOptional()
	force?: boolean;

	@IsString({ each: true })
	@IsOptional()
	fileNames?: SourceControlledFile[];

	// @IsString({ each: true })
	// @IsOptional()
	// workflowIds?: Set<string>;

	// @IsString({ each: true })
	// @IsOptional()
	// credentialIds?: Set<string>;

	@IsString()
	@IsOptional()
	message?: string;

	@IsBoolean()
	@IsOptional()
	skipDiff?: boolean;
}
