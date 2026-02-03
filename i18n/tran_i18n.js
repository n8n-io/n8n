const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { OpenAI } = require('openai');
const _ = require('lodash');

const CONFIG = {
	baseDir: path.join(__dirname, '../packages'),
	sourceLang: 'en',
	targetLang: 'zh',
	packageNames: ['nodes-langchain', 'i18n', 'nodes-base'],
	cacheFile: path.join(__dirname, '.translation_cache.json'),
	cacheExpireDays: 30,
	openai: {
		baseUrl: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com',
		apiKey: process.env.OPENAI_API_KEY || '',
		model: 'deepseek-chat',
		maxTokens: 4096,
	},
	concurrent: {
		fileConcurrency: Number(process.env.OPENAI_API_CONCURRENT) || 50,
		fileBatchDelay: 100,
		batchSize: 100,
	},
	retry: { delay: 1000, maxTimes: 5 },
};

const SYSTEM_PROMPT = `n8n UI翻译专家。英→中。
术语:Workflow/工作流,Node/节点,Credential/凭据,Execution/执行,Trigger/触发器,Webhook/Webhook,Expression/表达式,Canvas/画布,Resource/资源,Operation/操作,Property/属性,Option/选项。
规则:保留{{var}等占位符,不翻译代码,简洁准确,尊重中国主权,无解释。
返回JSON:{"translations":[{"index":0,"text":"译文"}]}`;

const openai = new OpenAI({ baseURL: CONFIG.openai.baseUrl, apiKey: CONFIG.openai.apiKey });

const translationState = {
	cache: {},
	stats: {
		totalFiles: 0,
		successFiles: 0,
		failedFiles: 0,
		totalFields: 0,
		translatedFields: 0,
		cachedFields: 0,
		failedFields: 0,
		skippedFields: 0,
		apiCalls: 0,
		cacheHits: 0,
	},
};

const PREVIEW_LENGTH = 50;
const preview = (s) => s.substring(0, PREVIEW_LENGTH);

const getCacheKey = (text, context) =>
	crypto.createHash('md5').update(`${text}::${context}`).digest('hex');
const pathExists = (filePath) =>
	fs.access(filePath).then(
		() => true,
		() => false,
	);

const CONTEXT_MAP = {
	header: 'Node header: display name and description',
	nodeView: {
		eventTriggerDescription: 'Trigger node description',
		activationMessage: 'Trigger node activation message',
		properties: {
			displayName: 'Property:',
			description: 'Property description:',
			placeholder: 'Property placeholder:',
			multipleValueButtonText: 'Multiple value button text:',
			action: 'Option action:',
		},
	},
};

const buildTranslationContext = (keyPath) => {
	const parts = keyPath.split('.');
	const [firstPart, secondPart, thirdPart] = parts;

	if (firstPart === 'header') return CONTEXT_MAP.header;

	if (firstPart === 'nodeView' && secondPart) {
		if (CONTEXT_MAP.nodeView[secondPart]) return CONTEXT_MAP.nodeView[secondPart];
		if (thirdPart && CONTEXT_MAP.nodeView.properties[thirdPart]) {
			return `${CONTEXT_MAP.nodeView.properties[thirdPart]} ${secondPart}`;
		}
	}
	return 'n8n UI text';
};

const isExpired = (timestamp) => {
	if (!timestamp) return true;
	const expireTime = CONFIG.cacheExpireDays * 24 * 60 * 60 * 1000;
	return Date.now() - timestamp > expireTime;
};

const saveCacheEntry = (text, context, translated) => {
	translationState.cache[getCacheKey(text, context)] = {
		translation: translated,
		timestamp: Date.now(),
	};
};

const getCachedTranslation = (text, context) => {
	const cacheKey = getCacheKey(text, context);
	const cached = translationState.cache[cacheKey];
	if (isExpired(cached?.timestamp)) {
		delete translationState.cache[cacheKey];
		return null;
	}
	return cached.translation;
};

const shouldRetry = (error, retryTimes) => {
	const { maxTimes } = CONFIG.retry;
	if (retryTimes >= maxTimes) return false;
	if (error.status === 429) return true;
	if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
	return false;
};

