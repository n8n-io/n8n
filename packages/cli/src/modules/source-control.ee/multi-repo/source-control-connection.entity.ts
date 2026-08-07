import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, OneToMany } from '@n8n/typeorm';

import type { SourceControlScope } from './source-control-scope.entity';

export type SourceControlConnectionType = 'ssh' | 'https';

/**
 * A source control connection = one (repository, branch) with its own auth,
 * SSH key material and git working directory. Multi-repo counterpart of the
 * legacy singleton preferences blob (LIGO-923 POC).
 */
@Entity()
@Index(['repositoryUrl', 'branchName'], { unique: true })
export class SourceControlConnection extends WithTimestampsAndStringId {
	@Column()
	repositoryUrl: string;

	@Column({ default: 'main' })
	branchName: string;

	@Column({ default: false })
	branchReadOnly: boolean;

	@Column({ default: '#5296D6' })
	branchColor: string;

	@Column({ type: 'varchar', length: 16 })
	connectionType: SourceControlConnectionType;

	@Column({ default: false })
	connected: boolean;

	@Column({ type: 'text', nullable: true })
	publicKey: string | null;

	@Column({ type: 'text', nullable: true })
	encryptedPrivateKey: string | null;

	@Column({ type: 'text', nullable: true })
	encryptedUsername: string | null;

	@Column({ type: 'text', nullable: true })
	encryptedPassword: string | null;

	@OneToMany('SourceControlScope', 'connection')
	scopes: SourceControlScope[];
}
