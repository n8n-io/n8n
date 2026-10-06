import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * A declarative HTTP action to run once, before it is published. `params` are the node
 * parameters of the run. `credentialId` names a credential that the user can read.
 */
export class TestNextNodeDraftDto extends Z.class({
	config: z.record(z.unknown()),
	params: z.record(z.unknown()).default({}),
	credentialId: z.string().optional(),
}) {}
