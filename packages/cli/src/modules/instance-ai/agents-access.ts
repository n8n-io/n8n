import { ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';

/**
 * Whether the Assistant can use Agents: the Agents module is active and the
 * Settings > Agents switch is on. Every main keeps the switch state current
 * through the `reload-agents-settings` command, so the Assistant loses its
 * Agents access as soon as an admin turns the switch off.
 */
export function isAgentsAccessEnabled(
	moduleRegistry: ModuleRegistry = Container.get(ModuleRegistry),
): boolean {
	return (
		moduleRegistry.isActive('agents') && moduleRegistry.settings.get('agents')?.enabled !== false
	);
}
