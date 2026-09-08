import { Column, Entity } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';

@Entity()
export class DeploymentKey extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 64 })
	type: string;

	@Column('text')
	value: string;

	@Column({ type: 'varchar', length: 20, nullable: true })
	algorithm: string | null;

	@Column({ type: 'varchar', length: 20 })
	status: string;
}
