import type { ToolCategory } from '../schemas/instance-ai.schema';

export type InstanceAiPushMessage =
	| {
			type: 'instanceAiGatewayStateChanged';
			data: {
				connected: boolean;
				directory: string | null;
				hostIdentifier: string | null;
				toolCategories: ToolCategory[];
			};
	  }
	| {
			type: 'updateInstanceAiCredits';
			data: { creditsQuota: number; creditsClaimed: number };
	  };
