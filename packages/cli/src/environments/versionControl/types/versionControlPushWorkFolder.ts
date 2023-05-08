import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class VersionControlPushWorkFolder {
	@IsBoolean()
	@IsOptional()
	force?: boolean;

	@IsString({ each: true })
	@IsOptional()
	files: Set<string> = new Set<string>();

	@IsString()
	@IsOptional()
	message = 'Updated Workfolder';
}
