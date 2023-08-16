import type { IDataObject } from 'n8n-workflow';

export async function runExternalHook(eventName: string, metadata?: IDataObject) {
	if (!window.n8nExternalHooks) {
		return;
	}

	const [resource, operator] = eventName.split('.');

	if (window.n8nExternalHooks[resource]?.[operator]) {
		const hookMethods = window.n8nExternalHooks[resource][operator];

		for (const hookMethod of hookMethods) {
			await hookMethod(metadata);
		}
	}
}
