import { IsBoolean, IsOptional } from 'class-validator';

export class VersionControlDisconnect {
	@IsBoolean()
	@IsOptional()
	keepKeyPair?: boolean;
}
