const REGION_BASE_URLS: Record<string, string> = {
	'ap-southeast-1': 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
	'us-east-1': 'https://dashscope-us.aliyuncs.com/compatible-mode/v1',
	'cn-beijing': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
	'cn-hongkong': 'https://cn-hongkong.dashscope.aliyuncs.com/compatible-mode/v1',
};

export function getBaseUrl(region: string, workspaceId?: string): string {
	if (region === 'eu-central-1') {
		return `https://${workspaceId}.eu-central-1.maas.aliyuncs.com/compatible-mode/v1`;
	}
	return REGION_BASE_URLS[region] ?? REGION_BASE_URLS['ap-southeast-1'];
}

/**
 * n8n expression that resolves the DashScope base URL from credential fields.
 * Built from the same REGION_BASE_URLS map so the URLs stay in sync with getBaseUrl().
 */
export const BASE_URL_EXPRESSION = `={{ (function() { var urls = ${JSON.stringify(REGION_BASE_URLS)}; if ($credentials.region === "eu-central-1") return "https://" + $credentials.workspaceId + ".eu-central-1.maas.aliyuncs.com/compatible-mode/v1"; return urls[$credentials.region] || urls["ap-southeast-1"]; })() }}`;
