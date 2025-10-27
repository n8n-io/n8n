import { IsBoolean, IsOptional } from 'class-validator';

export class SourceControlDisconnect {
	@IsBoolean()
	@IsOptional()
	keepKeyPair?: boolean;
}
