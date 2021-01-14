import {
	Column,
	Entity,
	PrimaryColumn,
	Index,
} from 'typeorm';

import {
	IWebhookDb,
 } from '../../';

@Entity()
@Index(["webhookId", "method"], { unique: true })
export class WebhookEntity implements IWebhookDb {

	@Column()
	workflowId: number;

	@PrimaryColumn()
	webhookPath: string;

	@PrimaryColumn()
	method: string;

	@Column()
	node: string;

	@Column({ nullable: true })
	webhookId: string;
}
