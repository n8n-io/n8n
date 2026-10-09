import { isRecord } from '@n8n/utils/is-record';
import type { ToolSet } from 'ai';

import type { ModelConfig, NativeToolDeferralConfig } from '../../../types/sdk/agent';
import {
	addNativeSearchTool,
	deferLocalTools,
	eagerTools,
	findProviderTool,
	getEffectiveBaseUrl,
	supportsEndpoint,
	type NativeToolDeferral,
} from '../native-tool-deferral';

function supportsModel(model: string): boolean {
	const version = /^gpt-(\d+)(?:\.(\d+))?(?:-([a-z0-9]+)(?:-[a-z0-9]+)*)?$/.exec(model);
	if (!version) return false;
	const major = Number(version[1]);
	const minor = Number(version[2] ?? 0);
	// The GPT-5.4 Nano model documentation excludes tool search.
	if (major === 5 && minor === 4 && version[3] === 'nano') return false;
	return major > 5 || (major === 5 && minor >= 4);
}

function supports(model: string, config: ModelConfig): boolean {
	if (!supportsModel(model)) return false;
	if (isRecord(config) && 'apiStyle' in config && config.apiStyle === 'chat') return false;
	const effectiveUrl = getEffectiveBaseUrl(
		config,
		process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
	);
	return supportsEndpoint(effectiveUrl, 'https://api.openai.com', ['/v1']);
}

async function prepareTools(tools: ToolSet, config: NativeToolDeferralConfig): Promise<ToolSet> {
	const configuredSearch = findProviderTool(tools, ['openai.tool_search']);
	if (configuredSearch?.[1].args.execution === 'client') return eagerTools(tools);

	const { tools: nativeTools, hasDeferredTools } = deferLocalTools(tools, 'openai', config);
	if (!hasDeferredTools) return nativeTools;

	const { openai } = await import('@ai-sdk/openai');
	return addNativeSearchTool(
		nativeTools,
		'openai',
		openai.tools.toolSearch({ execution: 'server' }),
		configuredSearch,
	);
}

export const openAiToolDeferral: NativeToolDeferral = {
	supports,
	prepareTools,
};
