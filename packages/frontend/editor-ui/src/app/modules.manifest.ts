import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import { DataTableModule } from '@/features/core/dataTable/module.descriptor';
import { InsightsModule } from '@/features/execution/insights/module.descriptor';
import { MCPModule } from '@/features/ai/mcpAccess/module.descriptor';
import { ChatModule } from '@/features/ai/chatHub/module.descriptor';
import { InstanceAiModule } from '@/features/ai/instanceAi/module.descriptor';
import { AgentsModule } from '@/features/agents/module.descriptor';
import { OtelModule } from '@/features/settings/otel/module.descriptor';

/**
 * Hard-coding modules list until we have a dynamic way to load modules.
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
