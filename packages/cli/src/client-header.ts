export function resolveClientHeader<Client extends string>(
	header: string | string[] | undefined,
	clientByHeaderValue: ReadonlyMap<string, Client>,
	fallback: Client,
): Client {
	const value = Array.isArray(header) ? header[0] : header;
	const normalizedValue = value?.trim().toLowerCase();

	if (normalizedValue === undefined) {
		return fallback;
	}

	return clientByHeaderValue.get(normalizedValue) ?? fallback;
}
