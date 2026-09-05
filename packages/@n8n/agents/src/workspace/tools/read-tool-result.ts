import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import { isToolResultPath } from '../tool-result-storage';
import type { WorkspaceFilesystem } from '../types';

const DEFAULT_CONTAINER_LIMIT = 20;
const MAX_CONTAINER_LIMIT = 100;
const MAX_STRING_CHARS = 20_000;
const MAX_INLINE_STRING_CHARS = 500;
const MAX_SERIALIZED_OUTPUT_BYTES = 40_000;

const jsonValueTypeSchema = z.enum(['null', 'boolean', 'number', 'string', 'array', 'object']);
const scalarValueSchema = z.union([z.null(), z.boolean(), z.number(), z.string()]);

const childSchema = z.object({
	pointer: z.string(),
	type: jsonValueTypeSchema,
	key: z.string().optional(),
	index: z.number().int().nonnegative().optional(),
	childCount: z.number().int().nonnegative().optional(),
	charCount: z.number().int().nonnegative().optional(),
	value: scalarValueSchema.optional(),
});

const describeOutputSchema = z.object({
	view: z.literal('describe'),
	pointer: z.string(),
	type: jsonValueTypeSchema,
	childCount: z.number().int().nonnegative().optional(),
	charCount: z.number().int().nonnegative().optional(),
});

const stringOutputSchema = z.object({
	view: z.literal('json'),
	pointer: z.string(),
	type: z.literal('string'),
	content: z.string(),
	offset: z.number().int().nonnegative(),
	totalChars: z.number().int().nonnegative(),
	nextOffset: z.number().int().nonnegative().nullable(),
	hasMore: z.boolean(),
});

const containerOutputSchema = z.object({
	view: z.literal('json'),
	pointer: z.string(),
	type: z.enum(['array', 'object']),
	children: z.array(childSchema),
	offset: z.number().int().nonnegative(),
	totalChildren: z.number().int().nonnegative(),
	nextOffset: z.number().int().nonnegative().nullable(),
	hasMore: z.boolean(),
});

const scalarOutputSchema = z.object({
	view: z.literal('json'),
	pointer: z.string(),
	type: z.enum(['null', 'boolean', 'number']),
	value: z.union([z.null(), z.boolean(), z.number()]),
});

const outputSchema = z.union([
	describeOutputSchema,
	stringOutputSchema,
	containerOutputSchema,
	scalarOutputSchema,
]);

const inputSchema = z
	.object({
		path: z.string().describe('Exact path from an oversized tool-result envelope'),
		view: z
			.enum(['describe', 'json'])
			.optional()
			.describe('Inspect the selected value shape, or read a bounded JSON value'),
		pointer: z
			.string()
			.optional()
			.describe('RFC 6901 JSON Pointer. Omit or use an empty string for the root value.'),
		offset: z
			.number()
			.int()
			.min(0)
			.optional()
			.describe('String character or container child offset'),
		maxChars: z
			.number()
			.int()
			.min(1)
			.max(MAX_STRING_CHARS)
			.optional()
			.describe('Maximum characters to return from a selected JSON string'),
		limit: z
			.number()
			.int()
			.min(1)
			.max(MAX_CONTAINER_LIMIT)
			.optional()
			.describe('Maximum object or array children to return'),
	})
	.strict();

type ToolResultInput = z.infer<typeof inputSchema>;
type ToolResultOutput = z.infer<typeof outputSchema>;
type ToolResultChild = z.infer<typeof childSchema>;
type DescribeOutput = z.infer<typeof describeOutputSchema>;
type StringOutput = z.infer<typeof stringOutputSchema>;
type ContainerOutput = z.infer<typeof containerOutputSchema>;
type JsonValueType = z.infer<typeof jsonValueTypeSchema>;

export function createReadToolResultTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_read_tool_result')
		.description(
			'Inspect an oversized tool result stored in the workspace. Start with view=describe, then use view=json with relevant JSON Pointers and nextOffset values. Continue until you have enough evidence for the user request; do not assume the first page is complete when hasMore is true.',
		)
		.systemInstruction(
			'When a tool result is offloaded, inspect it with workspace_read_tool_result before answering. Continue through relevant JSON Pointers and nextOffset pages until you have enough evidence for the user request. Do not read the entire result when the remaining content cannot affect the answer.',
		)
		.input(inputSchema)
		.output(outputSchema)
		.handler(async (input, ctx) => await readToolResult(filesystem, input, ctx.abortSignal))
		.build();
}

