import { z } from 'zod';

const FileTypeSchema = z.enum([
	'credential',
	'workflow',
	'tags',
	'variables',
	'file',
	'folders',
	'project',
	'datatable',
]);
export const SOURCE_CONTROL_FILE_TYPE = FileTypeSchema.Values;

const FileStatusSchema = z.enum([
	'new',
	'modified',
	'deleted',
	'created',
	'renamed',
	'conflicted',
	'ignored',
	'staged',
	'unknown',
]);
export const SOURCE_CONTROL_FILE_STATUS = FileStatusSchema.Values;

export type SourceControlledFileStatus = z.infer<typeof FileStatusSchema>;

export function isSourceControlledFileStatus(value: unknown): value is SourceControlledFileStatus {
	return FileStatusSchema.safeParse(value).success;
}

const FileLocationSchema = z.enum(['local', 'remote']);
export const SOURCE_CONTROL_FILE_LOCATION = FileLocationSchema.Values;

const ResourceOwnerSchema = z.object({
	type: z.enum(['personal', 'team']),
	projectId: z.string(),
	projectName: z.string(),
});

export const SourceControlledFileSchema = z.object({
	file: z.string(),
	id: z.string(),
	name: z.string(),
	type: FileTypeSchema,
	status: FileStatusSchema,
	location: FileLocationSchema,
	conflict: z.boolean(),
	updatedAt: z.string(),
	pushed: z.boolean().optional(),
	isLocalPublished: z.boolean().optional(),
	isRemoteArchived: z.boolean().optional(),
	owner: ResourceOwnerSchema.optional(), // Resource owner can be a personal email or team information
	publishingError: z.string().optional(),
});

export type SourceControlledFile = z.infer<typeof SourceControlledFileSchema>;
