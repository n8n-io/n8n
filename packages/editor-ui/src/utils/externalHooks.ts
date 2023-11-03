import type { IDataObject } from 'n8n-workflow';
import type { ExternalHooks, GenericExternalHooksContext } from '@/types/externalHooks';

export async function runExternalHook(eventName: string, metadata?: IDataObject) {
	if (!window.n8nExternalHooks) {
		return;
	}

	const [resource, operator] = eventName.split('.') as [
		keyof ExternalHooks,
		keyof ExternalHooks[keyof ExternalHooks],
	];

	const context = window.n8nExternalHooks[resource] as GenericExternalHooksContext;
	if (context?.[operator]) {
		const hookMethods = context[operator];

		for (const hookMethod of hookMethods) {
			await hookMethod(metadata as IDataObject);
		}
	}
}
