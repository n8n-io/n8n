import { WithTimestamps, DateTimeColumn, JsonColumn } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'instance_ai_observational_memory' })
@Index('IDX_instance_ai_om_scope_thread_resource', ['scope', 'threadId', 'resourceId'], {
	unique: true,
})
export class InstanceAiObservationalMemory extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	id: string;

	@Index()
	@Column({ type: 'varchar', length: 255 })
	lookupKey: string;

	@Column({ type: 'varchar', length: 16 })
	scope: string;

	@Column({ type: 'uuid', nullable: true })
	threadId: string | null;

	@Column({ type: 'varchar', length: 255 })
	resourceId: string;

	@Column({ type: 'text', default: '' })
	activeObservations: string;

	@Column({ type: 'varchar', length: 32 })
	originType: string;

	@Column({ type: 'text' })
	config: string;

	@Column({ type: 'int', default: 0 })
	generationCount: number;

	@DateTimeColumn({ nullable: true })
	lastObservedAt: Date | null;

	@Column({ type: 'int', default: 0 })
	pendingMessageTokens: number;

	@Column({ type: 'int', default: 0 })
	totalTokensObserved: number;

	@Column({ type: 'int', default: 0 })
	observationTokenCount: number;

	@Column({ type: 'boolean', default: false })
	isObserving: boolean;

	@Column({ type: 'boolean', default: false })
	isReflecting: boolean;

	@JsonColumn({ nullable: true })
	observedMessageIds: string[] | null;

	@Column({ type: 'varchar', nullable: true })
	observedTimezone: string | null;

	@Column({ type: 'text', nullable: true })
	bufferedObservations: string | null;

	@Column({ type: 'int', nullable: true })
	bufferedObservationTokens: number | null;

	@JsonColumn({ nullable: true })
	bufferedMessageIds: string[] | null;

	@Column({ type: 'text', nullable: true })
	bufferedReflection: string | null;

	@Column({ type: 'int', nullable: true })
	bufferedReflectionTokens: number | null;

	@Column({ type: 'int', nullable: true })
	bufferedReflectionInputTokens: number | null;

	@Column({ type: 'int', nullable: true })
	reflectedObservationLineCount: number | null;

	@JsonColumn({ nullable: true })
	bufferedObservationChunks: unknown[] | null;

	@Column({ type: 'boolean', default: false })
	isBufferingObservation: boolean;

	@Column({ type: 'boolean', default: false })
	isBufferingReflection: boolean;

	@Column({ type: 'int', default: 0 })
	lastBufferedAtTokens: number;

	@DateTimeColumn({ nullable: true })
	lastBufferedAtTime: Date | null;

	@JsonColumn({ nullable: true })
	metadata: Record<string, unknown> | null;
}
