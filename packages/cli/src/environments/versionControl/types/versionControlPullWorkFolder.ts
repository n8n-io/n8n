import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class VersionControlPullWorkFolder {
	@IsBoolean()
	@IsOptional()
	force?: boolean;

	@IsString({ each: true })
	@IsOptional()
	files?: Set<string>;
}
