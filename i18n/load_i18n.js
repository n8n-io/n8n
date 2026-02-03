const fsPromises = require('fs').promises;
const path = require('path');

const config = {
	rootDir: path.resolve(__dirname, '..'),
	packages: [
		{ name: 'nodes-base', path: 'packages/nodes-base' },
		{ name: 'nodes-langchain', path: 'packages/@n8n/nodes-langchain' },
	],
	locale: 'en',
};

const summary = {
	totalNodes: 0,
	successNodes: 0,
	errorNodes: 0,
	totalCredentials: 0,
	successCredentials: 0,
	errorCredentials: 0,
};

function getCredentialTranslationPath(credentialSourcePath, credentialName, pkgPath) {
	const absolutePath = path.resolve(pkgPath, credentialSourcePath);
	let credentialDir = path.dirname(absolutePath);
	credentialDir = credentialDir.replace('/dist/credentials', '/credentials');
	return path.join(credentialDir, 'translations', config.locale, `${credentialName}.json`);
}

function isVersionedDirname(name) {
	const ALLOWED_VERSIONED_DIRNAME_LENGTH = [2, 3];
	return (
		ALLOWED_VERSIONED_DIRNAME_LENGTH.includes(name.length) && name.toLowerCase().startsWith('v')
	);
}

function deepMerge(target, source) {
	const output = Object.assign({}, target);
	if (isObject(target) && isObject(source)) {
		Object.keys(source).forEach((key) => {
			if (isObject(source[key])) {
				if (!(key in target)) {
					Object.assign(output, { [key]: source[key] });
				} else {
					output[key] = deepMerge(target[key], source[key]);
				}
			} else {
				Object.assign(output, { [key]: source[key] });
			}
		});
	}
	return output;
}

function isObject(item) {
	return item && typeof item === 'object' && !Array.isArray(item);
}

async function getMaxVersion(dir) {
	try {
		const entries = await fsPromises.readdir(dir, { withFileTypes: true });
		const dirnames = entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.filter((name) => isVersionedDirname(name));

		if (dirnames.length === 0) return null;
		return Math.max(...dirnames.map((d) => parseInt(d.charAt(1), 10)));
	} catch (error) {
		return null;
	}
}

async function getTranslationPath(nodeSourcePath, nodeType, pkgPath, versionKey = null) {
	const absolutePath = path.resolve(pkgPath, nodeSourcePath);
	let nodeDir = path.dirname(absolutePath);

	if (nodeDir.includes('/dist/nodes/')) {
		nodeDir = nodeDir.replace('/dist/nodes/', '/nodes/');
	}

	if (versionKey) {
		const possibleDirs = [
			`v${versionKey}`,
			`V${versionKey}`,
			`v${versionKey.split('.')[0]}`,
			`V${versionKey.split('.')[0]}`,
		];

		for (const versionDirName of possibleDirs) {
			const versionDirPath = path.join(nodeDir, versionDirName);
			try {
				await fsPromises.access(versionDirPath);
				return path.join(versionDirPath, 'translations', config.locale, `${nodeType}.json`);
			} catch (error) {
				continue;
			}
		}
		return null;
	}

	const maxVersion = await getMaxVersion(nodeDir);
	return maxVersion
		? path.join(nodeDir, `v${maxVersion}`, 'translations', config.locale, `${nodeType}.json`)
		: path.join(nodeDir, 'translations', config.locale, `${nodeType}.json`);
}

