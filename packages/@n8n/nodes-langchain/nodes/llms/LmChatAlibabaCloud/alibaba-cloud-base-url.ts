export const REGION_BASE_HOSTS: Record<string, string> = {
	'ap-southeast-1': 'https://dashscope-intl.aliyuncs.com',
	'us-east-1': 'https://dashscope-us.aliyuncs.com',
	'cn-beijing': 'https://dashscope.aliyuncs.com',
	'cn-hongkong': 'https://cn-hongkong.dashscope.aliyuncs.com',
};

const COMPATIBLE_MODE_SUFFIX = '/compatible-mode/v1';

export function getBaseUrl(region: string, workspaceId?: string): string {
	if (region === 'eu-central-1') {
		return `https://${workspaceId}.eu-central-1.maas.aliyuncs.com${COMPATIBLE_MODE_SUFFIX}`;
	}
	return (
		(REGION_BASE_HOSTS[region] ?? REGION_BASE_HOSTS['ap-southeast-1']) + COMPATIBLE_MODE_SUFFIX
	);
}

// Inline the hosts map via JSON.stringify so the expression is self-contained
// while REGION_BASE_HOSTS remains the single source of truth.
export const BASE_URL_EXPRESSION = `={{ (() => {
	const hosts = ${JSON.stringify(REGION_BASE_HOSTS)};
	const region = $credentials.region;
	if (region === 'eu-central-1') {
		return 'https://' + $credentials.workspaceId + '.eu-central-1.maas.aliyuncs.com/compatible-mode/v1';
	}
	return (hosts[region] || hosts['ap-southeast-1']) + '/compatible-mode/v1';
})() }}`;
