import {
	Column,
	Entity,
	Index,
	PrimaryColumn,
} from 'typeorm';

import {
	IWebhookDb,
 } from '../../Interfaces';

@Entity()
@Index(["webhookId", "method"])
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
