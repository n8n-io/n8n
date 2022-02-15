import type { N8nApp } from "../../../src/UserManagement/Interfaces";

export type SmtpTestAccount = {
	user: string;
	pass: string;
	smtp: {
		host: string;
		port: number;
		secure: boolean;
	};
};

export type EndpointNamespace = 'me' | 'users' | 'auth' | 'owner';

export type NamespacesMap = Readonly<Record<EndpointNamespace, (this: N8nApp) => void>>;
