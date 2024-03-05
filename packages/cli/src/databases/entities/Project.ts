import { Column, Entity, OneToMany } from '@n8n/typeorm';
import { WithTimestampsAndStringId } from './AbstractEntity';
import type { ProjectRelation } from './ProjectRelation';
import type { SharedCredentials } from './SharedCredentials';
import type { SharedWorkflow } from './SharedWorkflow';
import { ApplicationError } from 'n8n-workflow';

export type ProjectType = 'personal' | 'team' | 'public';

@Entity()
export class Project extends WithTimestampsAndStringId {
	@Column({ length: 255, nullable: true })
	name?: string;

	get actualName(): string {
		if (this.name) {
			return this.name;
		}

		const owningRelation = this.projectRelations?.find(
			(pr) => pr.role === 'project:personalOwner' && pr.user !== undefined,
		);
		if (owningRelation) {
			const user = owningRelation.user;
			return `${user.firstName} ${user.lastName} <${user.email}>`; // generate name
		}

		throw new ApplicationError(
			'You asked for the actual name of a personal project. I can only generate the actual name if `projectRelations: { user: true }` is part of the relations when querying the database. Please make sure to add this to your query.',
		);
	}

	@Column({ length: 36 })
	type: ProjectType;

	@OneToMany('ProjectRelation', 'project', { eager: true })
	projectRelations: ProjectRelation[];

	@OneToMany('SharedCredentials', 'project')
	sharedCredentials: SharedCredentials[];

	@OneToMany('SharedWorkflow', 'project')
	sharedWorkflows: SharedWorkflow[];
}
