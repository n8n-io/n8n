import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

interface ISettingsDb {
	key: string;
	value: string | boolean | IDataObject | number;
	loadOnStartup: boolean;
}

@Entity()
export class Settings implements ISettingsDb {
	@PrimaryColumn()
	key: string;

	@Column()
	value: string;

	@Column()
	loadOnStartup: boolean;
}
