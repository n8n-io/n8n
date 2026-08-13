import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

// Defined inline so this DB-layer entity stays self-contained; the shared
// @n8n/api-types DTOs that own these unions arrive in a later PR.
type GitConnectionType = 'ssh' | 'https';
type GitKeyGeneratorType = 'ed25519' | 'rsa';

@Entity('project_git_connection')
export class ProjectGitConnection extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'text' })
	repositoryUrl: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	branchName: string | null;

	@Column({ type: 'varchar', length: 16 })
	connectionType: GitConnectionType;

	@Column({ type: 'boolean', default: false })
	connected: boolean;

	@Column({ type: 'text', nullable: true })
	publicKey: string | null;

	@Column({ type: 'text', nullable: true })
	encryptedPrivateKey: string | null;

	@Column({ type: 'text', nullable: true })
	encryptedUsername: string | null;

	@Column({ type: 'text', nullable: true })
	encryptedPassword: string | null;

	@Column({ type: 'varchar', length: 16, nullable: true })
	keyGeneratorType: GitKeyGeneratorType | null;

	@Column({ type: 'varchar', length: 64, nullable: true })
	baseCommit: string | null;
}
