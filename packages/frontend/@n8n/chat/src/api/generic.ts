async function getAccessToken() {
	return '';
}

export async function authenticatedFetch<T>(...args: Parameters<typeof fetch>): Promise<T> {
	const accessToken = await getAccessToken();

	const body = args[1]?.body;
	const headers: RequestInit['headers'] & { 'Content-Type'?: string } = {
		...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
		...args[1]?.headers,
	};

	// Automatically set content type to application/json if body is FormData
	if (body instanceof FormData) {
		delete headers['Content-Type'];
	} else {
		headers['Content-Type'] = 'application/json';
	}
	const response = await fetch(args[0], {
		...args[1],
		mode: 'cors',
		cache: 'no-cache',
		headers,
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.error('API Error Response:', errorText);
		throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
	}

	const contentType = response.headers.get('content-type') || '';

	try {
		if (contentType.includes('application/json')) {
			const jsonData = await response.json();

			return jsonData as T;
		} else {
			// Handle text/plain or other content types
			const textData = await response.text();

			// Try to parse as JSON first (in case content-type is wrong)
			try {
				const parsedData = JSON.parse(textData);

				return parsedData as T;
			} catch {
				// Return as string if not valid JSON

				return textData as unknown as T;
			}
		}
	} catch (parseError) {
		console.error('API Response Parsing Error:', parseError);
		const fallbackText = await response.text();

		throw new Error(
			`Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
		);
	}
}

export async function get<T>(url: string, query: object = {}, options: RequestInit = {}) {
	let resolvedUrl = url;
	if (Object.keys(query).length > 0) {
		resolvedUrl = `${resolvedUrl}?${new URLSearchParams(
			query as Record<string, string>,
		).toString()}`;
	}

	return await authenticatedFetch<T>(resolvedUrl, { ...options, method: 'GET' });
}

export async function post<T>(url: string, body: object = {}, options: RequestInit = {}) {
	return await authenticatedFetch<T>(url, {
		...options,
		method: 'POST',
		body: JSON.stringify(body),
	});
}
export async function postWithFiles<T>(
	url: string,
	body: Record<string, unknown> = {},
	files: File[] = [],
	options: RequestInit = {},
) {
	const formData = new FormData();

	for (const key in body) {
		formData.append(key, body[key] as string);
	}

	for (const file of files) {
		formData.append('files', file);
	}

	return await authenticatedFetch<T>(url, {
		...options,
		method: 'POST',
		body: formData,
	});
}

export async function put<T>(url: string, body: object = {}, options: RequestInit = {}) {
	return await authenticatedFetch<T>(url, {
		...options,
		method: 'PUT',
		body: JSON.stringify(body),
	});
}

export async function patch<T>(url: string, body: object = {}, options: RequestInit = {}) {
	return await authenticatedFetch<T>(url, {
		...options,
		method: 'PATCH',
		body: JSON.stringify(body),
	});
}

export async function del<T>(url: string, body: object = {}, options: RequestInit = {}) {
	return await authenticatedFetch<T>(url, {
		...options,
		method: 'DELETE',
		body: JSON.stringify(body),
	});
}
