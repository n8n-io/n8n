import { IsOptional, IsString } from 'class-validator';

import { KeyPairType } from './key-pair-type.js';

export class SourceControlGenerateKeyPair {
	@IsOptional()
	@IsString()
	readonly keyGeneratorType?: KeyPairType;
}
