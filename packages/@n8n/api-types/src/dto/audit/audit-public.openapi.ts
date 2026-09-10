import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

import type { SecurityAuditReport } from '../../schemas/security-audit.schema';

/**
 * Descriptions and examples carried over from the hand-written `audit.yml` the decorator route
 * replaced. Four `recommendation` values were split across two YAML flow entries there, so the
 * second half parsed as a key with a `null` value; they are joined back into one sentence here.
 */
export const auditReportExamples: Record<
	'credentials' | 'database' | 'filesystem' | 'nodes' | 'instance',
	SecurityAuditReport
> = {
	credentials: {
		risk: 'credentials',
		sections: [
			{
				title: 'Credentials not used in any workflow',
				description:
					'These credentials are not used in any workflow. Keeping unused credentials in your instance is an unneeded security risk.',
				recommendation: 'Consider deleting these credentials if you no longer need them.',
				location: [{ kind: 'credential', id: '1', name: 'My Test Account' }],
			},
		],
	},
	database: {
		risk: 'database',
		sections: [
			{
				title: 'Expressions in "Execute Query" fields in SQL nodes',
				description:
					'This SQL node has an expression in the "Query" field of an "Execute Query" operation. Building a SQL query with an expression may lead to a SQL injection attack.',
				recommendation:
					'Consider using the "Query Parameters" field to pass parameters to the query, or validating the input of the expression in the "Query" field.',
				location: [
					{
						kind: 'node',
						workflowId: '1',
						workflowName: 'My Workflow',
						nodeId: '51eb5852-ce0b-4806-b4ff-e41322a4041a',
						nodeName: 'MySQL',
						nodeType: 'n8n-nodes-base.mySql',
					},
				],
			},
		],
	},
	filesystem: {
		risk: 'filesystem',
		sections: [
			{
				title: 'Nodes that interact with the filesystem',
				description:
					'This node reads from and writes to any accessible file in the host filesystem. Sensitive file content may be manipulated through a node operation.',
				recommendation:
					'Consider protecting any sensitive files in the host filesystem, or refactoring the workflow so that it does not require host filesystem interaction.',
				location: [
					{
						kind: 'node',
						workflowId: '1',
						workflowName: 'My Workflow',
						nodeId: '51eb5852-ce0b-4806-b4ff-e41322a4041a',
						nodeName: 'Ready Binary file',
						nodeType: 'n8n-nodes-base.readBinaryFile',
					},
				],
			},
		],
	},
	nodes: {
		risk: 'nodes',
		sections: [
			{
				title: 'Community nodes',
				description:
					'This node is sourced from the community. Community nodes are not vetted by the n8n team and have full access to the host system.',
				recommendation:
					'Consider reviewing the source code in any community nodes installed in this n8n instance, and uninstalling any community nodes no longer used.',
				location: [
					{
						kind: 'community',
						nodeType: 'n8n-nodes-test.test',
						packageUrl: 'https://www.npmjs.com/package/n8n-nodes-test',
					},
				],
			},
		],
	},
	// The `risk` and `location` of the carried-over example named a category and a location kind
	// that `InstanceRiskReporter` never emits; both now match what it flags.
	instance: {
		risk: 'instance',
		sections: [
			{
				title: 'Unprotected webhooks in instance',
				description:
					'These webhook nodes have the "Authentication" field set to "None" and are not directly connected to a node to validate the payload. Every unprotected webhook allows your workflow to be called by any third party who knows the webhook URL.',
				recommendation:
					'Consider setting the "Authentication" field to an option other than "None", or validating the payload with one of the following nodes.',
				location: [
					{
						kind: 'node',
						workflowId: '1',
						workflowName: 'My Workflow',
						nodeId: '51eb5852-ce0b-4806-b4ff-e41322a4041a',
						nodeName: 'Webhook',
						nodeType: 'n8n-nodes-base.webhook',
					},
				],
			},
		],
	},
};

export const daysAbandonedWorkflowOpenApi: ZodOpenAPIMetadata = {
	description: 'Days for a workflow to be considered abandoned if not executed',
};

export const noRisksFoundOpenApi: ZodOpenAPIMetadata = {
	description: 'An empty array, returned in place of the report object when no risk was found.',
};
