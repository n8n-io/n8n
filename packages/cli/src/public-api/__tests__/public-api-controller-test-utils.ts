import { Z } from '@n8n/api-types';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import type { Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

/**
 * Marks `controllerClass` as a public API controller the same way `@PublicApiController` does,
 * without using the literal decorator.
 */
export function markPublicApiController(controllerClass: Controller, basePath: `/${string}`) {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(controllerClass);
	metadata.basePath = basePath;
	metadata.isPublicApi = true;
}

export class WidgetBodyDto extends Z.class({ name: z.string() }) {}
export class WidgetQueryDto extends Z.class({ q: z.string().optional() }) {}
export class WidgetResponseDto extends Z.class({ id: z.string() }) {}
/** Query DTO carrying a shared pagination field, for tests asserting `SHARED_PAGINATION_PARAMS` handling. */
export class WidgetPaginationQueryDto extends Z.class({ limit: z.number().optional() }) {}
