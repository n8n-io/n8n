import { WithTimestamps, JsonColumn } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'instance_ai_resources' })
export class InstanceAiResource extends WithTimestamps {
	@PrimaryColumn('varchar')
	id: string;

	@Column({ type: 'text', nullable: true })
	workingMemory: string | null;

	@JsonColumn({ nullable: true })
	metadata: Record<string, unknown> | null;
}
