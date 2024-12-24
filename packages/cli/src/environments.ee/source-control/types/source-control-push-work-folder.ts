import { IsBoolean, IsOptional, IsString } from 'class-validator';

import type { SourceControlledFile } from './source-controlled-file';

export class SourceControlPushWorkFolder {
	@IsBoolean()
	@IsOptional()
	force?: boolean;

	@IsString({ each: true })
	fileNames: SourceControlledFile[];

	@IsString()
	@IsOptional()
	message?: string;

	@IsBoolean()
	@IsOptional()
	skipDiff?: boolean;
}
