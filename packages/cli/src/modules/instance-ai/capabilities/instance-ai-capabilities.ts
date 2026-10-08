import { Container } from '@n8n/di';

import type { Capability } from '@/services/capabilities/capability';
import { CapabilityRegistry } from '@/services/capabilities/capability-registry.service';

import { proposeAutomationCapability } from '../automation/propose-automation.capability';
import { parseScheduleCapability } from './parse-schedule.capability';

/**
 * The capabilities that the instance-ai module owns. The module registers them in `init()`, so
 * MCP clients and the n8n Assistant offer them only while the module is enabled.
 */
export const INSTANCE_AI_CAPABILITIES: readonly Capability[] = [
	parseScheduleCapability,
	proposeAutomationCapability,
];

/** Registering again does nothing, so a repeated module init is safe. */
export function registerInstanceAiCapabilities(registry = Container.get(CapabilityRegistry)): void {
	for (const capability of INSTANCE_AI_CAPABILITIES) registry.register(capability);
}
