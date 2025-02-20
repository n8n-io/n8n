type TestWebhookDeleted = {
	type: 'testWebhookDeleted';
	data: {
		executionId?: string;
		workflowId: string;
	};
};

type TestWebhookReceived = {
	type: 'testWebhookReceived';
	data: {
		executionId: string;
		workflowId: string;
	};
};

export type WebhookPushMessage = TestWebhookDeleted | TestWebhookReceived;
