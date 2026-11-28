export function resolveClientHeader<Client extends string>({
	headerValue,
	clientByHeaderValue,
	fallback,
}: {
	headerValue: string | string[] | undefined;
	clientByHeaderValue: ReadonlyMap<string, Client>;
	fallback: Client;
}): Client {
	const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
	const normalizedValue = value?.trim().toLowerCase();

	if (normalizedValue === undefined) {
		return fallback;
	}

	return clientByHeaderValue.get(normalizedValue) ?? fallback;
}
