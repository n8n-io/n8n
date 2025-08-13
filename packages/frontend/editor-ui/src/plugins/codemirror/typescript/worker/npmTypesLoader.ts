type NPMTreeMeta = {
	default: string;
	files: Array<{ name: string }>;
	moduleName: string;
	version: string;
	useTypes: boolean;
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
	// TODO: check if the package is a types package
	return `/node_modules/@types/${packageName}${fileName}`;
}

export const loadTypes = async (
	packageName: string,
	version: string,
	onFileReceived: (path: string, content: string) => void,
): Promise<void> => {
	const { files, useTypes } = await loadTypesFileTree(packageName, version);
	await Promise.all(
		files
			.filter((file) => isRequiredTypePackageFile(file.name))
			.map(
				async (file) =>
					await loadFileContent(packageName, file.name, version, useTypes).then((content) =>
						onFileReceived(toLocalFilePath(packageName, file.name), content),
					),
			),
	);
};

export const loadTypesFileTree = async (
	packageName: string,
	version: string,
): Promise<NPMTreeMeta> => {
	const response = await jsDelivrApi.getFileTree(`@types/${packageName}`, version);
	if ('status' in response && response.status === 404) {
		return { ...(await jsDelivrApi.getFileTree(`${packageName}`, version)), useTypes: false };
	}

	return { ...response, useTypes: true };
};

export const loadFileContent = async (
	packageName: string,
	fileName: string,
	version = 'latest',
	useTypes = true,
) => {
	return await jsDelivrApi.getFileContent(
		useTypes ? `@types/${packageName}` : packageName,
		fileName,
		version,
	);
};
