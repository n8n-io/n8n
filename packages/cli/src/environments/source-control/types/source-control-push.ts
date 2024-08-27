import { IsBoolean, IsOptional } from 'class-validator';

export class SourceControlPush {
	@IsBoolean()
	@IsOptional()
	force?: boolean;
}
