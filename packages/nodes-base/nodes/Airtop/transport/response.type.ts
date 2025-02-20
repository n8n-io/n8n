import type { IDataObject } from 'n8n-workflow';

export interface IAirtopResponse extends IDataObject {
	sessionId?: string;
	data: IDataObject;
	meta: IDataObject;
	errors: IDataObject[];
	warnings: IDataObject[];
}
