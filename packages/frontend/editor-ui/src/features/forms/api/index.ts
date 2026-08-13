import { BROWSER_ID_STORAGE_KEY } from '@n8n/constants';

export async function fetchFormPreview(
	restUrl: string,
	params: {
		formTitle: string;
		formDescription: string;
		formFields: unknown[];
		buttonLabel?: string;
		nodeVersion?: number;
		customCss?: string;
		appendAttribution?: boolean;
		isCompletion?: boolean;
	},
): Promise<string | null> {
	const browserId = localStorage.getItem(BROWSER_ID_STORAGE_KEY) ?? '';

	const response = await fetch(`${restUrl}/form-preview`, {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'browser-id': browserId,
		},
		body: JSON.stringify(params),
	});

	if (!response.ok) return null;

	return await response.text();
}
