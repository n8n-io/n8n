import { IsOptional, IsString } from 'class-validator';

import { KeyPairType } from './key-pair-type';

export class SourceControlGenerateKeyPair {
	@IsOptional()
	@IsString()
	readonly keyGeneratorType?: KeyPairType;
}
