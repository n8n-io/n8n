import { Container, Service } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller } from './types';

/**
 * Marks a controller for the public API surface (`/api/v1`).
 *
 * Reuses the same route/arg/RBAC decorators as `@RestController`, but registers
 * into a public collection so `ControllerRegistry` does not mount it under `/rest`.
 * Auth, errors, and mounting are handled by `PublicApiControllerRegistry`.
 *
 * @example
 * ```ts
 * @PublicApiController('/tags')
 * export class TagsPublicController {
 *   @Get('/')
 *   @ApiKeyScope('tag:list')
 *   async getTags() { ... }
 * }
 * ```
 */
export const PublicApiController =
	(basePath: `/${string}` = '/'): ClassDecorator =>
	(target) => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			target as unknown as Controller,
		);
		metadata.basePath = basePath;
		metadata.isPublicApi = true;
		metadata.registerOnRootPath = false;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
