import {
	MESSENGER_PLATFORMS,
	VerifyMessengerCodeRequestDto,
	type MessengerAccountDto,
	type MessengerPlatform,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Post, RestController } from '@n8n/decorators';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { MessengerAccountsService } from '@/services/messenger-accounts.service';

function isMessengerPlatform(value: string): value is MessengerPlatform {
	return (MESSENGER_PLATFORMS as readonly string[]).includes(value);
}

@RestController('/me/messenger-accounts')
export class UserMessengerAccountsController {
	constructor(private readonly messengerAccountsService: MessengerAccountsService) {}

	@Get('/')
	list(req: AuthenticatedRequest): MessengerAccountDto[] {
		return this.messengerAccountsService.list(req.user.id);
	}

	@Post('/verify')
	verify(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body body: VerifyMessengerCodeRequestDto,
	): MessengerAccountDto {
		return this.messengerAccountsService.verifyCode(req.user.id, body.code);
	}

	@Delete('/:platform')
	unlink(req: AuthenticatedRequest, _res: unknown, @Param('platform') platform: string) {
		if (!isMessengerPlatform(platform)) {
			throw new BadRequestError(`Unknown messenger platform: ${platform}`);
		}
		this.messengerAccountsService.unlink(req.user.id, platform);
		return { success: true };
	}
}
