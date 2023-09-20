import { IsOptional, IsString } from 'class-validator';
import { KeyPairType } from './keyPairType';

export class SourceControlGenerateKeyPair {
	@IsOptional()
	@IsString()
	readonly keyGeneratorType?: KeyPairType;
}
