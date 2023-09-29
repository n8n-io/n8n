import type { Request } from 'express';
import type {
	IDataObject,
	IHttpRequestMethods,
	INode,
	INodeType,
	IWebhookDescription,
	Workflow,
} from 'n8n-workflow';

export type WebhookCORSRequest = Request & { method: 'OPTIONS' };

export type WebhookRequest = Request<{ path: string }> & { method: IHttpRequestMethods };

export type WaitingWebhookRequest = WebhookRequest & {
	params: WebhookRequest['path'] & { suffix?: string };
};

export interface WebhookResponseCallbackData {
	data?: IDataObject | IDataObject[];
	headers?: object;
	noWebhookResponse?: boolean;
	responseCode?: number;
}

export interface RegisteredWebhook {
	isDynamic: boolean;
	webhookPath: string;
	description: IWebhookDescription;
	workflow: Workflow;
	node: INode;
	nodeType: INodeType;
}

export interface RegisteredActiveWebhook extends RegisteredWebhook {}

export interface RegisteredTestWebhook extends RegisteredActiveWebhook {
	sessionId: string;
	timeout: NodeJS.Timeout;
	destinationNode?: string;
}

export interface RegisteredWaitingWebhook extends RegisteredWebhook {
	executionId: string;
}
