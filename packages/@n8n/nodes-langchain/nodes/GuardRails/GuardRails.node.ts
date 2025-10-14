import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';
import { versionDescription } from './description';

export class GuardRails implements INodeType {
	description = versionDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		throw new Error('Not implemented');
		return [[]];
	}
}
