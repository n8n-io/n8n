import { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

export type ChatProviderType = 'telegram' | 'slack';

export interface IChatAuthenticationService {
	/**
	 * Store a user code for a chat user id and provider
	 */
	createVerificationCode(
		chatUserId: string,
		chatProvider: ChatProviderType,
		validForSeconds?: number,
	): Promise<string>;

	/**
	 * Validate and link an n8n user, based on a chat code.
	 * if the code is still valid, the user will be linked,
	 * to the chat user that the code was created for.
	 */
	validateUserCodeAndLink(
		n8nUserId: string,
		chatProvider: ChatProviderType,
		code: string,
	): Promise<void>;

	/**
	 * Get an n8n User by a chat user id and provider
	 */
	getUserByChatUserId(chatUserId: string, chatProvider: ChatProviderType): Promise<User | null>;

	/**
	 * Get all linked chat providers for a user.
	 */
	getChatProvidersForUser(n8nUserId: string): Promise<ChatProviderType[]>;

	/**
	 * Remove link for chat provider for the given n8n user id
	 */
	unlinkUserFromProvider(n8nUserId: string, chatProvider: ChatProviderType): Promise<void>;
}

@Service()
export class ChatAuthenticationProxyService implements IChatAuthenticationService {
	private provider: IChatAuthenticationService | null = null;

	setProvider(provider: IChatAuthenticationService) {
		this.provider = provider;
	}

	/**
	 * Returns true when a chat authentication module has registered itself as the provider.
	 * Callers can use this to gate behavior without catching {@link UserError}.
	 */
	hasProvider(): boolean {
		return this.provider !== null;
	}

	private requireProvider(): IChatAuthenticationService {
		if (!this.provider) {
			throw new UserError('No chat authentication module available');
		}
		return this.provider;
	}

	/**
	 * Store a user code for a chat user id and provider
	 */
	async createVerificationCode(
		chatUserId: string,
		chatProvider: ChatProviderType,
		validForSeconds: number = 300,
	): Promise<string> {
		return await this.requireProvider().createVerificationCode(
			chatUserId,
			chatProvider,
			validForSeconds,
		);
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
		return await this.requireProvider().validateUserCodeAndLink(n8nUserId, chatProvider, code);
	}

	/**
	 * Get an n8n User by a chat user id and provider
	 */
	async getUserByChatUserId(
		chatUserId: string,
		chatProvider: ChatProviderType,
	): Promise<User | null> {
		return await this.requireProvider().getUserByChatUserId(chatUserId, chatProvider);
	}

	/**
	 * Get all linked chat providers for a user.
	 */
	async getChatProvidersForUser(n8nUserId: string): Promise<ChatProviderType[]> {
		return await this.requireProvider().getChatProvidersForUser(n8nUserId);
	}

	/**
	 * Remove link for chat provider for the given n8n user id
	 */
	async unlinkUserFromProvider(n8nUserId: string, chatProvider: ChatProviderType): Promise<void> {
		return await this.requireProvider().unlinkUserFromProvider(n8nUserId, chatProvider);
	}
}
