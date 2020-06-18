import {
	Column,
	Entity,
	Index,
} from 'typeorm';

import {
	IWebhookDb,
 } from '../../Interfaces';

@Entity()
@Index(['webhookPath', 'method'], { unique: true })
export class WebhookEntity implements IWebhookDb {

	@Column()
	workflowId: number;

	@Column()
	webhookPath: string;

	@Column()
	method: string;

	@Column()
	node: string;
}