function extractPropertyTranslation(prop) {
	const result = {};

	if (prop.displayName) result.displayName = prop.displayName;
	if (prop.description) result.description = prop.description;
	if (prop.placeholder) result.placeholder = prop.placeholder;

	if (prop.type === 'options' && Array.isArray(prop.options)) {
		result.options = {};
		prop.options.forEach((opt) => {
			if (opt.name && opt.value !== undefined) {
				const optKey = String(opt.value);
				result.options[optKey] = {};
				if (opt.name) {
					result.options[optKey].displayName = opt.name;
				}
				if (opt.description) {
					result.options[optKey].description = opt.description;
				}
			}
		});
	}

	if (prop.type === 'fixedCollection' && prop.options) {
		if (prop.typeOptions?.multipleValues) {
			result.multipleValueButtonText =
				prop.typeOptions.multipleValueButtonText || prop.placeholder || 'Add';
		}
		result.options = {};
		result.values = {};
		for (const option of prop.options) {
			if (option.name) {
				result.options[option.name] = {
					displayName: option.displayName || option.name,
				};
				result.values[option.name] = {
					displayName: option.displayName || option.name,
				};
				if (Array.isArray(option.values)) {
					const optionsPath = option.name === 'values' ? 'values' : 'options';
					result.values[option.name][optionsPath] = {};
					result.options[option.name][optionsPath] = {};
					option.values.forEach((subProp) => {
						const subResult = extractPropertyTranslation(subProp);
						result.values[option.name][optionsPath][subProp.name] = subResult;
						result.options[option.name][optionsPath][subProp.name] = subResult;
					});
				}
			}
		}
		result.values[prop.name] = {
			displayName: prop.displayName || prop.name,
			placeholder: prop.placeholder,
		};
	}

	if (prop.type === 'collection') {
		if (prop.typeOptions?.multipleValues) {
			result.multipleValueButtonText =
				prop.typeOptions.multipleValueButtonText || prop.placeholder || 'Add';
		}
		if (Array.isArray(prop.typeOptions?.values)) {
			result.values = [];
			prop.typeOptions.values.forEach((subProp) => {
				const subResult = extractPropertyTranslation(subProp);
				result.values.push({ [subProp.name]: subResult });
			});
		} else if (Array.isArray(prop.options)) {
			result.options = {};
			prop.options.forEach((subProp) => {
				const subResult = extractPropertyTranslation(subProp);
				result.options[subProp.name] = subResult;
			});
		}
	}

	return result;
}

async function extractNodeTranslation(nodeDescription) {
	try {
		const descriptionCopy = JSON.parse(JSON.stringify(nodeDescription));

		const translation = {
			header: {
				displayName: descriptionCopy.displayName,
				description: descriptionCopy.description,
			},
			nodeView: {},
		};

		if (Array.isArray(descriptionCopy.properties)) {
			descriptionCopy.properties.forEach((prop) => {
				const result = extractPropertyTranslation(prop);
				if (Object.keys(result).length > 0) {
					if (!translation.nodeView[prop.name]) {
						translation.nodeView[prop.name] = result;
					} else {
						translation.nodeView[prop.name] = deepMerge(translation.nodeView[prop.name], result);
					}
				}
			});
		}

		return translation;
	} catch (error) {
		console.error(`  ✗ 翻译提取失败: ${error.message}`);
		return null;
	}
}

async function extractCredentialTranslation(credentialType) {
	try {
		const credentialCopy = JSON.parse(JSON.stringify(credentialType));
		const translation = {};

		if (Array.isArray(credentialCopy.properties)) {
			credentialCopy.properties.forEach((prop) => {
				const result = extractPropertyTranslation(prop);
				if (Object.keys(result).length > 0) {
					translation[prop.name] = result;
				}
			});
		}

		return translation;
	} catch (error) {
		console.error(`  ✗ 凭据翻译提取失败: ${error.message}`);
		return null;
	}
}

