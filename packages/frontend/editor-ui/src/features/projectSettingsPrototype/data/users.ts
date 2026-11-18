import type { ProjectRole, RoleDef, User } from './types';

/** The person using the prototype. Their roles come from the `viewingAs` parameter. */
export const CURRENT_USER_ID = 'u-me';

const user = (
	id: string,
	firstName: string,
	lastName: string,
	instanceRole: User['instanceRole'] = 'member',
): User => ({
	id,
	firstName,
	lastName,
	email: `${firstName}.${lastName}`
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z.]/g, '')
		.concat('@northwind.example'),
	instanceRole,
});

export const USERS: User[] = [
	user(CURRENT_USER_ID, 'Robin', 'Hale', 'owner'),
	user('u-priya', 'Priya', 'Raman', 'admin'),
	user('u-tomas', 'Tomás', 'Ferreira'),
	user('u-hannah', 'Hannah', 'Köhler'),
	user('u-daniel', 'Daniel', 'Okafor'),
	user('u-mei', 'Mei', 'Tanaka'),
	user('u-lucas', 'Lucas', 'Moreau'),
	user('u-sofia', 'Sofia', 'Rossi'),
	user('u-amara', 'Amara', 'Nwosu'),
	user('u-jonas', 'Jonas', 'Weber'),
	user('u-elena', 'Elena', 'Petrova'),
	user('u-noah', 'Noah', 'Williams'),
	user('u-aisha', 'Aisha', 'Khan'),
	user('u-mateo', 'Mateo', 'García'),
	user('u-ingrid', 'Ingrid', 'Solberg'),
	user('u-kofi', 'Kofi', 'Mensah'),
	user('u-yuki', 'Yuki', 'Nakamura'),
	user('u-olivia', 'Olivia', 'Bennett'),
	user('u-rafael', 'Rafael', 'Costa'),
	user('u-zoe', 'Zoe', 'Fischer'),
	user('u-ethan', 'Ethan', 'Park'),
	user('u-nadia', 'Nadia', 'Haddad'),
	user('u-liam', 'Liam', 'Byrne'),
	user('u-chloe', 'Chloé', 'Dubois'),
	user('u-arjun', 'Arjun', 'Mehta'),
	user('u-freya', 'Freya', 'Andersson'),
	user('u-samuel', 'Samuel', 'Adeyemi'),
	user('u-lena', 'Lena', 'Hoffmann'),
];

const usersById = new Map(USERS.map((entry) => [entry.id, entry]));

export function userById(id: string): User {
	const found = usersById.get(id);
	if (!found) throw new Error(`Unknown user: ${id}`);
	return found;
}

export function fullName(entry: Pick<User, 'firstName' | 'lastName'>): string {
	return `${entry.firstName} ${entry.lastName}`;
}

/**
 * System roles use master's labels and descriptions (`projects.settings.role.*`).
 * Custom roles are defined by the instance, under Settings › Roles.
 */
export const PROJECT_ROLES: RoleDef[] = [
	{
		id: 'project:admin',
		label: 'Admin',
		description: 'Can edit workflows, credentials, and project settings',
		custom: false,
	},
	{
		id: 'project:editor',
		label: 'Editor',
		description: 'Can edit workflows and credentials',
		custom: false,
	},
	{
		id: 'project:viewer',
		label: 'Viewer',
		description: 'Can view workflows and executions',
		custom: false,
	},
	{
		id: 'custom:workflow-reviewer',
		label: 'Workflow reviewer',
		description: 'Can view workflows and approve changes before they publish',
		custom: true,
	},
	{
		id: 'custom:credential-manager',
		label: 'Credential manager',
		description: 'Can create and edit credentials, and view workflows',
		custom: true,
	},
];

export function roleLabel(role: ProjectRole): string {
	return PROJECT_ROLES.find((entry) => entry.id === role)?.label ?? role;
}

/** Master's `auth.roles.*` labels for the instance roles. */
export const INSTANCE_ROLE_LABELS: Record<User['instanceRole'], string> = {
	owner: 'Owner',
	admin: 'Admin',
	member: 'Member',
};
