import { z } from 'zod';

import {
	adminTrustedSourceConfigSchema,
	trustedSourceIssuerSchema,
	trustedSourceNameSchema,
} from './create-trusted-source.dto';
import { Z } from '../../zod-class';

export class UpdateTrustedSourceDto extends Z.class({
	name: trustedSourceNameSchema.optional(),
	issuer: trustedSourceIssuerSchema.optional(),
	config: adminTrustedSourceConfigSchema.optional(),
	/** Drops every (subject, user) binding of the source. Set it when the issuer moves to another IdP. */
	clearBindings: z.boolean().optional(),
}) {}
