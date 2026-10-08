import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import type { Capability } from '@/services/capabilities/capability';
import { CapabilityRegistry } from '@/services/capabilities/capability-registry.service';

import { exportWorkflowPackageCapability } from './export-workflow-package.capability';
import { importWorkflowPackageCapability } from './import-workflow-package.capability';

/**
 * The capabilities that the n8n-packages module owns. The module registers them in `init()`, so
 * MCP clients can copy workflows between instances only while the module is enabled.
 */
export const N8N_PACKAGES_CAPABILITIES: readonly Capability[] = [
	exportWorkflowPackageCapability,
	importWorkflowPackageCapability,
];

/**
 * The import writes workflow content like the MCP builder tools (create_workflow_from_code,
 * update_workflow), so it is offered only while N8N_MCP_BUILDER_ENABLED is on. The export reads
 * only, so it is always offered.
 */
function capabilitiesToRegister(builderEnabled: boolean): readonly Capability[] {
	return builderEnabled
		? N8N_PACKAGES_CAPABILITIES
		: N8N_PACKAGES_CAPABILITIES.filter(
				(capability) => capability !== importWorkflowPackageCapability,
			);
}

/**
 * Registering again does nothing, so a repeated module init is safe. `builderEnabled` defaults to
 * N8N_MCP_BUILDER_ENABLED.
 */
export function registerN8nPackagesCapabilities(
	registry = Container.get(CapabilityRegistry),
	builderEnabled = Container.get(GlobalConfig).endpoints.mcpBuilderEnabled,
): void {
	for (const capability of capabilitiesToRegister(builderEnabled)) registry.register(capability);
}
