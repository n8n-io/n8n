export type TestWebhookDeleted = {
	type: 'testWebhookDeleted';
	data: {
		executionId?: string;
		workflowId: string;
	};
};

export type TestWebhookReceived = {
	type: 'testWebhookReceived';
	data: {
		executionId: string;
		workflowId: string;
	};
};

export type WebhookReceived = {
	type: 'webhookReceived';
	data: {
		workflowId: string;
		node: string;
		method: string;
		path: string;
	};
};

export type TriggerFired = {
	type: 'triggerFired';
	data: {
		workflowId: string;
		/** `trigger` for schedules/pollers, `integrated` for sub-workflow calls */
		mode: string;
	};
};

export type WebhookPushMessage =
	| TestWebhookDeleted
	| TestWebhookReceived
	| WebhookReceived
	| TriggerFired;
