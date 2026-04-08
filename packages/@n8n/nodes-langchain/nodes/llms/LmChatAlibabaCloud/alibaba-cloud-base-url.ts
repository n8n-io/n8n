const REGION_BASE_HOSTS: Record<string, string> = {
	'ap-southeast-1': 'https://dashscope-intl.aliyuncs.com',
	'us-east-1': 'https://dashscope-us.aliyuncs.com',
	'cn-beijing': 'https://dashscope.aliyuncs.com',
	'cn-hongkong': 'https://cn-hongkong.dashscope.aliyuncs.com',
};

const COMPATIBLE_MODE_SUFFIX = '/compatible-mode/v1';

export function getBaseHost(region: string, workspaceId?: string): string {
	if (region === 'eu-central-1') {
		return `https://${workspaceId}.eu-central-1.maas.aliyuncs.com`;
	}
	return REGION_BASE_HOSTS[region] ?? REGION_BASE_HOSTS['ap-southeast-1'];
}

export function getBaseUrl(region: string, workspaceId?: string): string {
	return getBaseHost(region, workspaceId) + COMPATIBLE_MODE_SUFFIX;
}

export const BASE_URL_EXPRESSION = `={{ (() => {
	const hosts = ${JSON.stringify(REGION_BASE_HOSTS)};
	const region = $credentials.region;
	if (region === 'eu-central-1') {
		return 'https://' + $credentials.workspaceId + '.eu-central-1.maas.aliyuncs.com' + '${COMPATIBLE_MODE_SUFFIX}';
	}
	return (hosts[region] || hosts['ap-southeast-1']) + '${COMPATIBLE_MODE_SUFFIX}';
})() }}`;
