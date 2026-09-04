import { z } from 'zod';

import { SourceControlledFileSchema } from '../../schemas/source-controlled-file.schema';
import { Z } from '../../zod-class';

/**
 * The server resolves each entry by `(type, id)` against a fresh `status` computation and
 * derives everything else (file path, conflict, owner, ...) itself, so the public contract
 * only asks for what it actually uses — not the full `SourceControlledFile` shape the
 * internal REST route accepts.
 */
const PushFileSelectorSchema = z.object({
	id: z.string().min(1),
	type: SourceControlledFileSchema.shape.type,
});

export class SourceControlPushRequestPublicDto extends Z.class({
	commitMessage: z.string().trim().min(1).max(1000),
	// Required and non-empty: an implicit "push everything" default was rejected as too
	// risky for a scriptable endpoint (see API-146). Callers who want to push everything
	// must call `status` first and pass its full response back.
	fileNames: z.array(PushFileSelectorSchema).min(1),
	force: z.boolean().optional(),
}) {}
