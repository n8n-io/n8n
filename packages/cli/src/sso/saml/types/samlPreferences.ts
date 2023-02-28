import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
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
	loginEnabled?: boolean;

	@IsString()
	@IsOptional()
	loginLabel?: string;
}