const getWaitTime = (error, retryTimes) => {
	const { delay } = CONFIG.retry;
	if (error.status === 429) return delay * (retryTimes + 1);
	if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')
		return delay * Math.pow(2, retryTimes + 1);
	return delay;
};

const handleApiError = async (error, retryTimes, retryFn) => {
	const errorMsg = _.get(error, 'response.data.error.message') || error.message;

	if (error.status === 401) {
		console.error('API认证失败，请检查API Key配置');
		process.exit(1);
	}

	if (shouldRetry(error, retryTimes)) {
		const waitTime = getWaitTime(error, retryTimes);
		const { maxTimes } = CONFIG.retry;
		const errorType = error.status === 429 ? 'API限流' : `网络异常 (${error.code})`;
		console.warn(`${errorType}, 第${retryTimes + 1}/${maxTimes}次重试，等待${waitTime}ms`);
		await _.delay(waitTime);
		return retryFn(retryTimes + 1);
	}

	console.error(`翻译失败（已重试${retryTimes}次）: ${errorMsg}`);
	translationState.stats.failedFields++;
	return null;
};

const parseApiResponse = (responseText) => {
	const patterns = [/```json\n([\s\S]*?)\n```/, /```([\s\S]*?)```/, /\{[\s\S]*\}/];
	const match = patterns.find((pattern) => responseText.match(pattern));
	const jsonStr = match
		? responseText.match(match)[1] || responseText.match(match)[0]
		: responseText;
	const translationData = JSON.parse(jsonStr);
	return translationData.translations || [];
};

const normalizeTranslationText = (text) => {
	if (_.isObject(text) && !_.isNull(text)) return text.text || String(text);
	return text;
};

const translateBatch = async (items, retryTimes = 0) => {
	if (_.isEmpty(items)) return [];

	const toTranslate = _.filter(items, (item) => !item.translation);
	if (_.isEmpty(toTranslate)) return _.map(items, (item) => item.translation || item.originalText);

	const userContent = _.map(toTranslate, (item, idx) => `[${idx}]${item.originalText}`).join('\n');
	console.log(`\n[API] 批次:${toTranslate.length}, 重试:${retryTimes}`);

	try {
		const response = await openai.chat.completions.create({
			model: CONFIG.openai.model,
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'user', content: userContent },
			],
			max_tokens: CONFIG.openai.maxTokens,
		});

		translationState.stats.apiCalls++;
		const responseText = _.get(response, 'choices[0].message.content', '').trim();
		const translations = parseApiResponse(responseText);

		_.forEach(toTranslate, (item, i) => {
			const translation = _.find(translations, (t) => t.index === i);
			const translatedText = normalizeTranslationText(translation?.text);
			if (translatedText) {
				item.translation = translatedText;
				saveCacheEntry(item.originalText, item.context, translatedText);
				translationState.stats.translatedFields++;
				console.log(
					`  [译] ${item.keyPath}: "${preview(item.originalText)}" → "${preview(translatedText)}"`,
				);
			}
		});
		return _.map(items, (item) => item.translation || item.originalText);
	} catch (error) {
		const result = await handleApiError(error, retryTimes, (next) =>
			translateBatch(toTranslate, next),
		);
		if (result !== null) return result;
		_.forEach(toTranslate, (item) => {
			if (!item.translation)
				console.error(`  [败] ${item.keyPath}: "${preview(item.originalText)}..."`);
		});
		return _.map(items, (item) => item.translation || item.originalText);
	}
};

const applyTranslation = (result, item, translation) => {
	if (_.isNumber(item.key) && _.isArray(result) && item.key >= 0 && item.key < result.length) {
		result[item.key] = translation;
	} else {
		result[item.key] = translation;
	}
};

const writeResultFile = async (targetFile, result, batchIndex) => {
	try {
		await fs.mkdir(path.dirname(targetFile), { recursive: true });
		await fs.writeFile(targetFile, JSON.stringify(result, null, 2), 'utf8');
		console.log(`  [存] 批次${batchIndex}: ${path.basename(targetFile)}`);
	} catch (error) {
		console.error(`  [写失败] 批次${batchIndex}: ${error.message}`);
	}
};

