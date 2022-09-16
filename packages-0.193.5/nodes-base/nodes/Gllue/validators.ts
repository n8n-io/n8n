import {VALID_GLLUE_SOURCES} from './constants';
import {Response} from 'express';

interface NoWebhookResponse {
	noWebhookResponse: boolean;
}

export class ErrorMessageBuilder {
	responseCode: number;
	realm: string;
	resp: Response;

	// TODO: remove any and refactor in Unit Test
	// tslint:disable-next-line:no-any
	constructor(resp: Response | any, realm: string, responseCode: number) {
		this.resp = resp;
		this.realm = realm;
		this.responseCode = responseCode;
	}

	static getMessage(responseCode?: number): string {
		let message = 'Authorization problem!';
		if (responseCode === 401) {
			// TODO: magic number
			message = 'Authorization is required!'; // TODO: magic string
		} else if (responseCode === 403) {
			message = 'Authorization data is wrong!';
		} else if (responseCode === 202) {
			message = 'Skipped, event is not the same with webhook.';
		}
		return message;
	}

	static getHeader(realm: string): { 'WWW-Authenticate': string } {
		return {'WWW-Authenticate': `Basic realm="${realm}"`};
	}

	handle(): NoWebhookResponse {
		const message = ErrorMessageBuilder.getMessage(this.responseCode);
		const header = ErrorMessageBuilder.getHeader(this.realm);
		this.resp.writeHead(this.responseCode, header);
		this.resp.end(message);
		return {
			noWebhookResponse: true,
		};
	}
}

export class TokenValidator {
	private token: string | undefined;
	private expectedToken: string;

	constructor(token: string | undefined, expectedToken: string) {
		this.token = token;
		this.expectedToken = expectedToken;
	}

	isMissing() {
		return this.token === undefined;
	}

	isWrong() {
		return this.token !== this.expectedToken;
	}
}

export class EventChecker {
	static isValid(payloadEvent: string, nodeEvent: string) {
		return payloadEvent === nodeEvent;
	}
}

interface GllueWebhookQuery {
	token?: string;
	source?: string;
}

export class SourceValidator {
	query: GllueWebhookQuery;

	constructor(query: GllueWebhookQuery) {
		this.query = query;
	}

	check(): void {
		const sourceExist = this.query.source !== undefined;
		if (!sourceExist) {
			throw new Error('Missing source in query of request');
		}
		if (!this.isInList()) {
			throw new Error(`"${this.query.source}" not in the valid list of [${VALID_GLLUE_SOURCES}]`);
		}
	}

	isInList() {
		return VALID_GLLUE_SOURCES.includes(this.query.source || '');
	}
}
