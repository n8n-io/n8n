import { IsBoolean, IsOptional } from 'class-validator';

export class VersionControlPush {
	@IsBoolean()
	@IsOptional()
	force?: boolean;
}
