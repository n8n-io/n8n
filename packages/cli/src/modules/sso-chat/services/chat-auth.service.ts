import {
	ChatProviderType,
	IChatAuthenticationService,
} from '@/services/chat-authentication-proxy.service';
import { UserRepository } from '@n8n/db';
import type { EntityManager, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError, randomInt } from 'n8n-workflow';
import { createHash } from 'node:crypto';

import { ChatAuthIdentity } from '../entities/chat-auth-identity';
import { ChatClientCode } from '../entities/chat-client-code';
import { ChatAuthIdentityRepository } from '../repositories/chat-auth-identity.repository';
import { ChatClientCodeRepository } from '../repositories/chat-client-code.repository';

@Service()
export class ChatAuthenticationService implements IChatAuthenticationService {
	constructor(
		private readonly chatAuthIdentityRepository: ChatAuthIdentityRepository,
		private readonly chatClientCodeRepository: ChatClientCodeRepository,
		private readonly userRepository: UserRepository,
	) {}

	/**
	 * Store a user code for a chat user id and provider
	 */
	async createVerificationCode(
		chatUserId: string,
		chatProvider: ChatProviderType,
		validForSeconds: number = 300,
	): Promise<string> {
		const identity = await this.chatAuthIdentityRepository.findOneBy({
			providerType: chatProvider,
			providerId: chatUserId,
		});

		if (identity !== null) {
			throw new OperationalError('Chat userid is already linked');
		}

		const randomCode = `${randomInt(100_000_000, 1_000_000_000)}`;

		const randomCodeHash = createHash('sha256').update(randomCode).digest().toString('base64');

		const milliseconds = validForSeconds * 1000;

		await this.chatClientCodeRepository.save({
			codeHash: randomCodeHash,
			providerId: chatUserId,
			providerType: chatProvider,
			expiresAt: new Date(Date.now() + milliseconds),
		});

		return randomCode;
	}

	/**
	 * Validate and link an n8n user, based on a chat code.
	 * if the code is still valid, the user will be linked,
	 * to the chat user that the code was created for.
	 */
	async validateUserCodeAndLink(
		n8nUserId: string,
		chatProvider: ChatProviderType,
		code: string,
	): Promise<void> {
		const randomCodeHash = createHash('sha256').update(code).digest().toString('base64');

		const exchangeCodeAndLinkUser = async (tx: EntityManager) => {
			const clientCodeRepository = tx.getRepository(ChatClientCode);
			const clientCode = await clientCodeRepository.findOneBy({
				codeHash: randomCodeHash,
				providerType: chatProvider,
			});

			if (!clientCode) {
				throw new OperationalError('No valid code found');
			}

			await clientCodeRepository.delete({
				providerId: clientCode.providerId,
				providerType: clientCode.providerType,
			});

			if (clientCode.expiresAt <= new Date()) {
				throw new OperationalError('Code is already expired');
			}

			const chatAuthIdentityRepository = tx.getRepository(ChatAuthIdentity);

			await chatAuthIdentityRepository.save({
				providerId: clientCode.providerId,
				providerType: clientCode.providerType,
				userId: n8nUserId,
			});
		};

		await this.chatClientCodeRepository.manager.transaction(exchangeCodeAndLinkUser);
	}

	/**
	 * Get an n8n User by a chat user id and provider
	 */
	async getUserByChatUserId(
		chatUserId: string,
		chatProvider: ChatProviderType,
	): Promise<User | null> {
		const userIdentity = await this.chatAuthIdentityRepository.findOne({
			select: ['userId'],
			where: {
				providerType: chatProvider,
				providerId: chatUserId,
			},
		});

		if (userIdentity) {
			return await this.userRepository.findOneBy({ id: userIdentity.userId });
		}

		return null;
	}

	/**
	 * Get all linked chat providers for a user.
	 */
	async getChatProvidersForUser(n8nUserId: string): Promise<ChatProviderType[]> {
		const providers = await this.chatAuthIdentityRepository.find({
			where: {
				userId: n8nUserId,
			},
			select: ['providerType'],
		});

		return providers
			.map((p) => p.providerType)
			.filter((value, index, array) => {
				return array.indexOf(value) === index;
			});
	}

	/**
	 * Remove link for chat provider for the given n8n user id
	 */
	async unlinkUserFromProvider(n8nUserId: string, chatProvider: ChatProviderType): Promise<void> {
		await this.chatAuthIdentityRepository.delete({
			userId: n8nUserId,
			providerType: chatProvider,
		});
	}
}
