/* eslint-disable import/no-cycle */
import { Column, ColumnOptions, Entity, PrimaryColumn } from 'typeorm';
import { IFeatureConfigDb } from '../..';
import type { LdapConfig } from '../../Ldap/types';
import { jsonColumnType } from './AbstractEntity';

@Entity()
export class FeatureConfig implements IFeatureConfigDb {
	@PrimaryColumn()
	name: string;

	@Column({
		type: jsonColumnType as ColumnOptions['type'],
		default: '{}',
	})
	data: string | LdapConfig;
}
