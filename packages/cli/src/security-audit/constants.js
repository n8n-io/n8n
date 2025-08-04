'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.NPM_PACKAGE_URL =
	exports.COMMUNITY_NODES_RISKS_URL =
	exports.DB_QUERY_PARAMS_DOCS_URL =
	exports.ENV_VARS_DOCS_URL =
	exports.INSTANCE_REPORT =
	exports.NODES_REPORT =
	exports.FILESYSTEM_REPORT =
	exports.CREDENTIALS_REPORT =
	exports.DATABASE_REPORT =
	exports.OFFICIAL_RISKY_NODE_TYPES =
	exports.FILESYSTEM_INTERACTION_NODE_TYPES =
	exports.WEBHOOK_VALIDATOR_NODE_TYPES =
	exports.WEBHOOK_NODE_TYPE =
	exports.SQL_NODE_TYPES =
	exports.SQL_NODE_TYPES_WITH_QUERY_PARAMS =
	exports.RISK_CATEGORIES =
		void 0;
exports.RISK_CATEGORIES = ['credentials', 'database', 'nodes', 'instance', 'filesystem'];
exports.SQL_NODE_TYPES_WITH_QUERY_PARAMS = new Set([
	'n8n-nodes-base.postgres',
	'n8n-nodes-base.crateDb',
	'n8n-nodes-base.questDb',
	'n8n-nodes-base.timescaleDb',
]);
exports.SQL_NODE_TYPES = new Set([
	...exports.SQL_NODE_TYPES_WITH_QUERY_PARAMS,
	'n8n-nodes-base.mySql',
	'n8n-nodes-base.microsoftSql',
	'n8n-nodes-base.snowflake',
]);
exports.WEBHOOK_NODE_TYPE = 'n8n-nodes-base.webhook';
exports.WEBHOOK_VALIDATOR_NODE_TYPES = new Set([
	'n8n-nodes-base.if',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.code',
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
]);
exports.FILESYSTEM_INTERACTION_NODE_TYPES = new Set([
	'n8n-nodes-base.readPdf',
	'n8n-nodes-base.readBinaryFile',
	'n8n-nodes-base.readBinaryFiles',
	'n8n-nodes-base.spreadsheetFile',
	'n8n-nodes-base.writeBinaryFile',
]);
exports.OFFICIAL_RISKY_NODE_TYPES = new Set([
	'n8n-nodes-base.executeCommand',
	'n8n-nodes-base.code',
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.ssh',
	'n8n-nodes-base.ftp',
]);
exports.DATABASE_REPORT = {
	RISK: 'database',
	SECTIONS: {
		EXPRESSIONS_IN_QUERIES: 'Expressions in "Execute Query" fields in SQL nodes',
		EXPRESSIONS_IN_QUERY_PARAMS: 'Expressions in "Query Parameters" fields in SQL nodes',
		UNUSED_QUERY_PARAMS: 'Unused "Query Parameters" fields in SQL nodes',
	},
};
exports.CREDENTIALS_REPORT = {
	RISK: 'credentials',
	SECTIONS: {
		CREDS_NOT_IN_ANY_USE: 'Credentials not used in any workflow',
		CREDS_NOT_IN_ACTIVE_USE: 'Credentials not used in any active workflow',
		CREDS_NOT_RECENTLY_EXECUTED: 'Credentials not used in recently executed workflows',
	},
};
exports.FILESYSTEM_REPORT = {
	RISK: 'filesystem',
	SECTIONS: {
		FILESYSTEM_INTERACTION_NODES: 'Nodes that interact with the filesystem',
	},
};
exports.NODES_REPORT = {
	RISK: 'nodes',
	SECTIONS: {
		OFFICIAL_RISKY_NODES: 'Official risky nodes',
		COMMUNITY_NODES: 'Community nodes',
		CUSTOM_NODES: 'Custom nodes',
	},
};
exports.INSTANCE_REPORT = {
	RISK: 'instance',
	SECTIONS: {
		UNPROTECTED_WEBHOOKS: 'Unprotected webhooks in instance',
		OUTDATED_INSTANCE: 'Outdated instance',
		SECURITY_SETTINGS: 'Security settings',
	},
};
exports.ENV_VARS_DOCS_URL = 'https://docs.n8n.io/reference/environment-variables.html';
exports.DB_QUERY_PARAMS_DOCS_URL =
	'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres#use-query-parameters';
exports.COMMUNITY_NODES_RISKS_URL = 'https://docs.n8n.io/integrations/community-nodes/risks';
exports.NPM_PACKAGE_URL = 'https://www.npmjs.com/package';
//# sourceMappingURL=constants.js.map
