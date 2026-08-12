import { Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

/**
 * A file uploaded to a project — a first-class project asset alongside data
 * tables. Bytes live in `BinaryDataService`; this row holds only metadata and
 * the reference needed to resolve them.
 *
 * Names are unique per project, so a name is a stable handle a future
 * expression layer can resolve without an id.
 */
@Entity()
@Index(['projectId', 'name'], { unique: true })
export class ProjectFile extends WithTimestampsAndStringId {
	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project>;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	/** Sanitized display name, unique within the project. */
	@Column({ type: 'varchar', length: 255 })
	name: string;

	@Column({ type: 'varchar', length: 255 })
	mimeType: string;

	/** Bounded below 2 GiB by `ProjectFilesConfig.maxFileSize` — this is an `int` column. */
	@Column({ type: 'int' })
	fileSizeBytes: number;

	/**
	 * Opaque `BinaryDataService` reference, mode-prefixed
	 * (e.g. `filesystem-v2:projects/<projectId>/files/binary_data/<uuid>`).
	 *
	 * Must never be sent to a client: `GET /rest/binary-data?id=` is
	 * authenticated but performs no ownership check, so a leaked reference is a
	 * cross-project file read for any user on the instance.
	 *
	 * Not a DB FK — `binary_data` only has rows in `database` storage mode.
	 */
	@Column({ type: 'text' })
	binaryDataId: string;

	/**
	 * Actor attribution. The actor *type* is derived rather than stored: a
	 * workflow id set means a workflow, a user id set means a user, neither set
	 * means the original actor is no longer resolvable (both FKs are
	 * `SET NULL`). The workflow columns exist so the Project File node lands
	 * without an FK migration against a populated table; nothing writes them
	 * yet.
	 */
	@Column({ type: 'uuid', nullable: true })
	createdById: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	createdByWorkflowId: string | null;

	@Column({ type: 'uuid', nullable: true })
	updatedById: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	updatedByWorkflowId: string | null;
}
