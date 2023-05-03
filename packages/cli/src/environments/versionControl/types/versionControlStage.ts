import { IsOptional, IsString } from 'class-validator';

export class VersionControlStage {
	@IsString({ each: true })
	@IsOptional()
	files: string[];
}
