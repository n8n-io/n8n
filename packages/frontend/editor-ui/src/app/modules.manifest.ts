import type { FrontendModuleDescription } from '@n8n/module-sdk';

import { DataTableModule } from '@/features/core/dataTable/module.descriptor';
import { InsightsModule } from '@/features/execution/insights/module.descriptor';
import { MCPModule } from '@/features/ai/mcpAccess/module.descriptor';
import { ChatModule } from '@/features/ai/chatHub/module.descriptor';
import { InstanceAiModule } from '@/features/ai/instanceAi/module.descriptor';
import { AgentsModule } from '@/features/agents/module.descriptor';
import { OtelModule } from '@/features/settings/otel/module.descriptor';

/**
 * Static manifest of frontend modules. Imports are static (not dynamic) so the
 * bundler still sees every module and can tree-shake normally.
 *
 * This replaces the previously hard-coded array in `moduleInitializer.ts`. When
 * dynamic module loading arrives, this file becomes the generated seam.
 */
export const modules: FrontendModuleDescription[] = [
	InsightsModule,
	DataTableModule,
	MCPModule,
	ChatModule,
	InstanceAiModule,
	AgentsModule,
	OtelModule,
];
