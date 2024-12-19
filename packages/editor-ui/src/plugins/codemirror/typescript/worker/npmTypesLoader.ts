type NPMTreeMeta = {
	default: string;
	files: Array<{ name: string }>;
	moduleName: string;
	version: string;
};

export const loadTypes = async (
	packageName: string,
	version: string,
	onFileReceived: (path: string, content: string) => void,
): Promise<void> => {
	const { files } = await loadTypesFileTree(packageName, version);
	await Promise.all(
		files
			.filter(({ name }) => name.endsWith('.d.ts') || name === '/package.json')
			.map(
				async ({ name }) =>
					await loadFileContent(name).then((content) =>
						onFileReceived(`/node_modules/@types/luxon${name}`, content),
					),
			),
	);
};

export const loadTypesFileTree = async (
	packageName: string,
	version: string,
): Promise<NPMTreeMeta> => {
	const url = `https://data.jsdelivr.com/v1/package/npm/@types/${packageName}@${version}/flat`;
	const res = await fetch(url);
	return await res.json();
};

export const loadFileContent = async (file: string) => {
	const url = `https://cdn.jsdelivr.net/npm/@types/luxon@3.2.0${file}`;
	return await fetch(url).then(async (res) => await res.text());
};
