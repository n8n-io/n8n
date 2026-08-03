import { Column, Entity, Index } from '../../../../src';

@Index('cluster_clu_created_fef900_idx', ['created_at'], {})
@Index('cluster_cluster_pkey', ['uuid'], { unique: true })
@Entity('cluster_cluster', { schema: 'public' })
export class ClusterCluster {
	@Column('uuid', { primary: true, name: 'uuid' })
	uuid: string;

	@Column('timestamp with time zone', { name: 'created_at' })
	created_at: Date;

	@Column('timestamp with time zone', { name: 'updated_at' })
	updated_at: Date;

	@Column('character varying', { name: 'category', length: 30 })
	category: string;

	@Column('character varying', { name: 'parent', length: 255 })
	parent: string;

	@Column('varchar', { name: 'children', array: true })
	children: string[];
}
