import '../../openapi-extend';

import { z } from 'zod';

import { discoverQueryFieldDocs, discoverResponseFieldDocs } from './discover-public.openapi';
import { Z } from '../../zod-class';

const discoverEndpointPublicSchema = z.object({
	method: z.string(),
	path: z.string(),
	operationId: z.string(),
	requestSchema: z
		.record(z.string(), z.unknown())
		.optional()
		.openapi(discoverResponseFieldDocs.requestSchema),
});

const discoverResourcePublicSchema = z.object({
	operations: z.array(z.string()),
	endpoints: z.array(discoverEndpointPublicSchema),
});

const discoverFilterPublicSchema = z.object({
	description: z.string(),
	values: z.array(z.string()),
});

export const discoverDataPublicSchema = z.object({
	scopes: z.array(z.string()).openapi(discoverResponseFieldDocs.scopes),
	resources: z.record(z.string(), discoverResourcePublicSchema),
	filters: z
		.record(z.string(), discoverFilterPublicSchema)
		.openapi(discoverResponseFieldDocs.filters),
	specUrl: z.string().openapi(discoverResponseFieldDocs.specUrl),
});

export type DiscoverDataPublic = z.infer<typeof discoverDataPublicSchema>;

export class DiscoverPublicDto extends Z.class({
	data: discoverDataPublicSchema,
}) {}

export class DiscoverQueryPublicDto extends Z.class(
	{
		include: z
			.enum(['schemas'], {
				message: 'must be equal to one of the allowed values: schemas',
			})
			.optional()
			.openapi(discoverQueryFieldDocs.include),
		resource: z.string().optional().openapi(discoverQueryFieldDocs.resource),
		operation: z.string().optional().openapi(discoverQueryFieldDocs.operation),
	},
	{ strict: true },
) {}