const processBatches = async (itemsToTranslate, result, targetFile) => {
	if (_.isEmpty(itemsToTranslate)) return;

	const uniqueItems = _.uniqBy(itemsToTranslate, (item) => `${item.originalText}::${item.context}`);
	const batchSize = CONFIG.concurrent.batchSize;

	for (let batchStart = 0; batchStart < uniqueItems.length; batchStart += batchSize) {
		const batchIndex = batchStart;
		const batch = _.slice(uniqueItems, batchStart, batchStart + batchSize);

		try {
			const translations = await translateBatch(batch);

			_.forEach(batch, (batchItem, batchItemIndex) => {
				const matchingItems = _.filter(
					itemsToTranslate,
					(orig) =>
						orig.originalText === batchItem.originalText && orig.context === batchItem.context,
				);
				_.forEach(matchingItems, (originalItem) => {
					applyTranslation(result, originalItem, translations[batchItemIndex]);
					originalItem.translation = batchItem.translation;
				});
			});

			if (targetFile) await writeResultFile(targetFile, result, batchIndex);
		} catch (error) {
			console.error(`  [批次失败] ${batchIndex}: ${error.message}`);
			_.forEach(batch, (batchItem) => {
				const matchingItems = _.filter(
					itemsToTranslate,
					(orig) =>
						orig.originalText === batchItem.originalText &&
						orig.context === batchItem.context &&
						!orig.translation,
				);
				_.forEach(matchingItems, (originalItem) => {
					console.error(
						`  [败] ${originalItem.keyPath}: "${preview(originalItem.originalText)}..."`,
					);
					applyTranslation(result, originalItem, originalItem.originalText);
					originalItem.translation = originalItem.originalText;
				});
			});
		}
	}
};

const toDotPath = (keyPath) => keyPath.replace(/\[(\d+)\]/g, '.$1');

const translateStructure = async (
	data,
	keyPath = '',
	existingTranslation = {},
	targetFile = null,
) => {
	if (!_.isObject(data) || _.isNull(data)) return data;

	const isArray = _.isArray(data);
	const result = isArray ? [] : {};
	const itemsToTranslate = [];
	const entries = isArray ? _.map(data, (item, idx) => [idx, item]) : _.toPairs(data);

	for (const [keyOrIndex, value] of entries) {
		const currentKeyPath = isArray
			? `${keyPath}[${keyOrIndex}]`
			: keyPath
				? `${keyPath}.${keyOrIndex}`
				: keyOrIndex;
		translationState.stats.totalFields++;

		if (_.isString(value) && !_.isEmpty(value)) {
			const context = buildTranslationContext(currentKeyPath);
			const cachedTranslation = getCachedTranslation(value, context);
			const existingValue = _.get(existingTranslation, toDotPath(currentKeyPath));
			const isTranslated = _.isString(existingValue) && existingValue !== value;

			if (cachedTranslation) {
				result[keyOrIndex] = cachedTranslation;
				translationState.stats.cacheHits++;
				translationState.stats.cachedFields++;
				console.log(
					`  [缓存] ${currentKeyPath}: "${preview(value)}" → "${preview(cachedTranslation)}"`,
				);
			} else if (isTranslated) {
				result[keyOrIndex] = existingValue;
				translationState.stats.skippedFields++;
				console.log(
					`  [已译] ${currentKeyPath}: "${preview(value)}" → "${preview(existingValue)}"`,
				);
			} else {
				itemsToTranslate.push({
					key: keyOrIndex,
					keyPath: currentKeyPath,
					originalText: value,
					context,
					translation: null,
				});
				result[keyOrIndex] = value;
				console.log(`  [待译] ${currentKeyPath}: "${preview(value)}"`);
			}
		} else if (!_.isNull(value) && _.isObject(value)) {
			const existingValue = _.get(existingTranslation, toDotPath(currentKeyPath));
			result[keyOrIndex] = await translateStructure(
				value,
				currentKeyPath,
				existingValue || {},
				targetFile,
			);
		} else {
			result[keyOrIndex] = value;
		}
	}

	await processBatches(itemsToTranslate, result, targetFile);
	return result;
};

const loadCache = async () => {
	try {
		const data = await fs.readFile(CONFIG.cacheFile, 'utf8');
		translationState.cache = JSON.parse(data);
		console.log(`缓存: ${_.size(translationState.cache)} 条`);
	} catch {
		console.log('无缓存，将新建');
		translationState.cache = {};
	}
};

