import { z } from 'zod';

import { Z } from '../../zod-class';
import { customActionDraftSchema, customNodeAuthSchema } from '../../schemas/custom-nodes.schema';

export class CreateCustomNodeDto extends Z.class({
	displayName: z.string().min(1).max(128),
	description: z.string().max(1000).optional(),
	baseUrl: z.string().max(2048).url(),
	auth: customNodeAuthSchema,
	actions: z.array(customActionDraftSchema).min(1).max(100),
}) {}

export class UpdateCustomNodeDto extends Z.class({
	displayName: z.string().min(1).max(128).optional(),
	description: z.string().max(1000).optional(),
	baseUrl: z.string().max(2048).url().optional(),
}) {}

export class SaveCustomActionDto extends Z.class({
	draft: customActionDraftSchema,
	changeNote: z.string().max(500).optional(),
}) {}

export class CreateParentCustomActionDto extends Z.class({
	parentNodeType: z.string().min(1).max(256),
	draft: customActionDraftSchema,
	changeNote: z.string().max(500).optional(),
}) {}

export class RollbackCustomActionRevisionDto extends Z.class({
	revision: z.number().int().min(1),
}) {}

export class SetCustomNodeIconDto extends Z.class({
	iconDataUri: z.string().regex(/^data:image\/(svg\+xml|png);base64,[A-Za-z0-9+/=]+$/),
}) {}

export class PreviewCustomActionDto extends Z.class({
	draft: customActionDraftSchema,
}) {}
