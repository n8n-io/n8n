import { Entity, PrimaryColumn } from '@n8n/typeorm';

import { ObservationCursorColumns } from '@/modules/agents/entities/observation-cursor-columns';

@Entity({ name: 'instance_ai_observation_cursors' })
export class InstanceAiObservationCursor extends ObservationCursorColumns {
	@PrimaryColumn({ type: 'uuid' })
	observationScopeId: string;
}
