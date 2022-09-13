import { IDataObject } from 'n8n-workflow';

export interface IUserCompany {
	company_id?: string;
}

export interface IAvatar {
	type?: string;
	image_url?: string;
}

export interface IUser {
	user_id?: string;
	id?: string;
	email?: string;
	phone?: string;
	name?: string;
	custom_attributes?: IDataObject;
	companies?: IUserCompany[];
	last_request_at?: number;
	signed_up_at?: string;
	unsubscribed_from_emails?: boolean;
	update_last_request_at?: boolean;
	last_seen_user_agent?: boolean;
	session_count?: number;
	avatar?: IAvatar;
	utm_source?: string;
	utm_medium?: string;
	utm_campaign?: string;
	utm_term?: string;
	utm_content?: string;
}
