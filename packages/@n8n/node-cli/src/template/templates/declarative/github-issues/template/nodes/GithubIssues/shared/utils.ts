export function parseLinkHeader(header?: string): { [rel: string]: string } {
	const links: { [rel: string]: string } = {};

	for (const part of header?.split(',') ?? []) {
		const section = part.trim();
		const match = section.match(/^<([^>]+)>\s*;\s*rel="?([^"]+)"?/);
		if (match) {
			const [, url, rel] = match;
			links[rel] = url;
		}
	}

	return links;
}
