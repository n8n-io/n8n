import { aquariumSecurityRiskSchema, type AquariumSecurityRisk } from '@n8n/api-types';
import { getChildNodes, type IConnections, type INode } from 'n8n-workflow';

// These checks follow the security audit in `packages/cli/src/security-audit`. A module cannot
// import from the CLI package, so the node type lists are copied here.

const WEBHOOK_NODE_TYPE = 'n8n-nodes-base.webhook';

/** A node of these types right after a webhook can validate the payload. */
const WEBHOOK_VALIDATOR_NODE_TYPES = new Set([
	'n8n-nodes-base.if',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.code',
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
]);

const SQL_NODE_TYPES = new Set([
	'n8n-nodes-base.postgres',
	'n8n-nodes-base.crateDb',
	'n8n-nodes-base.questDb',
	'n8n-nodes-base.timescaleDb',
	'n8n-nodes-base.mySql',
	'n8n-nodes-base.microsoftSql',
	'n8n-nodes-base.snowflake',
]);

/** The audit also lists Code and HTTP Request as risky. Almost every workflow has them. */
const SHELL_NODE_TYPES = new Set(['n8n-nodes-base.executeCommand', 'n8n-nodes-base.ssh']);

export interface CheckedWorkflow {
	nodes: INode[];
	connections: IConnections;
	activeVersionId?: string | null;
}

function hasValidatorChild(webhook: INode, workflow: CheckedWorkflow): boolean {
	const childNames = new Set(getChildNodes(workflow.connections, webhook.name, 'main', 1));
	return workflow.nodes.some(
		(node) => childNames.has(node.name) && WEBHOOK_VALIDATOR_NODE_TYPES.has(node.type),
	);
}

function isUnprotectedWebhook(node: INode, workflow: CheckedWorkflow): boolean {
	// Only a published workflow listens on its production webhook URL.
	return (
		node.type === WEBHOOK_NODE_TYPE &&
		Boolean(workflow.activeVersionId) &&
		node.parameters.authentication === undefined &&
		!hasValidatorChild(node, workflow)
	);
}

function hasSqlExpression(node: INode): boolean {
	const { operation, query } = node.parameters;
	return (
		SQL_NODE_TYPES.has(node.type) &&
		operation === 'executeQuery' &&
		typeof query === 'string' &&
		query.startsWith('=')
	);
}

/** Returns each risk of the workflow once, in the order of the schema. */
export function securityRisksOf(workflow: CheckedWorkflow): AquariumSecurityRisk[] {
	const risks = new Set<AquariumSecurityRisk>();
	for (const node of workflow.nodes) {
		if (isUnprotectedWebhook(node, workflow)) risks.add('unprotectedWebhook');
		if (hasSqlExpression(node)) risks.add('sqlExpression');
		if (SHELL_NODE_TYPES.has(node.type)) risks.add('shellAccess');
	}
	return aquariumSecurityRiskSchema.options.filter((risk) => risks.has(risk));
}
