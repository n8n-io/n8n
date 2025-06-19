import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

export const REST_PATH_SEGMENT = Container.get(GlobalConfig).endpoints.rest;

export const PUBLIC_API_REST_PATH_SEGMENT = Container.get(GlobalConfig).publicApi.path;

export const SUCCESS_RESPONSE_BODY = {
	data: {
		success: true,
	},
} as const;

export const LOGGED_OUT_RESPONSE_BODY = {
	data: {
		loggedOut: true,
	},
};

export const COMMUNITY_PACKAGE_VERSION = {
	CURRENT: '0.1.0',
	UPDATED: '0.2.0',
};

export const COMMUNITY_NODE_VERSION = {
	CURRENT: 1,
	UPDATED: 2,
};
