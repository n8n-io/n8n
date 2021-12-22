/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-cycle */

import { IDataObject } from 'n8n-workflow';

import { Column, Entity, PrimaryColumn } from 'typeorm';

import { ISettingsDb } from '../..';

@Entity()
export class Settings implements ISettingsDb {
	@PrimaryColumn()
	key: string;

	@Column()
	value: string;

	@Column()
	loadOnStartup: boolean;
}
