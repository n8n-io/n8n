import type { INodeProperties } from 'n8n-workflow';

export function shouldShowParameter(item: INodeProperties): boolean {
	return item.name.match(/resource|authentication|operation/i) === null;
}
