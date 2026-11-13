import { type UiExtensionView, uiExtensionViewSchema } from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

/** The views of the current user. An entry that is not a valid view is dropped. */
export async function fetchUiExtensionViews(context: IRestApiContext): Promise<UiExtensionView[]> {
	const response: unknown = await makeRestApiRequest(context, 'GET', '/ui-extensions/views');
	if (!Array.isArray(response)) return [];

	return response.flatMap((entry: unknown) => {
		const parsed = uiExtensionViewSchema.safeParse(entry);
		return parsed.success ? [parsed.data] : [];
	});
}
