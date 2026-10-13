import { HttpsUrl, trustedSourceConfigSchemaFor } from '@n8n/inbound-auth';
import { z } from 'zod';

import { Z } from '../../zod-class';

export const trustedSourceNameSchema = z.string().trim().min(1).max(128);
// Discovery fetches the issuer's metadata and refuses http, so the DTO refuses it up front.
export const trustedSourceIssuerSchema = HttpsUrl;
// Admin rows only: the system row has no write route.
export const adminTrustedSourceConfigSchema = trustedSourceConfigSchemaFor('admin');

export class CreateTrustedSourceDto extends Z.class({
	name: trustedSourceNameSchema,
	issuer: trustedSourceIssuerSchema,
	config: adminTrustedSourceConfigSchema,
}) {}
