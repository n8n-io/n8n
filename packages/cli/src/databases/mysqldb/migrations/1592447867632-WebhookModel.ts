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

export class WebhookModel1592447867632 implements MigrationInterface {
	name = 'WebhookModel1592447867632';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${tablePrefix}webhook_entity (workflowId int NOT NULL, webhookPath varchar(255) NOT NULL, method varchar(255) NOT NULL, node varchar(255) NOT NULL, PRIMARY KEY (webhookPath, method)) ENGINE=InnoDB`);

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
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.query(`DROP TABLE ${tablePrefix}webhook_entity`);
	}
}
