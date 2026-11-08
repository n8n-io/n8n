import { isRecord } from '@n8n/utils/is-record';

import { findRuntimeSkillEntry, isMainSkillFilePath } from '../../skills/tools';
import type { RuntimeSkillRegistry } from '../../skills/types';
import type { BuiltTool } from '../../types/sdk/tool';
import type { ToolCatalog } from '../tools/tool-catalog';

/** Most schema bytes one skill load returns. Tools past it stay a `find_tools` lookup. */
const MAX_SCHEMA_BYTES = 24 * 1024;

const SCHEMA_NOTE =
	'Input schemas of the catalog tools this skill uses. Call them with call_tool and these arguments. You do not need find_tools for them.';

/**
 * Return the input schemas of a skill's catalog tools with the skill.
 *
 * In catalog mode a skill's tools are deferred, and the model often calls them
 * without a `find_tools` lookup, so it guesses argument names and types. The
 * schemas come back in the tool result, so the toolset and the cached prompt
 * do not change.
 */
export function withSkillToolSchemas(
	loadSkillTool: BuiltTool,
	catalog: ToolCatalog,
	registry: RuntimeSkillRegistry,
): BuiltTool {
	const handler = loadSkillTool.handler;
	if (!handler) return loadSkillTool;

	return {
		...loadSkillTool,
		handler: async (input, ctx) => {
			const output = await handler(input, ctx);
			const schemas = schemasForLoadedSkill(input, output, catalog, registry);
			if (!schemas) return output;
			return appendSchemas(output, schemas);
		},
	};
}

function schemasForLoadedSkill(
	input: unknown,
	output: unknown,
	catalog: ToolCatalog,
	registry: RuntimeSkillRegistry,
): { toolSchemas: unknown[]; lookUpWithFindTools?: string[] } | undefined {
	const skillId = loadedSkillId(input, output, registry);
	if (!skillId) return undefined;
	const tools = registry.skills.find((entry) => entry.id === skillId)?.recommendedTools ?? [];
	const schemas = catalog.schemasFor(tools);
	if (schemas.length === 0) return undefined;

	const kept: unknown[] = [];
	const skipped: string[] = [];
	let bytes = 0;
	for (const schema of schemas) {
		const size = JSON.stringify(schema).length;
		if (bytes + size > MAX_SCHEMA_BYTES) {
			skipped.push(schema.name);
			continue;
		}
		bytes += size;
		kept.push(schema);
	}
	if (kept.length === 0) return undefined;
	return { toolSchemas: kept, ...(skipped.length > 0 ? { lookUpWithFindTools: skipped } : {}) };
}

/** The skill that a successful load activated: a main skill or a reference skill. */
function loadedSkillId(
	input: unknown,
	output: unknown,
	registry: RuntimeSkillRegistry,
): string | undefined {
	if (!isRecord(output)) return undefined;
	// Text result: the main skill, named by the input.
	if (output.type === 'content') {
		if (!isRecord(input)) return undefined;
		const filePath = typeof input.filePath === 'string' ? input.filePath : undefined;
		if (!isMainSkillFilePath(filePath)) return undefined;
		return findRuntimeSkillEntry(registry, {
			skillId: typeof input.skillId === 'string' ? input.skillId : undefined,
			name: typeof input.name === 'string' ? input.name : undefined,
		})?.id;
	}
	// Object result: a linked file has filePath and activates nothing.
	if (output.success !== true || output.filePath !== undefined) return undefined;
	return typeof output.skillId === 'string' ? output.skillId : undefined;
}

function appendSchemas(
	output: unknown,
	schemas: { toolSchemas: unknown[]; lookUpWithFindTools?: string[] },
): unknown {
	if (!isRecord(output)) return output;
	if (output.type === 'content' && Array.isArray(output.value)) {
		const text = [
			`[${SCHEMA_NOTE}]`,
			JSON.stringify(schemas.toolSchemas),
			...(schemas.lookUpWithFindTools
				? [`[Look these up with find_tools: ${schemas.lookUpWithFindTools.join(', ')}]`]
				: []),
		].join('\n');
		return { ...output, value: [...output.value, { type: 'text', text }] };
	}
	return { ...output, toolSchemaNote: SCHEMA_NOTE, ...schemas };
}
