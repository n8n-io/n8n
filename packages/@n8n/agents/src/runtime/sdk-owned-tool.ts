import type { BuiltTool } from '../types/sdk/tool';

export const SDK_OWNED_BUILTIN_TOOL_METADATA_KEY = 'sdkOwnedBuiltinTool';

export function isSdkOwnedBuiltInTool(tool: BuiltTool): boolean {
	return tool.metadata?.[SDK_OWNED_BUILTIN_TOOL_METADATA_KEY] === true;
}

export function withSdkOwnedBuiltInMetadata(tool: BuiltTool): BuiltTool {
	return {
		...tool,
		metadata: {
			...tool.metadata,
			[SDK_OWNED_BUILTIN_TOOL_METADATA_KEY]: true,
		},
	};
}