async function readToolResult(
	filesystem: WorkspaceFilesystem,
	input: ToolResultInput,
	abortSignal?: AbortSignal,
): Promise<ToolResultOutput> {
	if (!isToolResultPath(input.path)) {
		throw new Error('Path is not a stored tool result');
	}

	const content = await filesystem.readFile(input.path, {
		encoding: 'utf-8',
		abortSignal,
	});
	const serialized = typeof content === 'string' ? content : content.toString('utf-8');
	let root: unknown;
	try {
		root = JSON.parse(serialized);
	} catch {
		throw new Error('Stored tool result is not valid JSON');
	}

	const pointer = input.pointer ?? '';
	const value = resolveJsonPointer(root, pointer);
	if ((input.view ?? 'describe') === 'describe') {
		return ensureWithinOutputBudget(describeValue(value, pointer));
	}

	return readJsonValue(value, pointer, input);
}

function readJsonValue(value: unknown, pointer: string, input: ToolResultInput): ToolResultOutput {
	if (value === null) {
		return ensureWithinOutputBudget({ view: 'json', pointer, type: 'null', value: null });
	}
	if (typeof value === 'boolean') {
		return ensureWithinOutputBudget({ view: 'json', pointer, type: 'boolean', value });
	}
	if (typeof value === 'number') {
		return ensureWithinOutputBudget({ view: 'json', pointer, type: 'number', value });
	}
	if (typeof value === 'string') {
		return readStringPage(value, pointer, input.offset ?? 0, input.maxChars ?? MAX_STRING_CHARS);
	}
	if (Array.isArray(value)) {
		return readContainerPage(
			value,
			pointer,
			'array',
			input.offset ?? 0,
			input.limit ?? DEFAULT_CONTAINER_LIMIT,
		);
	}
	if (isJsonObject(value)) {
		return readContainerPage(
			value,
			pointer,
			'object',
			input.offset ?? 0,
			input.limit ?? DEFAULT_CONTAINER_LIMIT,
		);
	}

	throw new Error('Stored tool result contains an unsupported JSON value');
}

function describeValue(value: unknown, pointer: string): DescribeOutput {
	const type = getJsonValueType(value);
	const output: DescribeOutput = { view: 'describe', pointer, type };
	if (typeof value === 'string') {
		output.charCount = value.length;
	} else if (Array.isArray(value)) {
		output.childCount = value.length;
	} else if (isJsonObject(value)) {
		output.childCount = Object.keys(value).length;
	}
	return output;
}

function readStringPage(
	value: string,
	pointer: string,
	offset: number,
	maxChars: number,
): StringOutput {
	const available = Math.max(0, value.length - offset);
	let low = 0;
	let high = Math.min(maxChars, available);
	let best: StringOutput | undefined;

	while (low <= high) {
		const length = Math.floor((low + high) / 2);
		const output = buildStringOutput(value, pointer, offset, length);
		if (isWithinOutputBudget(output)) {
			best = output;
			low = length + 1;
		} else {
			high = length - 1;
		}
	}

	if (!best || (available > 0 && best.content.length === 0)) {
		throw new Error('Tool result value cannot fit within the read limit');
	}
	return best;
}

function buildStringOutput(
	value: string,
	pointer: string,
	offset: number,
	length: number,
): StringOutput {
	const content = value.slice(offset, offset + length);
	const consumedOffset = offset + content.length;
	const hasMore = consumedOffset < value.length;
	return {
		view: 'json',
		pointer,
		type: 'string',
		content,
		offset,
		totalChars: value.length,
		nextOffset: hasMore ? consumedOffset : null,
		hasMore,
	};
}

