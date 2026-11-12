/**
 * Node types that reach their service without the n8n HTTP helpers (SMTP,
 * database clients, queues, SSH and similar). An HTTP-level simulator cannot
 * see their traffic. The workflow eval answers them with a node mock, and a
 * test run blocks them.
 */
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

/**
 * First-party nodes that a test run blocks on top of `NON_HTTP_NODE_TYPES`:
 * nodes that run code or commands, touch the local file system, start a
 * nested workflow that the tool hooks do not reach, or use a database or
 * mail client.
 */
const TEST_RUN_BLOCKED_NODE_TYPES: ReadonlyMap<string, string> = new Map([
	['n8n-nodes-base.code', 'Code can reach any service, so it cannot run in a test run yet.'],
	['n8n-nodes-base.function', 'Code can reach any service, so it cannot run in a test run yet.'],
	[
		'n8n-nodes-base.functionItem',
		'Code can reach any service, so it cannot run in a test run yet.',
	],
	['n8n-nodes-base.aiTransform', 'Code can reach any service, so it cannot run in a test run yet.'],
	['n8n-nodes-base.executeCommand', 'Shell commands can reach any service.'],
	['n8n-nodes-base.readWriteFile', 'This node changes files on the n8n host.'],
	['n8n-nodes-base.readBinaryFile', 'This node reads files on the n8n host.'],
	['n8n-nodes-base.readBinaryFiles', 'This node reads files on the n8n host.'],
	['n8n-nodes-base.writeBinaryFile', 'This node changes files on the n8n host.'],
	['n8n-nodes-base.executeWorkflow', 'A nested workflow does not run under the test run yet.'],
	[
		'n8n-nodes-base.emailReadImap',
		'This node does not use HTTP, so the simulator cannot answer it.',
	],
	['n8n-nodes-base.crateDb', 'This node does not use HTTP, so the simulator cannot answer it.'],
	['n8n-nodes-base.questDb', 'This node does not use HTTP, so the simulator cannot answer it.'],
	['n8n-nodes-base.timescaleDb', 'This node does not use HTTP, so the simulator cannot answer it.'],
	[
		'n8n-nodes-base.oracleDatabase',
		'This node does not use HTTP, so the simulator cannot answer it.',
	],
]);

/**
 * Why a node cannot run in a test run, or `undefined` when it can.
 *
 * Only first-party `n8n-nodes-base` nodes can run. They reach services through
 * the n8n HTTP helpers, which the simulator answers. Known exceptions are
 * blocked by type. Community and other third-party nodes are blocked, because
 * n8n cannot check how they reach a service.
 */
export function nodeSimulationGap(
	nodeType: string,
	parameters?: Record<string, unknown>,
): string | undefined {
	if (NON_HTTP_NODE_TYPES.has(nodeType)) {
		return 'This node does not use HTTP, so the simulator cannot answer it.';
	}
	const blocked = TEST_RUN_BLOCKED_NODE_TYPES.get(nodeType);
	if (blocked) return blocked;
	// AI nodes call their vendor through an SDK client, outside the HTTP helpers.
	if (nodeType.startsWith(LANGCHAIN_NODE_PREFIX)) {
		return 'AI nodes call their provider directly, so the simulator cannot answer them.';
	}
	if (!nodeType.startsWith(FIRST_PARTY_NODE_PREFIX)) {
		return 'Community nodes cannot run in a test run, because n8n cannot check what they send.';
	}
	if (parameters?.operation === 'sendAndWait') {
		return 'Send-and-wait waits for a real person to answer.';
	}
	return undefined;
}
