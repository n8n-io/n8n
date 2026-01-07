type NPMTreeMeta = {
	default: string;
	files: Array<{ name: string }>;
	moduleName: string;
	version: string;
};

const jsDelivrApi = {
	async getFileTree(packageName: string, version = 'latest'): Promise<NPMTreeMeta> {
		const url = `https://data.jsdelivr.com/v1/package/npm/${packageName}@${version}/flat`;
		const res = await fetch(url);
		return await res.json();
	},
	async getFileContent(packageName: string, fileName: string, version = 'latest'): Promise<string> {
		const url = `https://cdn.jsdelivr.net/npm/${packageName}@${version}${fileName}`;
		const res = await fetch(url);
		return await res.text();
	},
};

function isRequiredTypePackageFile(fileName: string) {
	return fileName.endsWith('.d.ts') || fileName === '/package.json';
}

function toLocalFilePath(packageName: string, fileName: string) {
	return `/node_modules/@types/${packageName}${fileName}`;
}

export const loadTypes = async (
	packageName: string,
	version: string,
	onFileReceived: (path: string, content: string) => void,
): Promise<void> => {
	const { files } = await loadTypesFileTree(packageName, version);
	await Promise.all(
		files
			.filter((file) => isRequiredTypePackageFile(file.name))
			.map(
				async (file) =>
					await loadFileContent(packageName, file.name, version).then((content) =>
						onFileReceived(toLocalFilePath(packageName, file.name), content),
					),
			),
	);
};

export const loadTypesFileTree = async (
	packageName: string,
	version: string,
): Promise<NPMTreeMeta> => {
	return await jsDelivrApi.getFileTree(`@types/${packageName}`, version);
};

export const loadFileContent = async (
	packageName: string,
	fileName: string,
	version = 'latest',
) => {
	return await jsDelivrApi.getFileContent(`@types/${packageName}`, fileName, version);
};
