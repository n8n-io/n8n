import { Column, Entity } from '@n8n/typeorm';
import { WithTimestampsAndStringId } from '@n8n/db';

@Entity()
export class DynamicCredentialResolver extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'varchar', length: 128 })
	type: string;

	@Column({ type: 'text' })
	config: string;
}
