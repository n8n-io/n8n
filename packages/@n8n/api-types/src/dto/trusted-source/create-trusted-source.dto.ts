import { trustedSourceConfigSchemaFor } from '@n8n/inbound-auth';
import { z } from 'zod';

import { Z } from '../../zod-class';

export const trustedSourceNameSchema = z.string().trim().min(1).max(128);
export const trustedSourceIssuerSchema = z.string().url();
// Admin rows only: the system row has no write route.
export const adminTrustedSourceConfigSchema = trustedSourceConfigSchemaFor('admin');

export class CreateTrustedSourceDto extends Z.class({
	name: trustedSourceNameSchema,
	issuer: trustedSourceIssuerSchema,
	config: adminTrustedSourceConfigSchema,
}) {}
