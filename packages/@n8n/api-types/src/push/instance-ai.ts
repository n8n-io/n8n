export type InstanceAiPushMessage = {
	type: 'instanceAiGatewayStateChanged';
	data: { connected: boolean; directory: string | null };
};
