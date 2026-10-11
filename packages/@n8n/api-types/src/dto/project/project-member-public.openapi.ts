import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const projectMemberDocs: ZodOpenAPIMetadata = {
	description: 'A project member (user with their role in the project).',
};

export const projectMemberFieldDocs = {
	id: {
		description: "The user's unique identifier.",
		readOnly: true,
		example: '123e4567-e89b-12d3-a456-426614174000',
	},
	email: {
		format: 'email',
		description: "The user's email address.",
		readOnly: true,
		example: 'john.doe@company.com',
	},
	firstName: {
		maxLength: 32,
		description: "The user's first name.",
		readOnly: true,
		example: 'john',
	},
	lastName: {
		maxLength: 32,
		description: "The user's last name.",
		readOnly: true,
		example: 'Doe',
	},
	createdAt: { description: 'When the user was created.', readOnly: true },
	updatedAt: { description: 'When the user was last updated.', readOnly: true },
	role: {
		description: "The user's role in the project (e.g. project:admin, project:viewer).",
		readOnly: true,
		example: 'project:viewer',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const projectMemberListFieldDocs = {
	nextCursor: {
		description:
			'Paginate through project members by setting the cursor parameter to the nextCursor ' +
			'attribute returned by a previous request. Default value fetches the first page of the collection.',
		example: 'eyJvZmZzZXQiOjEwMCwibGltaXQiOjEwMH0=',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const addProjectMembersFieldDocs = {
	relations: { description: 'A list of userIds and roles to add to the project.' },
	userId: {
		description: 'The unique identifier of the user.',
		example: '91765f0d-3b29-45df-adb9-35b23937eb92',
	},
	role: { description: 'The role assigned to the user in the project.', example: 'project:viewer' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;
