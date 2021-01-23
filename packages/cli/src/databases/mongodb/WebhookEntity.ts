import {
	Column,
	Entity,
	Index,
	ObjectID,
	ObjectIdColumn,
} from 'typeorm';

import {
	IWebhookDb,
 } from '../../Interfaces';

@Entity()
@Index(["webhookPath", "method"], { unique: true })
@Index(["webhookId", "method"], { unique: true })
export class WebhookEntity implements IWebhookDb {

	@ObjectIdColumn()
	id: ObjectID;

	@Column()
	workflowId: number;

	@Column()
	webhookPath: string;

	@Column()
	method: string;

	@Column()
	node: string;

	@Column()
	webhookId: string;

	@Column({ nullable: true })
	pathLength: number;
}
