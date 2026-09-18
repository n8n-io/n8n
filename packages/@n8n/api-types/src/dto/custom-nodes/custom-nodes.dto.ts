import { z } from 'zod';

import { Z } from '../../zod-class';
import {
	customNodeAuthSchema,
	customOperationVersionContentSchema,
} from '../../schemas/custom-nodes.schema';

const nameSchema = z.string().trim().min(1).max(128);
const descriptionSchema = z.string().trim().max(1000).optional();

/** Create a Custom Operation attached to an existing node or to a Custom Node. */
export class CreateCustomOperationDto extends Z.class({
	name: nameSchema,
	description: descriptionSchema,
	parentNodeType: z.string().min(1).nullable(),
	customNodeId: z.string().min(1).nullable(),
	version: customOperationVersionContentSchema,
}) {}

/** Update a Custom Operation. A new `version` creates a new stored version. */
export class UpdateCustomOperationDto extends Z.class({
	name: nameSchema.optional(),
	description: descriptionSchema,
	version: customOperationVersionContentSchema.optional(),
}) {}

export class SetActiveVersionDto extends Z.class({
	version: z.number().int().positive(),
}) {}

export class CreateCustomNodeDto extends Z.class({
	name: z
		.string()
		.trim()
		.min(1)
		.max(64)
		.regex(/^[A-Za-z][A-Za-z0-9]*$/),
	displayName: nameSchema,
	description: descriptionSchema,
	iconDataUri: z.string().optional(),
	baseUrl: z.string().trim().optional(),
	auth: customNodeAuthSchema,
	/** Operations created together with the node. */
	operations: z
		.array(
			z.object({
				name: nameSchema,
				description: descriptionSchema,
				version: customOperationVersionContentSchema,
			}),
		)
		.min(1),
}) {}

export class UpdateCustomNodeDto extends Z.class({
	displayName: nameSchema.optional(),
	description: descriptionSchema,
	baseUrl: z.string().trim().optional(),
	auth: customNodeAuthSchema.optional(),
}) {}

/** Icon upload as a data URI. The service enforces the size cap. */
export class UploadCustomNodeIconDto extends Z.class({
	iconDataUri: z
		.string()
		.regex(/^data:image\/(svg\+xml|png);base64,[A-Za-z0-9+/=]+$/, 'must be an SVG or PNG data URI'),
}) {}
