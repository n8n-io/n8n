import { ChatAuthenticationProxyService } from '@/services/chat-authentication-proxy.service';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'sso-chat' })
export class SSOChatModule implements ModuleInterface {
	async init() {
		const { ChatAuthenticationService } = await import('./services/chat-auth.service');
		Container.get(ChatAuthenticationProxyService).setProvider(
			Container.get(ChatAuthenticationService),
		);
	}

	async entities() {
		const { ChatAuthIdentity } = await import('./entities/chat-auth-identity');
		const { ChatClientCode } = await import('./entities/chat-client-code');
		return [ChatAuthIdentity, ChatClientCode];
	}
}
