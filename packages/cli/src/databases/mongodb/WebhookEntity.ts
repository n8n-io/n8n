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
}
