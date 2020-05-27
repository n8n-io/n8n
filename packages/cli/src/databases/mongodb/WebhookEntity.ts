import {
	Column,
	Entity,
	Unique,
	ObjectIdColumn,
	ObjectID,
} from 'typeorm';

import {
	IWebhookDb,
 } from '../../Interfaces';

@Entity()
@Unique(['webhookPath', 'method'])
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