const saveCache = async () => {
	try {
		const validCache = _.pickBy(translationState.cache, (value) => !isExpired(value?.timestamp));
		const expiredCount = _.size(translationState.cache) - _.size(validCache);

		if (expiredCount > 0) {
			console.log(`清理: 移除${expiredCount}条过期`);
			translationState.cache = validCache;
		}

		await fs.writeFile(CONFIG.cacheFile, JSON.stringify(translationState.cache, null, 2));
		console.log('缓存已保存');
	} catch (error) {
		console.error(`保存失败: ${error.message}`);
	}
};

const loadExistingTranslation = async (existingFile) => {
	try {
		const existingContent = await fs.readFile(existingFile, 'utf8');
		const existingData = JSON.parse(existingContent);
		const relPath = path.relative(CONFIG.baseDir, existingFile);
		console.log(`  已有: ${relPath} (${_.size(existingData)}项)`);
		return existingData;
	} catch {
		console.log('  无现有翻译');
		return {};
	}
};

const translateJsonFile = async (sourceFile, targetFile, existingFile = null) => {
	try {
		const relativePath = path.relative(CONFIG.baseDir, sourceFile);
		console.log(`文件: ${relativePath}`);
		const sourceContent = await fs.readFile(sourceFile, 'utf8');
		const sourceData = JSON.parse(sourceContent);
		const existingData =
			existingFile && (await pathExists(existingFile))
				? await loadExistingTranslation(existingFile)
				: {};

		const translatedData = await translateStructure(sourceData, '', existingData, targetFile);

		await fs.mkdir(path.dirname(targetFile), { recursive: true });
		await fs.writeFile(targetFile, JSON.stringify(translatedData, null, 2), 'utf8');

		translationState.stats.successFiles++;
		translationState.stats.totalFiles++;
		console.log(`  ✓ ${path.relative(CONFIG.baseDir, targetFile)}`);
		return true;
	} catch (error) {
		console.error(`失败 ${path.relative(CONFIG.baseDir, sourceFile)}: ${error.message}`);
		translationState.stats.failedFiles++;
		return false;
	}
};

const processJsonFilesBatch = async (sourceDir, targetDir, existingDir, files) => {
	let successCount = 0;
	let failCount = 0;

	for (
		let fileIndex = 0;
		fileIndex < files.length;
		fileIndex += CONFIG.concurrent.fileConcurrency
	) {
		const batch = _.slice(files, fileIndex, fileIndex + CONFIG.concurrent.fileConcurrency);

		await Promise.all(
			_.map(batch, (file) => {
				const sourceFile = path.join(sourceDir, file.name);
				const targetFile = path.join(targetDir, file.name);
				const existingFile = existingDir ? path.join(existingDir, file.name) : null;
				return translateJsonFile(sourceFile, targetFile, existingFile).then((success) => {
					if (success) successCount++;
					else failCount++;
				});
			}),
		);

		if (!_.isEmpty(files)) console.log(`进度: ${successCount + failCount}/${files.length}`);
		if (fileIndex + CONFIG.concurrent.fileConcurrency < files.length)
			await new Promise((resolve) => setTimeout(resolve, CONFIG.concurrent.fileBatchDelay));
	}

	return { successCount, failCount };
};

const batchTranslateJsonFiles = async (sourceDir, targetDir, existingDir = null) => {
	try {
		await fs.mkdir(targetDir, { recursive: true });
		const files = await fs.readdir(sourceDir, { withFileTypes: true });
		const jsonFiles = _.filter(files, (file) => file.isFile() && file.name.endsWith('.json'));
		const subDirs = _.filter(files, (file) => file.isDirectory());

		if (_.isEmpty(jsonFiles) && _.isEmpty(subDirs)) return { successCount: 0, failCount: 0 };

		console.log(`\n目录: ${sourceDir}`);
		if (!_.isEmpty(jsonFiles)) console.log(`JSON: ${jsonFiles.length}个`);
		console.log('='.repeat(50));

		let { successCount, failCount } = await processJsonFilesBatch(
			sourceDir,
			targetDir,
			existingDir,
			jsonFiles,
		);

		for (const subDir of subDirs) {
			const targetSubDirName = subDir.name === CONFIG.sourceLang ? CONFIG.targetLang : subDir.name;
			const subStats = await batchTranslateJsonFiles(
				path.join(sourceDir, subDir.name),
				path.join(targetDir, targetSubDirName),
				existingDir ? path.join(existingDir, targetSubDirName) : null,
			);
			successCount += subStats.successCount;
			failCount += subStats.failCount;
		}

		return { successCount, failCount };
	} catch (error) {
		console.error(`目录失败 ${sourceDir}: ${error.message}`);
		console.error(`错误堆栈: ${error.stack}`);
		return { successCount: 0, failCount: 0 };
	}
};

