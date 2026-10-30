export type LoginMethod =
	| { type: 'none' }
	| { type: 'bearer'; token: string }
	| { type: 'header'; name: string; prefix: string; key: string }
	| { type: 'basic'; username: string; password: string };

export interface EndpointCredential {
	baseUrl: string;
	login: LoginMethod;
	gatewayHeaders: Record<string, string>;
}
