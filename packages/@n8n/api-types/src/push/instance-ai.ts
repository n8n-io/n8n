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
			data: {
				creditsQuota: number;
				creditsClaimed: number;
				// Present only on a per-message claim that carries the acting thread's
				// running total (decimal). Grouped so the thread id and its total always
				// travel together — never one without the other.
				creditsPerThread?: {
					threadId: string;
					totalCreditsUsed: number;
				};
			};
	  };
