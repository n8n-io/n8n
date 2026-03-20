export type InstanceAiPushMessage = {
	type: 'instanceAiGatewayStateChanged';
	data: {
		connected: boolean;
		directory: string | null;
		hostIdentifier: string | null;
		toolCategories: string[];
	};
};
