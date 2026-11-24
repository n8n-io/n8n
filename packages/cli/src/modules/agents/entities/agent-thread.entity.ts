import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

@Entity({ name: 'agents_threads' })
export class AgentThreadEntity extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 255 })
	resourceId: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	title: string | null;

	@Column({ type: 'text', nullable: true })
	metadata: string | null;
}
