export type ElasticSecurityApiCredentials = {
	username: string;
	password: string;
	baseUrl: string;
};

export type ConnectorType = '.jira' | '.servicenow' | '.resilient';

export type Connector = {
	id: string;
	name: string;
	connector_type_id: ConnectorType
};

export type ConnectorCreatePayload =
	| ServiceNowConnectorCreatePayload
	| JiraConnectorCreatePayload
	| IbmResilientConnectorCreatePayload;

type ServiceNowConnectorCreatePayload = {
	connector_type_id: '.servicenow',
	name: string,
	secrets?: {
		username: string;
		password: string;
	},
	config?: {
		apiUrl: string;
	},
};

type JiraConnectorCreatePayload = {
	connector_type_id: '.jira',
	name: string,
	secrets?: {
		email: string;
		apiToken: string;
	},
	config?: {
		apiUrl: string;
		projectKey: string;
	},
};

type IbmResilientConnectorCreatePayload = {
	connector_type_id: '.resilient',
	name: string,
	secrets?: {
		apiKeyId: string;
		apiKeySecret: string;
	},
	config?: {
		apiUrl: string;
		orgId: string;
	},
};
