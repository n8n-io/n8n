import { Z } from '@n8n/api-types';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import { randomUUID } from 'crypto';
import { z } from 'zod';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

const widgetPublicSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

class WidgetPublicDto extends Z.class({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
}) {}

class WidgetListPublicDto extends Z.class({
	data: z.array(widgetPublicSchema),
}) {}

class CreateWidgetBodyDto extends Z.class({
	name: z.string().trim().min(1),
	description: z.string().optional(),
}) {}

class UpdateWidgetBodyDto extends Z.class({
	name: z.string().trim().min(1).optional(),
	description: z.string().optional(),
}) {}

class ListWidgetsQueryDto extends Z.class({
	limit: z.number().int().positive().max(250).optional(),
}) {}

interface Widget {
	id: string;
	name: string;
	description: string | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Demo: a fully-fledged CRUD resource exercising every `@PublicApiController` decorator in one
 * place - list/get/create/update/delete, path/query/body args, API-key scopes, error responses,
 * and both a 200-with-body and a 204-no-body success response. Backed by an in-memory store, not
 * a real n8n entity - scopes are borrowed from `tag:*` for the demo.
 */
@PublicApiController('/widgets')
export class WidgetsPublicController {
	private readonly widgets = new Map<string, Widget>();

	@Get('/')
	@ApiKeyScope('tag:list')
	@ApiSummary('Retrieve all widgets')
	@ApiDescription('Retrieve all widgets from your instance.')
	@ApiTags(['Widgets'])
	@ApiResponse(200, WidgetListPublicDto)
	async listWidgets(@Query query: ListWidgetsQueryDto): Promise<WidgetListPublicDto> {
		const data = [...this.widgets.values()].slice(0, query.limit ?? 100);
		return { data };
	}

	@Get('/:id')
	@ApiKeyScope('tag:read')
	@ApiSummary('Retrieve a widget')
	@ApiDescription('Retrieve a single widget by ID.')
	@ApiTags(['Widgets'])
	@ApiResponse(200, WidgetPublicDto)
	@ApiErrorResponse(404)
	async getWidget(@Param('id') id: string): Promise<WidgetPublicDto> {
		return this.findOrThrow(id);
	}

	@Post('/')
	@ApiKeyScope('tag:create')
	@ApiSummary('Create a widget')
	@ApiDescription('Create a new widget.')
	@ApiTags(['Widgets'])
	@ApiResponse(201, WidgetPublicDto)
	async createWidget(@Body body: CreateWidgetBodyDto): Promise<WidgetPublicDto> {
		const now = new Date();
		const widget: Widget = {
			id: randomUUID(),
			name: body.name,
			description: body.description ?? null,
			createdAt: now,
			updatedAt: now,
		};
		this.widgets.set(widget.id, widget);
		return widget;
	}

	@Patch('/:id')
	@ApiKeyScope('tag:update')
	@ApiSummary('Update a widget')
	@ApiDescription('Update an existing widget.')
	@ApiTags(['Widgets'])
	@ApiResponse(200, WidgetPublicDto)
	@ApiErrorResponse(404)
	async updateWidget(
		@Param('id') id: string,
		@Body body: UpdateWidgetBodyDto,
	): Promise<WidgetPublicDto> {
		const widget = this.findOrThrow(id);
		if (body.name !== undefined) widget.name = body.name;
		if (body.description !== undefined) widget.description = body.description;
		widget.updatedAt = new Date();
		return widget;
	}

	@Delete('/:id')
	@ApiKeyScope('tag:delete')
	@ApiSummary('Delete a widget')
	@ApiDescription('Delete a widget.')
	@ApiTags(['Widgets'])
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async deleteWidget(@Param('id') id: string): Promise<void> {
		this.findOrThrow(id);
		this.widgets.delete(id);
	}

	private findOrThrow(id: string): Widget {
		const widget = this.widgets.get(id);
		if (!widget) throw new NotFoundError(`Widget with ID "${id}" not found.`);
		return widget;
	}
}