const processTranslationsDir = async (packageDir, typeLabel) => {
	try {
		const translationsDir = path.join(packageDir, 'translations');
		if (!(await pathExists(translationsDir))) {
			console.warn(`  ${typeLabel} 不存在: ${translationsDir}`);
			return { successCount: 0, failCount: 0 };
		}

		const sourceLangDir = path.join(translationsDir, CONFIG.sourceLang);
		const targetLangDir = path.join(translationsDir, CONFIG.targetLang);

		if (!(await pathExists(sourceLangDir))) {
			console.warn(`  ${typeLabel} ${CONFIG.sourceLang} 不存在: ${sourceLangDir}`);
			return { successCount: 0, failCount: 0 };
		}

		const existingDir = (await pathExists(targetLangDir)) ? targetLangDir : null;
		return await batchTranslateJsonFiles(sourceLangDir, targetLangDir, existingDir);
	} catch (error) {
		console.error(`${typeLabel} 失败: ${error.message}`);
		return { successCount: 0, failCount: 0 };
	}
};

const processPackageNodes = async (packageNodesDir, depth = 0) => {
	let successCount = 0;
	let failCount = 0;

	try {
		const nodes = await fs.readdir(packageNodesDir, { withFileTypes: true });
		const nodeDirs = _.filter(nodes, (file) => file.isDirectory() && !file.name.startsWith('.'));
		console.log(`  节点: ${nodeDirs.length}个`);

		for (let nodeIndex = 0; nodeIndex < nodeDirs.length; nodeIndex++) {
			const nodeDir = nodeDirs[nodeIndex];
			const nodePath = path.join(packageNodesDir, nodeDir.name);

			const hasTranslationsDir = await pathExists(path.join(nodePath, 'translations'));
			if (hasTranslationsDir) {
				const progress = (((nodeIndex + 1) / nodeDirs.length) * 100).toFixed(1);
				const indent = '  '.repeat(depth + 1);
				console.log(`\n${indent}${nodeDir.name} [${progress}%]`);
				const stats = await processTranslationsDir(nodePath, '节点');
				successCount += stats.successCount;
				failCount += stats.failCount;
			} else {
				const subStats = await processPackageNodes(nodePath, depth + 1);
				successCount += subStats.successCount;
				failCount += subStats.failCount;
			}
		}
	} catch (error) {
		console.error(`节点目录失败: ${error.message}`);
	}

	return { successCount, failCount };
};

const processI18nPackage = async (i18nPackageDir) => {
	try {
		const localesDir = path.join(i18nPackageDir, 'src', 'locales');
		if (!(await pathExists(localesDir))) {
			console.warn(`  i18n locales 不存在: ${localesDir}`);
			return { successCount: 0, failCount: 0 };
		}

		const sourceFile = path.join(localesDir, `${CONFIG.sourceLang}.json`);
		const targetFile = path.join(localesDir, `${CONFIG.targetLang}.json`);

		if (!(await pathExists(sourceFile))) {
			console.warn(`  ${CONFIG.sourceLang}.json 不存在: ${sourceFile}`);
			return { successCount: 0, failCount: 0 };
		}

		console.log(`\ni18n 包`);
		console.log('='.repeat(50));
		const success = await translateJsonFile(
			sourceFile,
			targetFile,
			(await pathExists(targetFile)) ? targetFile : null,
		);
		return { successCount: success ? 1 : 0, failCount: success ? 0 : 1 };
	} catch (error) {
		console.error(`i18n 失败: ${error.message}`);
		return { successCount: 0, failCount: 1 };
	}
};

