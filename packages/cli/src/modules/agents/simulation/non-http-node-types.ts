/** Nodes that bypass the n8n HTTP helpers. The workflow eval mocks them; test runs block them. */
export const NON_HTTP_NODE_TYPES: ReadonlySet<string> = new Set([
	'n8n-nodes-base.redis',
	'n8n-nodes-base.mongoDb',
	'n8n-nodes-base.mySql',
	'n8n-nodes-base.postgres',
	'n8n-nodes-base.microsoftSql',
	'n8n-nodes-base.snowflake',
	'n8n-nodes-base.kafka',
	'n8n-nodes-base.rabbitmq',
	'n8n-nodes-base.mqtt',
	'n8n-nodes-base.amqp',
	'n8n-nodes-base.ftp',
	'n8n-nodes-base.ssh',
	'n8n-nodes-base.ldap',
	'n8n-nodes-base.emailSend',
	'n8n-nodes-base.rssFeedRead',
	'n8n-nodes-base.git',
]);

const FIRST_PARTY_NODE_PREFIX = 'n8n-nodes-base.';
const LANGCHAIN_NODE_PREFIX = '@n8n/n8n-nodes-langchain.';

const NO_HTTP = 'This node does not use HTTP, so the simulator cannot answer it.';
const RUNS_CODE = 'This node can run code that reaches any service.';
const HOST_FILES = 'This node uses files on the n8n host.';

const blockAll = (names: string[], reason: string) =>
	names.map((name): [string, string] => [`${FIRST_PARTY_NODE_PREFIX}${name}`, reason]);

// Blocked in test runs on top of NON_HTTP_NODE_TYPES.
const TEST_RUN_BLOCKED_NODE_TYPES: ReadonlyMap<string, string> = new Map([
	...blockAll(['code', 'function', 'functionItem', 'aiTransform', 'executeCommand'], RUNS_CODE),
	...blockAll(
		['readWriteFile', 'readBinaryFile', 'readBinaryFiles', 'writeBinaryFile'],
		HOST_FILES,
	),
	...blockAll(['emailReadImap', 'crateDb', 'questDb', 'timescaleDb', 'oracleDatabase'], NO_HTTP),
	...blockAll(['executeWorkflow'], 'Nested workflows do not run under the test run yet.'),
]);

/**
 * Why a node cannot run in a test run, or `undefined` when it can. Only first-party nodes run:
 * they use the HTTP helpers the simulator answers. n8n cannot check community nodes.
 */
export function nodeSimulationGap(
	nodeType: string,
	parameters?: Record<string, unknown>,
): string | undefined {
	if (NON_HTTP_NODE_TYPES.has(nodeType)) return NO_HTTP;
	const blocked = TEST_RUN_BLOCKED_NODE_TYPES.get(nodeType);
	if (blocked) return blocked;
	// AI nodes call their vendor through an SDK client.
	if (nodeType.startsWith(LANGCHAIN_NODE_PREFIX)) {
		return 'AI nodes call their provider directly, so the simulator cannot answer them.';
	}
	if (!nodeType.startsWith(FIRST_PARTY_NODE_PREFIX)) {
		return 'Community nodes cannot run in a test run, because n8n cannot check what they send.';
	}
	if (parameters?.operation === 'sendAndWait') return 'Send-and-wait waits for a real person.';
	return undefined;
}
