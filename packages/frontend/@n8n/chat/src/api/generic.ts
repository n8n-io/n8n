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

	let responseData;

	try {
		responseData = await response.clone().json();
	} catch (error) {
		responseData = await response.text();
	}

	return responseData as T;
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
	body: Record<string, string | object> = {},
	files: File[] = [],
	options: RequestInit = {},
) {
	const formData = new FormData();

	for (const key in body) {
		const value = body[key];
		if (typeof value === 'object' && value !== null) {
			formData.append(key, JSON.stringify(value));
		} else {
			formData.append(key, value);
		}
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
