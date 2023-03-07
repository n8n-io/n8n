import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { idStringifier } from '../utils/transformers';

@Entity()
@Index(['webhookId', 'method', 'pathLength'])
export class WebhookEntity {
	@Column({ transformer: idStringifier })
	workflowId: string;

	@PrimaryColumn()
	webhookPath: string;

	@PrimaryColumn()
	method: string;

	@Column()
	node: string;

	@Column({ nullable: true })
	webhookId?: string;

	@Column({ nullable: true })
	pathLength?: number;
}
