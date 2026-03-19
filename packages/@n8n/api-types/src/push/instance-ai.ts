export type InstanceAiPushMessage =
	| {
			type: 'instanceAiGatewayStateChanged';
			data: { connected: boolean; directory: string | null };
	  }
	| {
			type: 'updateInstanceAiCredits';
			data: { creditsQuota: number; creditsClaimed: number };
	  };
