import { Column, Entity, Index } from '../../../../src';

@Index('cluster_clu_created_fef900_idx', ['created_at'], {})
@Index('cluster_cluster_pkey', ['uuid'], { unique: true })
@Entity('cluster_cluster', { schema: 'dbo' })
export class ClusterCluster {
	@Column('uuid', { primary: true, name: 'uuid' })
	uuid: string;

	@Column({ name: 'created_at' })
	created_at: Date;

	@Column({ name: 'updated_at' })
	updated_at: Date;

	@Column({ name: 'category', length: 30 })
	category: string;

	@Column({ name: 'parent', length: 255 })
	parent: string;
}
