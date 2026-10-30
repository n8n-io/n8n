export interface OAuth2Login {
	type: 'oauth2';
	tokenUrl: string;
	clientId: string;
	clientSecret: string;
	scope: string;
	sendCredentialsIn: 'header' | 'body';
}

export type LoginMethod =
	| { type: 'none' }
	| { type: 'bearer'; token: string }
	| { type: 'header'; name: string; prefix: string; key: string }
	| { type: 'basic'; username: string; password: string }
	| OAuth2Login;

export interface EndpointCredential {
	baseUrl: string;
	login: LoginMethod;
	gatewayHeaders: Record<string, string>;
}
