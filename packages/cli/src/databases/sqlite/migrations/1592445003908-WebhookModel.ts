import {
	MigrationInterface,
	QueryRunner,
} from 'typeorm';

import * as config from '../../../../config';

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

export class WebhookModel1592445003908 implements MigrationInterface {
	name = 'WebhookModel1592445003908';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${tablePrefix}webhook_entity ("workflowId" integer NOT NULL, "webhookPath" varchar NOT NULL, "method" varchar NOT NULL, "node" varchar NOT NULL, PRIMARY KEY ("webhookPath", "method"))`);

		const workflows = await queryRunner.query(`SELECT * FROM ${tablePrefix}workflow_entity WHERE active=true`) as IWorkflowDb[];
		const data: IWebhookDb[] = [];
		const nodeTypes = NodeTypes();
		for (const workflow of workflows) {
			workflow.nodes = JSON.parse(workflow.nodes as unknown as string);
			workflow.connections = JSON.parse(workflow.connections as unknown as string);
			workflow.staticData = JSON.parse(workflow.staticData as unknown as string);
			workflow.settings = JSON.parse(workflow.settings as unknown as string);
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
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.query(`DROP TABLE ${tablePrefix}webhook_entity`);
	}
}
