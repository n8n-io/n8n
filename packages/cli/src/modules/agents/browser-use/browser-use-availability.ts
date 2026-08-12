import { ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';

/**
 * Whether an agent can offer Browser Use right now.
 *
 * The relay, the extension handshake and the session registry all live in the
 * instance-ai module, so agents borrow them rather than duplicating them. When
 * that module is off the tools are simply never registered, which is what keeps
 * the dependency soft: agents keep working, just without a browser.
 *
 * The settings service is imported lazily so a disabled instance-ai module is
 * never pulled into the graph.
 */
export async function isBrowserUseAvailable(): Promise<boolean> {
	if (!Container.get(ModuleRegistry).isActive('instance-ai')) return false;

	const { InstanceAiSettingsService } = await import(
		'@/modules/instance-ai/instance-ai-settings.service.js'
	);
	return Container.get(InstanceAiSettingsService).isBrowserUseEnabled();
}
