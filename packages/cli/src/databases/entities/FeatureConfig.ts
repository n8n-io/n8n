import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { LdapConfig } from '@/Ldap/types';
import { jsonColumnType } from './AbstractEntity';

@Entity()
export class FeatureConfig {
	@PrimaryColumn()
	name: string;

	@Column(jsonColumnType)
	data: LdapConfig;
}
