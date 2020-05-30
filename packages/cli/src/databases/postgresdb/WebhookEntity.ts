import {
	Column,
	Entity,
	PrimaryColumn,
} from 'typeorm';

import {
	IWebhookDb,
 } from '../../';

@Entity()
export class WebhookEntity implements IWebhookDb {

	@Column()
	workflowId: number;

	@PrimaryColumn()
	webhookPath: string;

	@PrimaryColumn()
	method: string;

	@Column()
	node: string;
}
