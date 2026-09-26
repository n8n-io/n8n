import { z } from 'zod';

import {
	reloadSecretProviderConnectionResponseSchema,
	secretProviderConnectionSchema,
	testSecretProviderConnectionResponseSchema,
} from '../../schemas/secrets-provider.schema';
import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export const externalSecretsConnectionPublicSchema = secretProviderConnectionSchema.omit({
	settings: true,
	secrets: true,
	scopes: true,
});
export type ExternalSecretsConnectionPublic = z.infer<typeof externalSecretsConnectionPublicSchema>;

export class ExternalSecretsConnectionListPublicDto extends Z.class({
	data: z.array(externalSecretsConnectionPublicSchema),
	nextCursor: z.string().nullable(),
}) {}

export class ExternalSecretsConnectionPublicDto extends Z.class(
	externalSecretsConnectionPublicSchema.shape,
) {}

export class ListExternalSecretsConnectionsQueryDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}

export class TestExternalSecretsConnectionPublicDto extends Z.class(
	testSecretProviderConnectionResponseSchema.shape,
) {}

export class ReloadExternalSecretsConnectionPublicDto extends Z.class(
	reloadSecretProviderConnectionResponseSchema.shape,
) {}