const generateTranslationReport = () => {
	const stats = translationState.stats;
	console.log('\n' + '='.repeat(60));
	console.log('翻译完成!');
	console.log('='.repeat(60));
	console.log('统计:');
	console.log(`  文件: ${stats.successFiles}/${stats.totalFiles}`);
	console.log(`  字段: ${stats.translatedFields}/${stats.totalFields}`);
	console.log(`  缓存: ${stats.cachedFields}`);
	console.log(`  跳过: ${stats.skippedFields}`);
	console.log(`  失败: ${stats.failedFields}`);
	console.log(`  命中: ${stats.cacheHits}, API: ${stats.apiCalls}`);
	return stats;
};

const validateConfig = () => {
	if (
		!CONFIG.openai.apiKey ||
		CONFIG.openai.apiKey === 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
	) {
		console.error('请配置有效的 API Key');
		console.log('在代码中设置 CONFIG.openai.apiKey');
		console.log('环境变量: OPENAI_BASE_URL, OPENAI_API_CONCURRENT');
		process.exit(1);
	}
};

const printConfig = () => {
	console.log('n8n 翻译脚本 V4\n');
	console.log(`源: ${CONFIG.sourceLang}, 目: ${CONFIG.targetLang}`);
	console.log(`包: ${CONFIG.packageNames.join(', ')}`);
	console.log(`模型: ${CONFIG.openai.model}`);
	console.log(`API: ${CONFIG.openai.baseUrl}`);
	console.log(`并发: ${CONFIG.concurrent.fileConcurrency}, 批次: ${CONFIG.concurrent.batchSize}`);
	console.log('='.repeat(60));
};

const printPackageStats = (packageStats) => {
	console.log('='.repeat(60));
	console.log('摘要:');
	console.log('='.repeat(60));
	for (const [packageName, stats] of Object.entries(packageStats)) {
		if (packageName === 'i18n') {
			console.log(`${packageName}: ${stats.successCount}成功, ${stats.failCount}失败`);
		} else {
			console.log(
				`${packageName}: 节点${stats.nodes.successCount}/${stats.nodes.failCount}, 凭据${stats.credentials.successCount}/${stats.credentials.failCount}`,
			);
		}
	}
	console.log(`耗时: ${((Date.now() - global.startTime) / 1000).toFixed(2)}秒`);
};

const processPackage = async (packageName) => {
	console.log(`包: ${packageName}`);
	console.log('='.repeat(60));

	if (packageName === 'i18n') {
		const i18nDir = path.join(CONFIG.baseDir, 'frontend', '@n8n', 'i18n');
		if (await pathExists(i18nDir)) {
			return await processI18nPackage(i18nDir);
		} else {
			console.warn(`i18n 不存在: ${i18nDir}`);
			return { successCount: 0, failCount: 0 };
		}
	}

	const actualPackageName =
		packageName === 'nodes-langchain' ? '@n8n/nodes-langchain' : packageName;
	const packageNodesDir = path.join(CONFIG.baseDir, actualPackageName, 'nodes');
	const packageCredsDir = path.join(CONFIG.baseDir, actualPackageName, 'credentials');
	const stats = {
		nodes: { successCount: 0, failCount: 0 },
		credentials: { successCount: 0, failCount: 0 },
	};

	if (await pathExists(packageNodesDir)) {
		console.log('节点...');
		stats.nodes = await processPackageNodes(packageNodesDir);
	} else {
		console.warn(`节点不存在: ${packageNodesDir}`);
	}

	if (await pathExists(packageCredsDir)) {
		console.log('凭据...');
		stats.credentials = await processTranslationsDir(packageCredsDir, '凭据');
	} else {
		console.warn(`凭据不存在: ${packageCredsDir}`);
	}

	return stats;
};

const main = async () => {
	global.startTime = Date.now();

	validateConfig();
	printConfig();
	await loadCache();

	const packageStats = {};

	for (const packageName of CONFIG.packageNames) {
		packageStats[packageName] = await processPackage(packageName);
	}

	generateTranslationReport();
	await saveCache();
	printPackageStats(packageStats);
};

if (require.main === module) {
	main().catch((error) => {
		console.error('异常:', error.stack || error.message);
		process.exit(1);
	});
}

module.exports = { translateStructure, translateJsonFile };
