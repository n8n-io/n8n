import { Service } from 'typedi';
import config from '@/config';

@Service()
export class UrlService {
	private urls: {
		backend: string;
		rest: string;
		frontend: string;
		webhook: string;
		oauth1Callback: string;
		oauth2Callback: string;
	};

	get backendUrl() {
		return this.urls.backend;
	}

	/** This is the base url for REST Api calls */
	get restBaseUrl() {
		return this.urls.rest;
	}

	/** This is the base url of the UI */
	get frontendUrl() {
		return this.urls.frontend;
	}

	/** This is the base url for webhooks */
	get webhookBaseUrl() {
		return this.urls.webhook;
	}

	get oauth1CallbackUrl() {
		return this.urls.oauth1Callback;
	}

	get oauth2CallbackUrl() {
		return this.urls.oauth2Callback;
	}

	constructor() {
		this.generateUrls();
	}

	updateBackendUrl(backendUrl: string) {
		config.set('backendUrl', backendUrl);
		this.generateUrls();
	}

	generateUserInviteUrl(inviterId: string, inviteeId: string) {
		const url = new URL(`${this.urls.frontend}/signup`);
		url.searchParams.append('inviterId', inviterId);
		url.searchParams.append('inviteeId', inviteeId);
		return url.toString();
	}

	generatePasswordResetUrl(token: string, mfaEnabled: boolean): string {
		const url = new URL(`${this.urls.frontend}/change-password`);
		url.searchParams.append('token', token);
		url.searchParams.append('mfaEnabled', mfaEnabled.toString());
		return url.toString();
	}

	private generateUrls() {
		const baseUrl = this.appendSlash(config.getEnv('backendUrl') || this.generateBackendUrl());
		const webhookUrl = this.appendSlash(config.getEnv('webhookBaseUrl') || baseUrl);

		// TODO: all urls here should end in a slash
		const frontendUrl = this.stripTrailingSlash(config.getEnv('frontendUrl') || baseUrl);
		// TODO: should this use `webhookBaseUrl` ?
		const restBaseUrl = this.stripTrailingSlash(`${baseUrl}${config.getEnv('endpoints.rest')}`);

		this.urls = {
			backend: baseUrl,
			rest: restBaseUrl,
			frontend: frontendUrl,
			webhook: webhookUrl,
			oauth1Callback: `${restBaseUrl}/oauth1-credential/callback`,
			oauth2Callback: `${restBaseUrl}/oauth2-credential/callback`,
		};
	}

	private appendSlash(url: string) {
		return url.endsWith('/') ? url : `${url}/`;
	}

	private stripTrailingSlash(url: string) {
		return url.endsWith('/') ? url.slice(0, url.length - 1) : url;
	}

	private generateBackendUrl(): string {
		const protocol = config.getEnv('protocol');
		const host = config.getEnv('host');
		const port = config.getEnv('port');
		const path = config.getEnv('path');
		if ((protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)) {
			return `${protocol}://${host}${path}`;
		}
		return `${protocol}://${host}:${port}${path}`;
	}
}
