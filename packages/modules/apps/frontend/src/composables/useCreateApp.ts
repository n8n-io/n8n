import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { v7 as uuidv7 } from 'uuid';

export function useCreateApp() {
	function createApp(projectId: string): void {
		const assistant = capabilityRegistry.use(capabilities.createAppAssistantHandoff)();
		void assistant.createApp({ appId: uuidv7(), projectId });
	}

	return { createApp };
}
