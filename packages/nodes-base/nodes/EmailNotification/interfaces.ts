import {IDataObject} from 'n8n-workflow';

export interface SendGridEventBody extends IDataObject {
	event: string;
	timestamp: number;
	trackId: string;
}
