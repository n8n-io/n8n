import { IDataObject } from 'n8n-workflow';

export interface ITask {
	name?: string;
	content?: string;
	assignees?: string[] | IDataObject;
	tags?: string[];
	status?: string;
	priority?: number;
	due_date?: number;
	due_date_time?: boolean;
	time_estimate?: number;
	start_date?: number;
	start_date_time?: boolean;
	markdown_content?: string;
	notify_all?: boolean;
	parent?: string;
	custom_fields?: IDataObject[];
}
