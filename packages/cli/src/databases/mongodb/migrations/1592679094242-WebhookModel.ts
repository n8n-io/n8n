import {
	MigrationInterface,
} from 'typeorm';

import {
	IWorkflowDb,
	NodeTypes,
	WebhookHelpers,
} from '../../..';

import {
	Workflow,
} from 'n8n-workflow/dist/src/Workflow';

import {
	IWebhookDb,
} from '../../../Interfaces';

import * as config from '../../../../config';

import {
	MongoQueryRunner,
} from 'typeorm/driver/mongodb/MongoQueryRunner';

export class WebhookModel1592679094242 implements MigrationInterface {
	name = 'WebhookModel1592679094242';

	async up(queryRunner: MongoQueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		const workflows = await queryRunner.cursor( `${tablePrefix}workflow_entity`, { active: true }).toArray() as IWorkflowDb[];
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
			await queryRunner.manager.insertMany(`${tablePrefix}webhook_entity`, data);
		}

		await queryRunner.manager.createCollectionIndex(`${tablePrefix}webhook_entity`, ['webhookPath',  'method'], { unique: true, background: false });
	}

	async down(queryRunner: MongoQueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.dropTable(`${tablePrefix}webhook_entity`);
	}
}
