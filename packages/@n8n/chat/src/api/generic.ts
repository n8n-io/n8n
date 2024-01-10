async function getAccessToken() {
	return '';
}

export async function authenticatedFetch<T>(...args: Parameters<typeof fetch>): Promise<T> {
	const accessToken = await getAccessToken();

	const response = await fetch(args[0], {
		...args[1],
		mode: 'cors',
		cache: 'no-cache',
		headers: {
			'Content-Type': 'application/json',
			...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
			...args[1]?.headers,
		},
	});

	return (await response.json()) as Promise<T>;
}

export async function get<T>(url: string, query: object = {}, options: RequestInit = {}) {
	let resolvedUrl = url;
	if (Object.keys(query).length > 0) {
		resolvedUrl = `${resolvedUrl}?${new URLSearchParams(
			query as Record<string, string>,
		).toString()}`;
	}

	return authenticatedFetch<T>(resolvedUrl, { ...options, method: 'GET' });
}

export async function post<T>(url: string, body: object = {}, options: RequestInit = {}) {
	return authenticatedFetch<T>(url, {
		...options,
		method: 'POST',
		body: JSON.stringify(body),
	});
}

export async function put<T>(url: string, body: object = {}, options: RequestInit = {}) {
	return authenticatedFetch<T>(url, {
		...options,
		method: 'PUT',
		body: JSON.stringify(body),
	});
}

export async function patch<T>(url: string, body: object = {}, options: RequestInit = {}) {
	return authenticatedFetch<T>(url, {
		...options,
		method: 'PATCH',
		body: JSON.stringify(body),
	});
}

export async function del<T>(url: string, body: object = {}, options: RequestInit = {}) {
	return authenticatedFetch<T>(url, {
		...options,
		method: 'DELETE',
		body: JSON.stringify(body),
	});
}
