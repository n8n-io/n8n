import { Column, Entity, OneToMany } from 'typeorm';
import { WithTimestampsAndStringId } from './AbstractEntity';
import type { ProjectRelation } from './ProjectRelation';

export type ProjectType = 'personal' | 'team' | 'public';

@Entity()
export class Project extends WithTimestampsAndStringId {
	@Column({ length: 255 })
	name: string;

	@Column({ length: 36 })
	type: ProjectType;

	@OneToMany('ProjectRelation', 'project')
	projectRelations: ProjectRelation[];
}
