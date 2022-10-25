import { Entity, ManyToOne, PrimaryColumn, RelationId } from 'typeorm';
import { WorkflowEntity } from './WorkflowEntity';
import { CredentialsEntity } from './CredentialsEntity';
import { AbstractEntity } from './AbstractEntity';

@Entity()
export class CredentialUsage extends AbstractEntity {
	@ManyToOne(() => WorkflowEntity, {
		onDelete: 'CASCADE',
	})
	workflow: WorkflowEntity;

	@ManyToOne(() => CredentialsEntity, {
		onDelete: 'CASCADE',
	})
	credential: CredentialsEntity;

	@RelationId((credentialUsage: CredentialUsage) => credentialUsage.workflow)
	@PrimaryColumn()
	workflowId: number;

	@PrimaryColumn()
	nodeId: string;

	@RelationId((credentialUsage: CredentialUsage) => credentialUsage.credential)
	@PrimaryColumn()
	credentialId: string;
}
