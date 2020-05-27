import {
	Column,
	Entity,
	Unique,
	PrimaryGeneratedColumn,
} from 'typeorm';

import {
	IWebhookDb,
 } from '../../';

@Entity()
@Unique(['webhookPath', 'method'])
export class WebhookEntity implements IWebhookDb {

	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	workflowId: number;

	@Column()
	webhookPath: string;

	@Column()
	method: string;

	@Column()
	node: string;
}
