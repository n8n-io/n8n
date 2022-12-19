/* eslint-disable @typescript-eslint/no-use-before-define */
import { LoggerProxy } from 'n8n-workflow';
import { BaseCommand } from '../BaseCommand';
import { getLogger } from '@/Logger';
import * as Db from '@/Db';

export class SecurityAuditCommand extends BaseCommand {
	static description = 'Generate a security audit report for this n8n instance';

	static examples = ['$ n8n security:audit'];

	async run() {
		const logger = getLogger();
		LoggerProxy.init(logger);

		const sqlInjectionRiskReport = await generateSqlInjectionRiskReport();
		console.log(sqlInjectionRiskReport);

		this.logger.info('Successfully generated security audit report');
		process.exit();
	}

	async catch(error: Error): Promise<void> {
		this.logger.error('Failed to generate security audit report');
		this.logger.error(error.message);
		this.exit(1);
	}
}

type RiskySqlWorkflow = {
	workflowId: string;
	workflowName: string;
	nodeId: string;
	nodeName: string;
	nodeType: string;
};

const SQL_NODES = [
	'n8n-nodes-base.postgres',
	'n8n-nodes-base.mySql',
	'n8n-nodes-base.microsoftSql',
	'n8n-nodes-base.crateDb',
	'n8n-nodes-base.questDb',
	'n8n-nodes-base.snowflake',
	'n8n-nodes-base.timescaleDb',
];

async function generateSqlInjectionRiskReport() {
	const workflows = await Db.collections.Workflow.find();

	const riskySqlWorkflows = workflows.reduce<RiskySqlWorkflow[]>((acc, workflow) => {
		workflow.nodes.forEach((node) => {
			if (
				SQL_NODES.includes(node.type) &&
				node.parameters !== undefined &&
				node.parameters.operation === 'executeQuery' &&
				typeof node.parameters.query === 'string' &&
				node.parameters.query.startsWith('=')
			) {
				acc.push({
					workflowId: workflow.id.toString(),
					workflowName: workflow.name,
					nodeId: node.id,
					nodeName: node.name,
					nodeType: node.type,
				});
			}
		});

		return acc;
	}, []);

	if (riskySqlWorkflows.length === 0) return null;

	return {
		risk: 'SQL injection risk',
		description:
			'The following workflows contain at least one SQL node whose Execute Query field uses expression. This is a security risk as the expression will be evaluated with arbitrary data and the result will be used as the query. This can lead to SQL injection attacks.',
		workflows: riskySqlWorkflows,
	};
}
