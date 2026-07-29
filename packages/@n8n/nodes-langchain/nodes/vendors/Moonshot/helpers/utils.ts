import type { IBinaryData } from 'n8n-workflow';

export function prepareBinaryPropertyList(data: string | string[] | IBinaryData | IBinaryData[]) {
	if (Array.isArray(data)) return data;
	if (typeof data === 'object') return [data];
	return data
		.split(',')
		.map((item: string) => item.trim())
		.filter((item: string) => item.length > 0);
}
