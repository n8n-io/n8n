import type { IDataObject } from 'n8n-workflow';
interface ISettingsDb {
	key: string;
	value: string | boolean | IDataObject | number;
	loadOnStartup: boolean;
}
export declare class Settings implements ISettingsDb {
	key: string;
	value: string;
	loadOnStartup: boolean;
}
export {};
