import { z } from 'zod';

import { scimDataActionSchema, scimOnDeleteSchema } from '../../schemas/scim-config.schema';

/**
 * Every field is optional, so that the settings page can save one field at a
 * time. A field that the body does not send keeps its stored value. A body
 * without fields is rejected.
 */
const scimConfigPatchSchema = z
	.object({
		enabled: z.boolean().optional(),
		onDelete: scimOnDeleteSchema.optional(),
		dataAction: scimDataActionSchema.optional(),
		/** Null sends the work of a deleted user to the personal project of the owner. */
		transferProjectId: z.string().min(1).nullable().optional(),
	})
	.refine((body) => Object.values(body).some((value) => value !== undefined), {
		message: 'At least one field is required',
	});

type ScimConfigPatch = z.infer<typeof scimConfigPatchSchema>;

export class ScimConfigPatchDto implements ScimConfigPatch {
	enabled?: boolean;

	onDelete?: ScimConfigPatch['onDelete'];

	dataAction?: ScimConfigPatch['dataAction'];

	transferProjectId?: string | null;

	static schema = scimConfigPatchSchema;

	constructor(data: ScimConfigPatch) {
		Object.assign(this, scimConfigPatchSchema.parse(data));
	}

	static safeParse(data: unknown) {
		return scimConfigPatchSchema.safeParse(data);
	}

	static parse(data: unknown) {
		return scimConfigPatchSchema.parse(data);
	}
}
