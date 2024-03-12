/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
/* eslint-disable n8n-nodes-base/node-param-options-type-unsorted-items */
import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

/**
 * These methods return mock data so we can play with the nodes in n8n UI.
 * In reality we will probably not use these methods - HB frontend will send the method name to HB backend,
 * and HB backend will resolve the query directly (instead of sending the method name to n8n which will use this code
 * to send a request to HB backend). See:
 */
export async function getPipelineStages(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return [
		{
			name: 'Inquiry',
			value: '1',
		},
		{
			name: 'Proposal sent',
			value: '2',
		},
	];
}

export async function getEmailTemplates(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return [
		{
			name: 'Welcome email',
			value: '1',
		},
		{
			name: 'Get ready email',
			value: '2',
		},
	];
}

export async function getFileTemplates(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return [
		{
			name: 'Invoice template',
			value: '1',
		},
		{
			name: 'Full proposal template',
			value: '2',
		},
	];
}

export async function getTeamMembers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return [
		{
			name: 'John Doe',
			value: '1',
		},
		{
			name: 'Bob Smith',
			value: '2',
		},
	];
}
