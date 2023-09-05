import type { GenericValue } from 'n8n-workflow';

export type BaseFacebookResponse<TData> = { data: TData };
export type BasePaginatedFacebookResponse<TData> = BaseFacebookResponse<TData> & {
	paging: { cursors: { before?: string; after?: string } };
};

export type FacebookAppWebhookSubscriptionsResponse = BaseFacebookResponse<
	FacebookAppWebhookSubscription[]
>;

export interface FacebookAppWebhookSubscription {
	object: string;
	callback_url: string;
	active: boolean;
	fields: FacebookAppWebhookSubscriptionField[];
}

export interface FacebookAppWebhookSubscriptionField {
	name: string;
	version: string;
}

export interface CreateFacebookAppWebhookSubscription {
	object: string;
	callback_url: string;
	fields: string[];
	include_values: boolean;
	verify_token: string;
}

export type FacebookPageListResponse = BasePaginatedFacebookResponse<FacebookPage[]>;
export type FacebookFormListResponse = BasePaginatedFacebookResponse<FacebookForm[]>;

export interface FacebookPage {
	id: string;
	name: string;
	access_token: string;
	category: string;
	category_list: FacebookPageCategory[];
	tasks: string[];
}

export interface FacebookPageCategory {
	id: string;
	name: string;
}

export interface FacebookForm {
	id: string;
	name: string;
}

export interface FacebookPageEvent {
	object: 'page';
	entry: FacebookPageEventEntry[];
}

export interface FacebookPageEventEntry {
	id: string;
	time: number;
	changes: [
		{
			field: 'leadgen';
			value: {
				ad_id: string;
				form_id: string;
				leadgen_id: string;
				created_time: number;
				page_id: string;
				adgroup_id: string;
			};
		},
	];
}

export interface FacebookFormLeadData {
	created_time: string;
	id: string;
	field_data: [
		{
			name: string;
			values: GenericValue[];
		},
	];
}
