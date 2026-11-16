import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { v7 as uuidv7 } from 'uuid';

export function useCreateApp() {
	const assistant = capabilityRegistry.use(capabilities.createAppAssistantHandoff)();

	function createApp(projectId: string): void {
		void assistant.createApp({ appId: uuidv7(), projectId });
	}

	return { createApp };
}
