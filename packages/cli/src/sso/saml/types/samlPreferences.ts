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

	@IsBoolean()
	@IsOptional()
	ignoreSSL?: boolean = false;

	@IsString()
	@IsOptional()
	loginBinding?: SamlLoginBinding = 'redirect';

	@IsBoolean()
	@IsOptional()
	loginEnabled?: boolean;

	@IsString()
	@IsOptional()
	loginLabel?: string;

	@IsBoolean()
	@IsOptional()
	authnRequestsSigned?: boolean = false;

	@IsBoolean()
	@IsOptional()
	wantAssertionsSigned?: boolean = true;

	@IsBoolean()
	@IsOptional()
	wantMessageSigned?: boolean = true;

	@IsString()
	@IsOptional()
	acsBinding?: SamlLoginBinding = 'post';
}
