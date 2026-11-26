import { WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

/** A file that belongs to one skill version. */
@Entity({ name: 'skill_file' })
export class SkillFile extends WithTimestamps {
	@PrimaryColumn({ type: 'uuid' })
	skillVersionId: string;

	@PrimaryColumn({ type: 'varchar', length: 512 })
	path: string;

	@Column({ type: 'text' })
	content: string;

	@Column({
		type: 'boolean',
		default: false,
		comment: 'Content holds Base64 instead of UTF-8 text',
	})
	isBinary: boolean;
}
