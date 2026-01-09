import type { IDataObject } from 'n8n-workflow';

export interface IDataProvider {
	asDataObject(): IDataObject;
}
