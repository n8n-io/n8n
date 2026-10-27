import { DateTimeColumn, JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

/** The source types that have a client. */
export type SkillSourceType = 'github';

/** Health of a source, set by the last check. */
export type SkillSourceStatus = 'connected' | 'credential_expired' | 'unreachable' | 'delayed';

/** A value that only the client of the source type reads. The core stores it as JSON. */
export type OpaqueSourceValue = Record<string, unknown>;

/**
 * One remote location, such as a GitHub repository, connected in one scope: a project (team or
 * personal) or Global (`projectId` null). Its synced skills have the same scope. The table is
 * `skill_source`: the api type `SkillSource` names how a skill was created.
 *
 * Two partial unique indexes keep one source for each `identityKey` in each scope. The
 * migration creates them.
 */
@Entity({ name: 'skill_source' })
export class SkillSourceConnection extends WithTimestamps {
	@PrimaryColumn({ type: 'uuid' })
	id: string;

	@Column({ type: 'varchar', length: 16 })
	type: SkillSourceType;

	@JsonColumn()
	locator: OpaqueSourceValue;

	/** Source type, host, owner and repository in lower case. The duplicate rules compare it. */
	@Column({ type: 'varchar', length: 255 })
	identityKey: string;

	@Index()
	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	/** Null for public access, and after the credential is deleted. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	credentialId: string | null;

	@Column({ type: 'varchar', length: 32, default: 'connected' })
	status: SkillSourceStatus;

	@Column({ type: 'text', nullable: true })
	probeCursor: string | null;

	@DateTimeColumn({ nullable: true })
	lastCheckedAt: Date | null;

	/** Reason code of the last failed check. */
	@Column({ type: 'varchar', length: 32, nullable: true })
	lastErrorReason: string | null;

	/** The check task reads the Skill Sync flag of this user. */
	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;
}
