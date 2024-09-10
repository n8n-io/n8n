interface TestWebhookDeleted {
	type: 'testWebhookDeleted';
	data: {
		executionId?: string;
		workflowId: string;
	};
}

interface TestWebhookReceived {
	type: 'testWebhookReceived';
	data: {
		executionId: string;
		workflowId: string;
	};
}

export type WebhookPushMessage = TestWebhookDeleted | TestWebhookReceived;
