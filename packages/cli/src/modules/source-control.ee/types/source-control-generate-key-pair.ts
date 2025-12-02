import { IsOptional, IsString } from 'class-validator';

import { KeyPairType } from '../../../modules/source-control.ee/types/key-pair-type';

export class SourceControlGenerateKeyPair {
	@IsOptional()
	@IsString()
	readonly keyGeneratorType?: KeyPairType;
}
