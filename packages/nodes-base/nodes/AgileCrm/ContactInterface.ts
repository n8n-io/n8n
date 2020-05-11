import {
	IDataObject,
} from 'n8n-workflow';

export interface IProperty {
	type: string;
	name: string;
	subtype?: string;
	value?: string;
}

export interface IContact {
	type?: string;
	star_value?: string;
	lead_score?: string;
	tags?: string[];
	properties?: IDataObject[];
}

export interface IContactUpdate {
	id: string;
	properties?: IDataObject[];
	star_value?: string;
	lead_score?: string;
	tags?: string[];
}
