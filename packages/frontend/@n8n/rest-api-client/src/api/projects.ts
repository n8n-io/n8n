import type { Scope } from '@n8n/permissions';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';
import type { IUserResponse } from './users';

export const ProjectTypes = {
	Personal: 'personal',
	Team: 'team',
	Public: 'public',
} as const;

type ProjectTypeKeys = typeof ProjectTypes;

export type ProjectType = ProjectTypeKeys[keyof ProjectTypeKeys];
export type ProjectRelation = Pick<IUserResponse, 'id' | 'email' | 'firstName' | 'lastName'> & {
	role: string;
};
/**
 * A user who reaches the project through a global role rather than a project
 * relation. The backend sends these next to `relations`; they are never part of
 * the membership the settings form edits.
 */
export type ProjectImplicitMember = Pick<
	IUserResponse,
	'id' | 'email' | 'firstName' | 'lastName'
> & {
	globalRole: { slug: string; displayName: string };
};
export type ProjectSharingData = {
	id: string;
	name: string | null;
	icon: { type: 'emoji'; value: string } | { type: 'icon'; value: string } | null;
	type: ProjectType;
	description?: string | null;
	createdAt: string;
	updatedAt: string;
};
export type Project = ProjectSharingData & {
	relations: ProjectRelation[];
	implicitMembers?: ProjectImplicitMember[];
	scopes: Scope[];
	customTelemetryTags?: Array<{ key: string; value: string }>;
	/** Null on older team projects that predate creator tracking. */
	creatorId?: string | null;
	rolesManaged: boolean;
};

export const getProject = async (context: IRestApiContext, id: string): Promise<Project> => {
	return await makeRestApiRequest(context, 'GET', `/projects/${id}`);
};
