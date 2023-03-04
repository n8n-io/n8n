import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { SamlLoginBinding } from '.';
import { SamlAttributeMapping } from './samlAttributeMapping';

export class SamlPreferences {
	@IsObject()
	@IsOptional()
	mapping?: SamlAttributeMapping;

	@IsString()
	@IsOptional()
	metadata?: string;

	@IsString()
	@IsOptional()
	metadataUrl?: string;

	@IsString()
	@IsOptional()
	loginBinding?: SamlLoginBinding = 'redirect';

	@IsBoolean()
	@IsOptional()
	loginEnabled?: boolean;

	@IsString()
	@IsOptional()
	loginLabel?: string;
}
