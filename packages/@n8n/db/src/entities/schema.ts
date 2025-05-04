import { Column, Entity } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from './abstract-entity';

@Entity()
export class Schema extends WithTimestampsAndStringId {
	@Column()
	name: string;

	@Column({ nullable: true })
	definition: string | null;
}
