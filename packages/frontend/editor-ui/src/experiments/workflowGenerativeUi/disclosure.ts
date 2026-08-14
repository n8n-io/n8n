function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export function disclosureStatePath(parts: Array<string | null | undefined>): string {
	const combined = parts
		.map((part) => (part ?? '').trim())
		.filter((part) => part.length > 0)
		.join('|');
	return `/disclosure/${slugify(combined) || 'item'}`;
}
