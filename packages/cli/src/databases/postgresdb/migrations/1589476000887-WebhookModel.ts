import {
	MigrationInterface,
	QueryRunner,
} from 'typeorm';

import {
	IWorkflowDb,
	NodeTypes,
	WebhookHelpers,
} from '../../..';

import {
	Workflow,
} from 'n8n-workflow';

import {
	IWebhookDb,
} from '../../../Interfaces';

import * as config from '../../../../config';

export class WebhookModel1589476000887 implements MigrationInterface {
	name = 'WebhookModel1589476000887';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.get('database.tablePrefix');
		const tablePrefixIndex = tablePrefix;
		const schema = config.get('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`CREATE TABLE ${tablePrefix}webhook_entity ("workflowId" integer NOT NULL, "webhookPath" character varying NOT NULL, "method" character varying NOT NULL, "node" character varying NOT NULL, CONSTRAINT "PK_${tablePrefixIndex}b21ace2e13596ccd87dc9bf4ea6" PRIMARY KEY ("webhookPath", "method"))`, undefined);

		const workflows = await queryRunner.query(`SELECT * FROM ${tablePrefix}workflow_entity WHERE active=true`) as IWorkflowDb[];
		const data: IWebhookDb[] = [];
		const nodeTypes = NodeTypes();
		for (const workflow of workflows) {
			const workflowInstance = new Workflow({ id: workflow.id as string, name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, active: workflow.active, nodeTypes, staticData: workflow.staticData, settings: workflow.settings });
			const webhooks = WebhookHelpers.getWorkflowWebhooksBasic(workflowInstance);
			for (const webhook of webhooks) {
				data.push({
					workflowId: workflowInstance.id as string,
					webhookPath: webhook.path,
					method: webhook.httpMethod,
					node: webhook.node,
				 });
			}
		}

		if (data.length !== 0) {
			await queryRunner.manager.createQueryBuilder()
			.insert()
			.into(`${tablePrefix}webhook_entity`)
			.values(data)
			.execute();
		}
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.get('database.tablePrefix');
		const schema = config.get('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}
		await queryRunner.query(`DROP TABLE ${tablePrefix}webhook_entity`, undefined);
	}

}
