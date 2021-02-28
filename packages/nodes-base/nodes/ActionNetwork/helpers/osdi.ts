export const createIdentifierDictionary = (ids: string[]) => ids.reduce(
	(dict, id: string) => {
		try {
			const [prefix, suffix] = id.split(':');
			dict[prefix] = suffix;
		} catch (e) {}
		return dict;
	},
	{} as { [source: string]: string }
)
