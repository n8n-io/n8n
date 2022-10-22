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
