import type { GitConnectionType, GitKeyGeneratorType } from '@n8n/api-types';
import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

@Entity('git_connection')
export class GitConnection extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'text' })
	repositoryUrl: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	branchName: string | null;

	@Column({ type: 'varchar', length: 16 })
	connectionType: GitConnectionType;

	/** SSH public key; set when {@link connectionType} is `ssh`, null for `https`. */
	@Column({ type: 'text', nullable: true })
	publicKey: string | null;

	/** Encrypted SSH private key; set when {@link connectionType} is `ssh`, null for `https`. */
	@Column({ type: 'text', nullable: true })
	encryptedPrivateKey: string | null;

	/** Encrypted HTTPS username; set when {@link connectionType} is `https`, null for `ssh`. */
	@Column({ type: 'text', nullable: true })
	encryptedUsername: string | null;

	/** Encrypted HTTPS password/token; set when {@link connectionType} is `https`, null for `ssh`. */
	@Column({ type: 'text', nullable: true })
	encryptedPassword: string | null;

	/** Algorithm used to generate the SSH key pair; null for `https`. */
	@Column({ type: 'varchar', length: 16, nullable: true })
	keyGeneratorType: GitKeyGeneratorType | null;

	/** Last commit successfully reconciled for this connection; the base for three-way reconciliation. */
	@Column({ type: 'varchar', length: 64, nullable: true })
	baseCommit: string | null;
}
