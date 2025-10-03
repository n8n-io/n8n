import { Logger } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

const YELLOW = '\x1b[33m';
const CLEAR = '\x1b[0m';
const WARNING_MESSAGE =
	"[Chat] 'chat' module is experimental, undocumented and subject to change. " +
	'Before its official release any features may become inaccessible at any point, ' +
	'and using the module could compromise the stability of your system. Use at your own risk!';

@BackendModule({ name: 'chat' })
export class ChatModule implements ModuleInterface {
	async init() {
		const logger = Container.get(Logger).scoped('chat');
		logger.warn(`${YELLOW}${WARNING_MESSAGE}${CLEAR}`);

		await import('./chat.controller');
		await import('./chat.settings.controller');
	}

	async settings() {
		const { ChatSettingsService } = await import('./chat.settings.service');
		const chatAccessEnabled = await Container.get(ChatSettingsService).getEnabled();
		return { chatAccessEnabled };
	}

	@OnShutdown()
	async shutdown() {}
}
