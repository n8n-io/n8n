import type { Request, Response } from 'express';
import type { IDataObject, IHttpRequestMethods } from 'n8n-workflow';

export type WebhookOptionsRequest = Request & { method: 'OPTIONS' };

export type WebhookRequest = Request<{ path: string }> & {
	method: IHttpRequestMethods;
	params: Record<string, string>;
};

export type WaitingWebhookRequest = WebhookRequest & {
	params: Pick<WebhookRequest['params'], 'path'> & { suffix?: string };
};

export interface WebhookAccessControlOptions {
	allowedOrigins?: string;
}

export interface IWebhookManager {
	/** Gets all request methods associated with a webhook path*/
	getWebhookMethods?: (path: string) => Promise<IHttpRequestMethods[]>;

	/** Find the CORS options matching a path and method */
	findAccessControlOptions?: (
		path: string,
		httpMethod: IHttpRequestMethods,
	) => Promise<WebhookAccessControlOptions | undefined>;

	executeWebhook(req: WebhookRequest, res: Response): Promise<IWebhookResponseCallbackData>;
}

export interface IWebhookResponseCallbackData {
	data?: IDataObject | IDataObject[];
	headers?: object;
	noWebhookResponse?: boolean;
	responseCode?: number;
}

export type Method = NonNullable<IHttpRequestMethods>;

/** Response headers. Keys are always lower-cased. */
export type WebhookResponseHeaders = Map<string, string>;

/**
 * The headers object that node's `responseHeaders` property can return
 */
export type WebhookNodeResponseHeaders = {
	entries?: Array<{
		name: string;
		value: string;
	}>;
};
