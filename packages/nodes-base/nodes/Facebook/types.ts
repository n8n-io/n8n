export interface FacebookEvent {
	object: string;
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

export interface FacebookWebhookSubscription {
	object: string;
	callback_url: string;
	fields: string[];
	status: boolean;
}
