import type { AgentConfigValidationCapabilityRef } from '@n8n/api-types';
import type { NodeIconSource } from '@/features/shared/toolsConnection/types';
import type { IconName } from '@n8n/design-system';

export interface AgentVisualizationNode {
	id: string;
	label: string;
	icon: IconName;
	iconSource?: NodeIconSource;
	description?: string;
	editSection?: string;
	capability?: AgentConfigValidationCapabilityRef;
	addActions?: Array<{ id: string; label: string }>;
	children?: AgentVisualizationNode[];
	content?: string;
	configuration?: unknown;
	inactive?: boolean;
	activity?: {
		toolNames?: string[];
		toolPrefix?: string;
		skillId?: string;
		fileId?: string;
	};
}
