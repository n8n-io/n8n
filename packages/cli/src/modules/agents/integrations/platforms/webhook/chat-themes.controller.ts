import type { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, GlobalScope, Param, Patch, Post, RestController } from '@n8n/decorators';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { Response } from 'express';

import { ChatThemeInputSchema, ChatThemeService } from './chat-themes.service';
import { describeSettingsError } from './webhook-channel.service';

/**
 * SPIKE (agent-chat-embed): named chat themes. Anyone who can open the editor can list
 * and apply them; only owners and admins (`agent:manage`) create, change or delete them.
 */
@RestController('/agent-chat-themes')
export class ChatThemesController {
	constructor(private readonly themes: ChatThemeService) {}

	@Get('/')
	async list() {
		const usage = await this.themes.usage();
		return (await this.themes.list()).map((theme) => ({ ...theme, usedBy: usage[theme.id] ?? 0 }));
	}

	@Post('/')
	@GlobalScope('agent:manage')
	async create(req: AuthenticatedRequest<{}, unknown, unknown>) {
		const parsed = ChatThemeInputSchema.safeParse(req.body);
		if (!parsed.success)
			throw new BadRequestError(`Invalid theme: ${describeSettingsError(parsed.error)}`);
		return await this.themes.create(parsed.data);
	}

	@Patch('/:id')
	@GlobalScope('agent:manage')
	async update(
		req: AuthenticatedRequest<{ id: string }, unknown, unknown>,
		_res: Response,
		@Param('id') id: string,
	) {
		const parsed = ChatThemeInputSchema.partial().safeParse(req.body);
		if (!parsed.success)
			throw new BadRequestError(`Invalid theme: ${describeSettingsError(parsed.error)}`);
		const theme = await this.themes.update(id, parsed.data);
		if (!theme) throw new NotFoundError('Theme not found');
		return theme;
	}

	@Delete('/:id')
	@GlobalScope('agent:manage')
	async delete(_req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		// Chats that used it fall back to their own appearance (or the n8n default).
		await this.themes.delete(id);
		return { deleted: true };
	}
}