function readContainerPage(
	value: unknown[] | Record<string, unknown>,
	pointer: string,
	type: 'array' | 'object',
	offset: number,
	limit: number,
): ContainerOutput {
	const keys = Array.isArray(value) ? undefined : Object.keys(value);
	const totalChildren = Array.isArray(value) ? value.length : (keys?.length ?? 0);
	const children: ToolResultChild[] = [];
	const pageEnd = Math.min(totalChildren, offset + limit);

	for (let index = offset; index < pageEnd; index++) {
		const key = keys?.[index];
		const childValue = Array.isArray(value) ? value[index] : value[key ?? ''];
		const child = describeChild(childValue, pointer, key, Array.isArray(value) ? index : undefined);
		const candidate = buildContainerOutput(
			type,
			pointer,
			children.concat(child),
			offset,
			totalChildren,
		);
		if (!isWithinOutputBudget(candidate)) {
			if (children.length === 0) {
				throw new Error('Tool result child cannot fit within the read limit');
			}
			break;
		}
		children.push(child);
	}

	return ensureWithinOutputBudget(
		buildContainerOutput(type, pointer, children, offset, totalChildren),
	);
}

function buildContainerOutput(
	type: 'array' | 'object',
	pointer: string,
	children: ToolResultChild[],
	offset: number,
	totalChildren: number,
): ContainerOutput {
	const consumedOffset = Math.min(totalChildren, offset + children.length);
	const hasMore = consumedOffset < totalChildren;
	return {
		view: 'json',
		pointer,
		type,
		children,
		offset,
		totalChildren,
		nextOffset: hasMore ? consumedOffset : null,
		hasMore,
	};
}

function describeChild(
	value: unknown,
	parentPointer: string,
	key?: string,
	index?: number,
): ToolResultChild {
	const segment = key ?? String(index);
	const type = getJsonValueType(value);
	const child: ToolResultChild = {
		pointer: appendJsonPointer(parentPointer, segment),
		type,
		...(key === undefined ? {} : { key }),
		...(index === undefined ? {} : { index }),
	};

	if (typeof value === 'string') {
		child.charCount = value.length;
		if (value.length <= MAX_INLINE_STRING_CHARS) child.value = value;
	} else if (Array.isArray(value)) {
		child.childCount = value.length;
	} else if (isJsonObject(value)) {
		child.childCount = Object.keys(value).length;
	} else if (value === null || typeof value === 'boolean' || typeof value === 'number') {
		child.value = value;
	}

	return child;
}

function resolveJsonPointer(root: unknown, pointer: string): unknown {
	if (pointer === '') return root;
	if (!pointer.startsWith('/')) {
		throw new Error('Invalid JSON Pointer');
	}

	let value = root;
	for (const encodedSegment of pointer.slice(1).split('/')) {
		const segment = decodeJsonPointerSegment(encodedSegment);
		if (Array.isArray(value)) {
			if (!/^(0|[1-9]\d*)$/.test(segment)) {
				throw new Error('JSON Pointer does not reference a stored value');
			}
			const index = Number(segment);
			if (!Number.isSafeInteger(index) || index >= value.length) {
				throw new Error('JSON Pointer does not reference a stored value');
			}
			value = value[index];
			continue;
		}
		if (isJsonObject(value) && Object.hasOwn(value, segment)) {
			value = value[segment];
			continue;
		}
		throw new Error('JSON Pointer does not reference a stored value');
	}
	return value;
}

function decodeJsonPointerSegment(segment: string): string {
	if (/~(?:[^01]|$)/.test(segment)) {
		throw new Error('Invalid JSON Pointer');
	}
	return segment.replaceAll('~1', '/').replaceAll('~0', '~');
}

function appendJsonPointer(pointer: string, segment: string): string {
	return `${pointer}/${segment.replaceAll('~', '~0').replaceAll('/', '~1')}`;
}

function getJsonValueType(value: unknown): JsonValueType {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	if (isJsonObject(value)) return 'object';
	if (typeof value === 'string') return 'string';
	if (typeof value === 'number') return 'number';
	if (typeof value === 'boolean') return 'boolean';
	throw new Error('Stored tool result contains an unsupported JSON value');
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWithinOutputBudget(output: ToolResultOutput): boolean {
	return Buffer.byteLength(JSON.stringify(output), 'utf-8') <= MAX_SERIALIZED_OUTPUT_BYTES;
}

function ensureWithinOutputBudget<T extends ToolResultOutput>(output: T): T {
	if (!isWithinOutputBudget(output)) {
		throw new Error('Tool result response cannot fit within the read limit');
	}
	return output;
}
