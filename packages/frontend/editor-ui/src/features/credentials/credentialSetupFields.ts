import { DOMAIN_RESTRICTION_FIELDS, type INodeProperties } from 'n8n-workflow';

const OAUTH_ADVANCED_FIELDS = [
	'sendAdditionalBodyProperties',
	'additionalBodyProperties',
	'authQueryParameters',
	'tokenExpiredStatusCode',
	'jweEnabled',
	'inlineJwks',
];

const CERTIFICATE_OVERRIDE_TYPES = new Set([
	'dfirIrisApi',
	'elasticsearchApi',
	'erpNextApi',
	'gotifyApi',
	'imap',
	'kafka',
	'ldap',
	'mattermostApi',
	'microsoftSql',
	'mispApi',
	'oAuth2Api',
	'postgres',
	'redis',
	's3',
	'splunkApi',
	'theHiveApi',
	'theHiveProjectApi',
	'timescaleDb',
	'wordpressApi',
	'zammadBasicAuthApi',
	'zammadTokenAuthApi',
]);
const CERTIFICATE_OVERRIDE_FIELDS = new Set([
	'allowUnauthorizedCerts',
	'ignoreSSLIssues',
	'skipSslCertificateValidation',
	'disableTlsVerification',
]);

const ADVANCED_FIELDS_BY_TYPE: Record<string, readonly string[]> = {
	anthropicApi: ['url', 'header'],
	aws: ['customEndpoints'],
	awsAssumeRole: ['customEndpoints', 'roleSessionName'],
	azureEntraCognitiveServicesOAuth2Api: ['apiVersion', 'endpoint'],
	azureOpenAiApi: ['apiVersion', 'endpoint'],
	boxOAuth2Api: ['signingKeySecondary'],
	chromaCloudApi: ['tenant', 'database', 'baseUrl'],
	githubApi: ['server'],
	githubAppApi: ['server'],
	githubOAuth2Api: ['server'],
	googlePalmApi: ['host'],
	ldap: ['timeout'],
	mcpOAuth2Api: ['resourceUrl'],
	microsoftSql: ['connectTimeout', 'requestTimeout', 'tdsVersion'],
	mqtt: ['clean', 'clientId'],
	mySql: ['connectTimeout'],
	openAiApi: ['url', 'organizationId', 'header'],
	oracleDBApi: [
		'privilege',
		'sslServerDNMatch',
		'sslAllowWeakDNMatch',
		'poolMin',
		'poolMax',
		'poolIncrement',
		'maxLifetimeSession',
		'poolTimeout',
		'connectionClass',
		'connectTimeout',
		'transportConnectTimeout',
		'expireTime',
	],
	postgres: ['maxConnections'],
	qualysApi: ['requestedWith'],
	smtp: ['disableStartTls', 'hostName'],
	snowflake: ['clientSessionKeepAlive'],
	snowflakeOAuth2Api: ['clientSessionKeepAlive'],
	telegramApi: ['baseUrl'],
	totpApi: ['label'],
	vercelAiGatewayApi: ['url'],
	wooCommerceApi: ['includeCredentialsInQuery'],
};

export function groupCredentialSetupFields(
	credentialType: string,
	parentTypes: readonly string[],
	fields: readonly INodeProperties[],
): { inline: INodeProperties[]; advanced: INodeProperties[] } {
	const types = [credentialType, ...parentTypes];
	const advancedNames = new Set([
		...DOMAIN_RESTRICTION_FIELDS.map(({ name }) => name),
		...types.flatMap((type) => ADVANCED_FIELDS_BY_TYPE[type] ?? []),
	]);
	if (types.includes('oAuth2Api')) {
		for (const name of OAUTH_ADVANCED_FIELDS) advancedNames.add(name);
		// Snowflake scopes select the account role and belong with connection setup.
		if (!types.includes('snowflakeOAuth2Api')) advancedNames.add('customScopes');
	}
	if (types.some((type) => CERTIFICATE_OVERRIDE_TYPES.has(type))) {
		for (const field of fields) {
			if (
				CERTIFICATE_OVERRIDE_FIELDS.has(field.name) &&
				field.type === 'boolean' &&
				field.default === false
			) {
				advancedNames.add(field.name);
			}
		}
	}

	const inline: INodeProperties[] = [];
	const advanced: INodeProperties[] = [];
	for (const field of fields) {
		// Keep optional controls with the fields and notices they enable.
		// A false condition can expose core setup, such as PostgreSQL SSL.
		const followsAdvancedControl = Object.entries(field.displayOptions?.show ?? {}).some(
			([name, values]) => advancedNames.has(name) && values?.includes(true),
		);
		(advancedNames.has(field.name) || followsAdvancedControl ? advanced : inline).push(field);
	}
	return { inline, advanced };
}