async function processPackage(pkg) {
	console.log(`\n处理包: ${pkg.name}`);
	const pkgPath = path.resolve(config.rootDir, pkg.path);
	const pkgJsonPath = path.join(pkgPath, 'package.json');

	try {
		await fsPromises.access(pkgJsonPath);
	} catch (error) {
		console.log(`  ⊘ 跳过（package.json 不存在）`);
		return;
	}

	const {
		PackageDirectoryLoader,
	} = require('../packages/core/dist/nodes-loader/package-directory-loader.js');

	try {
		const loader = new PackageDirectoryLoader(pkgPath, [], []);
		await loader.loadAll();

		const nodeNames = Object.keys(loader.nodeTypes);
		console.log(`  找到 ${nodeNames.length} 个节点`);

		for (const nodeType of nodeNames) {
			summary.totalNodes++;
			try {
				const nodeData = loader.nodeTypes[nodeType];
				const sourcePath = nodeData.sourcePath;

				if ('nodeVersions' in nodeData.type) {
					for (const [versionKey, versionNode] of Object.entries(nodeData.type.nodeVersions)) {
						const translationPath = await getTranslationPath(
							sourcePath,
							nodeType,
							pkgPath,
							versionKey,
						);

						if (!translationPath) continue;

						const nodeDescription = versionNode.description;
						const translation = await extractNodeTranslation(nodeDescription);

						if (!translation) {
							summary.errorNodes++;
							continue;
						}

						await fsPromises.mkdir(path.dirname(translationPath), { recursive: true });
						await fsPromises.writeFile(
							translationPath,
							JSON.stringify(translation, null, 2),
							'utf8',
						);

						summary.successNodes++;
						console.log(`  ✓ ${nodeType} v${versionKey} -> ${translationPath}`);
					}
				} else {
					const nodeDescription = nodeData.type.description;
					const translation = await extractNodeTranslation(nodeDescription);

					if (!translation) {
						summary.errorNodes++;
						continue;
					}

					const translationPath = await getTranslationPath(sourcePath, nodeType, pkgPath);
					await fsPromises.mkdir(path.dirname(translationPath), { recursive: true });
					await fsPromises.writeFile(translationPath, JSON.stringify(translation, null, 2), 'utf8');

					summary.successNodes++;
					console.log(`  ✓ ${nodeType} -> ${translationPath}`);
				}
			} catch (error) {
				summary.errorNodes++;
				console.error(`  ✗ ${nodeType} 失败: ${error.message}`);
				if (error.stack) {
					console.error(`    Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
				}
			}
		}

		const credentialNames = Object.keys(loader.credentialTypes);
		console.log(`  找到 ${credentialNames.length} 个凭据`);

		for (const credentialName of credentialNames) {
			summary.totalCredentials++;
			try {
				const credentialData = loader.credentialTypes[credentialName];
				const sourcePath = credentialData.sourcePath;
				const credentialType = credentialData.type;

				const translation = await extractCredentialTranslation(credentialType);

				if (!translation) {
					summary.errorCredentials++;
					continue;
				}

				const translationPath = getCredentialTranslationPath(sourcePath, credentialName, pkgPath);
				await fsPromises.mkdir(path.dirname(translationPath), { recursive: true });
				await fsPromises.writeFile(translationPath, JSON.stringify(translation, null, 2), 'utf8');

				summary.successCredentials++;
				console.log(`  ✓ ${credentialName} -> ${translationPath}`);
			} catch (error) {
				summary.errorCredentials++;
				console.error(`  ✗ ${credentialName} 失败: ${error.message}`);
				if (error.stack) {
					console.error(`    Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
				}
			}
		}
	} catch (error) {
		console.error(`  ✗ 加载器初始化失败: ${error.message}`);
	}
}

async function main() {
	console.log('=== n8n 节点和凭据 i18n 资源提取器 v8.0 (使用PackageDirectoryLoader) ===');
	console.log(`目标语言: ${config.locale}`);
	console.log(`工作目录: ${config.rootDir}`);

	for (const pkg of config.packages) {
		await processPackage(pkg);
	}

	console.log('\n=== 执行摘要 ===');
	console.log(`总节点数: ${summary.totalNodes}`);
	console.log(`节点成功: ${summary.successNodes}`);
	console.log(`节点失败: ${summary.errorNodes}`);
	console.log(`总凭据数: ${summary.totalCredentials}`);
	console.log(`凭据成功: ${summary.successCredentials}`);
	console.log(`凭据失败: ${summary.errorCredentials}`);
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
