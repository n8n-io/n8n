import {
	MESSENGER_PLATFORMS,
	VerifyMessengerCodeRequestDto,
	type MessengerAccountDto,
	type MessengerPlatform,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Post, RestController } from '@n8n/decorators';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import {
	type ChatAuthIdentityDto,
	ChatAuthenticationProxyService,
} from '@/services/chat-authentication-proxy.service';

function isMessengerPlatform(value: string): value is MessengerPlatform {
	return (MESSENGER_PLATFORMS as readonly string[]).includes(value);
}

function toMessengerAccountDto(identity: ChatAuthIdentityDto): MessengerAccountDto {
	return {
		platform: identity.providerType as MessengerPlatform,
		platformUserId: identity.providerId,
		linkedAt: identity.linkedAt.toISOString(),
	};
}

@RestController('/me/messenger-accounts')
export class UserMessengerAccountsController {
	constructor(private readonly chatAuth: ChatAuthenticationProxyService) {}

	@Get('/')
	async list(req: AuthenticatedRequest): Promise<MessengerAccountDto[]> {
		const identities = await this.chatAuth.getChatProvidersForUser(req.user.id);
		return identities.filter((i) => isMessengerPlatform(i.providerType)).map(toMessengerAccountDto);
	}

	@Post('/verify')
	async verify(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body body: VerifyMessengerCodeRequestDto,
	): Promise<MessengerAccountDto> {
		// The verify endpoint accepts only a code, but the new service is
		// provider-scoped. Iterate over the messenger platforms the UI knows
		// about (today: just telegram) and try each until one succeeds.
		let lastError: unknown;
		for (const platform of MESSENGER_PLATFORMS) {
			try {
				await this.chatAuth.validateUserCodeAndLink(req.user.id, platform, body.code);
				return await this.findJustLinked(req.user.id, platform);
			} catch (error) {
				lastError = error;
			}
		}
		throw new BadRequestError(
			lastError instanceof Error ? lastError.message : 'Invalid or expired code',
		);
	}

	@Delete('/:platform')
	async unlink(req: AuthenticatedRequest, _res: unknown, @Param('platform') platform: string) {
		if (!isMessengerPlatform(platform)) {
			throw new BadRequestError(`Unknown messenger platform: ${platform}`);
		}
		await this.chatAuth.unlinkUserFromProvider(req.user.id, platform);
		return { success: true };
	}

	private async findJustLinked(
		userId: string,
		platform: MessengerPlatform,
	): Promise<MessengerAccountDto> {
		const identities = await this.chatAuth.getChatProvidersForUser(userId);
		const linked = identities.find((i) => i.providerType === platform);
		if (!linked) {
			throw new Error(`Linked ${platform} identity not found after verify`);
		}
		return toMessengerAccountDto(linked);
	}
}
