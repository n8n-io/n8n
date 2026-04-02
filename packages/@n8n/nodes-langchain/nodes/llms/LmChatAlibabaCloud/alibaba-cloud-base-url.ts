export function getBaseUrl(region: string, workspaceId?: string): string {
	const urls: Record<string, string> = {
		'ap-southeast-1': 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
		'us-east-1': 'https://dashscope-us.aliyuncs.com/compatible-mode/v1',
		'cn-beijing': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
		'cn-hongkong': 'https://cn-hongkong.dashscope.aliyuncs.com/compatible-mode/v1',
	};
	if (region === 'eu-central-1') {
		return 'https://' + workspaceId + '.eu-central-1.maas.aliyuncs.com/compatible-mode/v1';
	}
	return urls[region] || urls['ap-southeast-1'];
}

export const BASE_URL_EXPRESSION = `={{ (${getBaseUrl.toString()})($credentials.region, $credentials.workspaceId) }}`;
