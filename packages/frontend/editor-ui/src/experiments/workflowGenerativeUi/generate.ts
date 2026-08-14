import {
	ActionBindingSchema,
	compileSpecStream,
	parseSpecStreamLine,
	type Spec,
} from '@json-render/core';
import { deepCopy } from 'n8n-workflow';
import { z } from 'zod';
import { catalog } from './catalog';
import { hintCatalogType } from './nodeActionMap';
import { followUpSystemPrompt, systemPrompt } from './prompts';
import type { WorkflowUiPayload } from './workflowPayload';

const ARCHETYPES = new Set(['AdaptiveStoryboard', 'OutcomeBoard', 'GuidedTimeline']);

const FORBIDDEN_PRESENTATION_PROPS = new Set([
	'x',
	'y',
	'width',
	'height',
	'path',
	'style',
	'class',
	'color',
	'stroke',
	'motion',
	'emphasis',
	'density',
	'tone',
	'orientation',
	'variant',
	'accent',
	'surface',
	'radius',
	'pad',
]);

function issueDetail(issues: z.ZodIssue[], scope?: string): string {
	return issues
		.map((issue) => {
			const path = issue.path.join('.');
			const location = [scope, path].filter(Boolean).join('.');
			return location ? `${location}: ${issue.message}` : issue.message;
		})
		.join('; ');
}

function declaredPropNames(type: string): Set<string> {
	const components: Record<string, unknown> = catalog.data.components;
	const component = components[type];
	if (!isRecord(component) || !(component.props instanceof z.ZodType)) return new Set();

	let schema: z.ZodTypeAny = component.props;
	while (schema instanceof z.ZodEffects) schema = schema._def.schema;
	if (!(schema instanceof z.ZodObject)) return new Set();

	return new Set(Object.keys(schema.shape));
}

// An element that names a node is only clickable once something binds its press
// event, so the binding is derived from nodeId instead of left to the model.
function openNodePressBinding(element: Record<string, unknown>): Record<string, unknown> | null {
	const props = isRecord(element.props) ? element.props : {};
	const nodeId = typeof props.nodeId === 'string' ? props.nodeId : '';
	const on = isRecord(element.on) ? element.on : {};
	if (nodeId === '' || on.press !== undefined) return null;

	return { ...on, press: { action: 'openNode', params: { nodeId } } };
}

// The spec schema requires props and children on every element, so a leaf that
// omits them (no children, no props to set) would fail validation outright.
function withStructuralDefaults(spec: unknown): unknown {
	if (!isRecord(spec) || !isRecord(spec.elements)) return spec;

	const elements = Object.fromEntries(
		Object.entries(spec.elements).map(([id, element]) => {
			if (!isRecord(element)) return [id, element];

			const normalized: Record<string, unknown> = {
				...element,
				props: isRecord(element.props) ? element.props : {},
				children: Array.isArray(element.children) ? element.children : [],
			};

			const on = openNodePressBinding(normalized);
			return [id, on ? { ...normalized, on } : normalized];
		}),
	);

	return { ...spec, elements };
}

type StructuralElement = {
	type: string;
	props: Record<string, unknown>;
	children: string[];
};

type StructuralSpec = {
	root: string;
	elements: Record<string, StructuralElement>;
};

export const MODEL = 'claude-opus-5';
export const MAX_TOKENS = 32000;

export type GenerateSpecErrorCode = 'unauthorized' | 'request-failed' | 'invalid-response';

export class GenerateSpecError extends Error {
	constructor(
		public readonly code: GenerateSpecErrorCode,
		message: string,
		public readonly detail?: string,
	) {
		super(message);
		this.name = 'GenerateSpecError';
	}
}

type GenerateSpecInput = {
	apiKey: string;
	view: 'story' | 'play';
	payload: WorkflowUiPayload;
	currentSpec?: unknown;
	instruction?: string;
	signal?: AbortSignal;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSpec(value: unknown): value is Spec {
	return isRecord(value) && typeof value.root === 'string' && isRecord(value.elements);
}

function stripUnknownProps(schema: z.ZodType): z.ZodType {
	if ('strip' in schema && typeof schema.strip === 'function') {
		return schema.strip();
	}
	return schema;
}

function responseText(value: unknown): string {
	if (!isRecord(value) || !Array.isArray(value.content)) {
		throw new GenerateSpecError('invalid-response', 'Anthropic returned an invalid response');
	}

	const textBlock = value.content.find(
		(block): block is { type: 'text'; text: string } =>
			isRecord(block) && block.type === 'text' && typeof block.text === 'string',
	);
	if (!textBlock) {
		throw new GenerateSpecError('invalid-response', 'Anthropic returned no text content');
	}

	if (value.stop_reason === 'max_tokens') {
		throw new GenerateSpecError(
			'invalid-response',
			'Anthropic hit the output token limit before finishing the spec',
		);
	}

	return textBlock.text;
}

async function apiErrorDetail(response: Response): Promise<string | undefined> {
	try {
		const body: unknown = await response.json();
		if (isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string') {
			return body.error.message;
		}
		return undefined;
	} catch {
		return undefined;
	}
}

function stripJsonFence(text: string): string {
	return text
		.trim()
		.replace(/^```(?:json|jsonl)?\s*/i, '')
		.replace(/\s*```$/, '')
		.trim();
}

function firstMeaningfulLine(text: string): string {
	return text.split('\n').find((line) => line.trim().length > 0) ?? '';
}

function extractJsonObject(text: string): string {
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start === -1 || end <= start) return text;
	return text.slice(start, end + 1);
}

function parseSpecPayload(text: string, currentSpec: unknown): unknown {
	const body = stripJsonFence(text);

	if (parseSpecStreamLine(firstMeaningfulLine(body)) !== null) {
		const initial = isRecord(currentSpec) ? deepCopy(currentSpec) : { root: '', elements: {} };
		return compileSpecStream(body, initial);
	}

	try {
		return JSON.parse(body);
	} catch {
		return JSON.parse(extractJsonObject(body));
	}
}

type MessageRequestInput = Omit<GenerateSpecInput, 'apiKey' | 'signal'>;

export function buildMessagesRequest(input: MessageRequestInput): Record<string, unknown> {
	const hints = input.payload.nodes.map((node) => ({
		nodeId: node.id,
		hint: hintCatalogType({
			type: node.type,
			resource: node.resource,
			operation: node.operation,
		}),
	}));

	return {
		model: MODEL,
		max_tokens: MAX_TOKENS,
		system:
			input.currentSpec === undefined && input.instruction === undefined
				? systemPrompt(input.view)
				: followUpSystemPrompt(),
		messages: [
			{
				role: 'user',
				content: JSON.stringify({
					payload: input.payload,
					view: input.view,
					currentSpec: input.currentSpec,
					instruction: input.instruction,
					hints,
				}),
			},
		],
	};
}

export function parseMessagesResponse(responseBody: unknown, currentSpec?: unknown): unknown {
	const text = responseText(responseBody);
	try {
		return parseSpecPayload(text, currentSpec);
	} catch {
		throw new GenerateSpecError(
			'invalid-response',
			'Anthropic returned invalid JSON',
			text.slice(0, 300),
		);
	}
}

function structuralError(detail: string): never {
	throw new GenerateSpecError(
		'invalid-response',
		'Anthropic returned a spec that failed structural validation',
		detail,
	);
}

function toStructuralSpec(spec: unknown): StructuralSpec {
	if (!isRecord(spec) || typeof spec.root !== 'string' || !isRecord(spec.elements)) {
		structuralError('Spec is missing a root or elements map');
	}

	const elements: Record<string, StructuralElement> = {};
	for (const [id, value] of Object.entries(spec.elements)) {
		if (!isRecord(value) || typeof value.type !== 'string') {
			structuralError(`Element ${id} is missing a type`);
		}
		elements[id] = {
			type: value.type,
			props: isRecord(value.props) ? value.props : {},
			children: Array.isArray(value.children)
				? value.children.filter((child): child is string => typeof child === 'string')
				: [],
		};
	}

	return { root: spec.root, elements };
}

function connectionTuple(props: Record<string, unknown>): {
	fromNodeId: string;
	toNodeId: string;
	type: string;
	outputIndex: number;
} {
	const { fromNodeId, toNodeId, type, outputIndex } = props;
	if (
		typeof fromNodeId !== 'string' ||
		fromNodeId.length === 0 ||
		typeof toNodeId !== 'string' ||
		toNodeId.length === 0 ||
		typeof type !== 'string' ||
		type.length === 0 ||
		typeof outputIndex !== 'number' ||
		!Number.isInteger(outputIndex) ||
		outputIndex < 0
	) {
		structuralError('FlowConnection is missing a valid fromNodeId, toNodeId, type, or outputIndex');
	}
	return { fromNodeId, toNodeId, type, outputIndex };
}

function flowNodeIds(props: Record<string, unknown>): string[] {
	const nodeId =
		typeof props.nodeId === 'string' && props.nodeId.length > 0 ? props.nodeId : undefined;
	const rawNodeIds = Array.isArray(props.nodeIds) ? props.nodeIds : undefined;
	const nodeIds =
		rawNodeIds !== undefined &&
		rawNodeIds.length > 0 &&
		rawNodeIds.every((id): id is string => typeof id === 'string' && id.length > 0)
			? rawNodeIds
			: undefined;

	if (nodeId !== undefined && nodeIds !== undefined) {
		structuralError('FlowNode must set exactly one of nodeId or a non-empty nodeIds');
	}
	if (nodeId !== undefined) return [nodeId];
	if (nodeIds !== undefined) return nodeIds;
	structuralError('FlowNode must set exactly one of nodeId or a non-empty nodeIds');
}

export function validateSpecStructure(spec: unknown, payload?: WorkflowUiPayload): void {
	const { root, elements } = toStructuralSpec(spec);

	const rootElement = elements[root];
	if (!rootElement || rootElement.type !== 'Screen') {
		structuralError('Root element must be a Screen');
	}

	for (const [id, element] of Object.entries(elements)) {
		const declared = declaredPropNames(element.type);
		for (const prop of Object.keys(element.props)) {
			if (FORBIDDEN_PRESENTATION_PROPS.has(prop) && !declared.has(prop)) {
				structuralError(`Element ${id} carries forbidden presentation prop ${prop}`);
			}
		}
	}

	const archetypeEntries = Object.entries(elements).filter(([, element]) =>
		ARCHETYPES.has(element.type),
	);
	const archetypeEntry = archetypeEntries[0];
	if (archetypeEntries.length !== 1 || archetypeEntry === undefined) {
		structuralError('Spec must contain exactly one archetype');
	}

	const [archetypeId, archetype] = archetypeEntry;
	if (!rootElement.children.includes(archetypeId)) {
		structuralError('Screen must have the chosen archetype as a direct child');
	}
	// 3-5 sections is the editorial target the prompt asks for and the live harness
	// grades; a short workflow legitimately yields fewer, which is no reason to
	// throw away a view that renders.
	if (archetype.children.length === 0) {
		structuralError('Archetype must have at least one section');
	}

	const parentOf: Record<string, string> = {};
	for (const [id, element] of Object.entries(elements)) {
		for (const child of element.children) {
			parentOf[child] = id;
		}
	}

	const visited = new Set<string>();
	const visiting = new Set<string>();
	const visit = (id: string): void => {
		if (visiting.has(id)) {
			structuralError('Spec element graph cannot contain cycles');
		}
		if (visited.has(id)) return;
		visiting.add(id);
		for (const child of elements[id]?.children ?? []) {
			if (elements[child] !== undefined) visit(child);
		}
		visiting.delete(id);
		visited.add(id);
	};
	for (const id of Object.keys(elements)) visit(id);

	const canvasOf = (id: string): string | undefined => {
		let current = parentOf[id];
		const visitedParents = new Set<string>();
		while (current !== undefined) {
			if (visitedParents.has(current)) {
				structuralError('Spec element graph cannot contain cycles');
			}
			visitedParents.add(current);
			if (elements[current]?.type === 'FlowCanvas') return current;
			current = parentOf[current];
		}
		return undefined;
	};

	const hasArchetypeAncestor = (id: string): boolean => {
		let current = parentOf[id];
		const visitedParents = new Set<string>();
		while (current !== undefined) {
			if (visitedParents.has(current)) {
				structuralError('Spec element graph cannot contain cycles');
			}
			visitedParents.add(current);
			if (current === archetypeId) return true;
			current = parentOf[current];
		}
		return false;
	};

	const canvasNodeIds = new Map<string, Set<string>>();
	const payloadNodeIds = payload ? new Set(payload.nodes.map((node) => node.id)) : undefined;

	for (const [id, element] of Object.entries(elements)) {
		if (element.type !== 'FlowCanvas') continue;
		if (parentOf[id] === root) {
			structuralError('FlowCanvas cannot be a direct child of Screen');
		}
		if (parentOf[id] === archetypeId) {
			structuralError('FlowCanvas cannot be a direct child of the chosen archetype');
		}
		if (!hasArchetypeAncestor(id)) {
			structuralError('FlowCanvas must live under the chosen archetype section');
		}
		if (canvasOf(id) !== undefined) {
			structuralError('FlowCanvas cannot be nested inside another FlowCanvas');
		}
		canvasNodeIds.set(id, new Set());
	}

	for (const [id, element] of Object.entries(elements)) {
		if (element.type !== 'FlowNode') continue;
		const canvasId = canvasOf(id);
		if (canvasId === undefined) {
			structuralError('FlowNode must live inside a FlowCanvas');
		}
		const ids = flowNodeIds(element.props);
		const membership = canvasNodeIds.get(canvasId);
		for (const nodeId of ids) {
			if (payloadNodeIds && !payloadNodeIds.has(nodeId)) {
				structuralError(`FlowNode references unknown node id ${nodeId}`);
			}
			membership?.add(nodeId);
		}
	}

	const seenEdges = new Map<string, Set<string>>();
	for (const [id, element] of Object.entries(elements)) {
		if (element.type !== 'FlowConnection') continue;
		const canvasId = canvasOf(id);
		if (canvasId === undefined) {
			structuralError('FlowConnection must live inside a FlowCanvas');
		}
		const tuple = connectionTuple(element.props);
		const membership = canvasNodeIds.get(canvasId);
		if (!membership?.has(tuple.fromNodeId) || !membership?.has(tuple.toNodeId)) {
			structuralError('FlowConnection endpoints must be represented in the same canvas');
		}

		const edgeKey = `${tuple.fromNodeId}|${tuple.toNodeId}|${tuple.type}|${tuple.outputIndex}`;
		const edges = seenEdges.get(canvasId) ?? new Set<string>();
		if (edges.has(edgeKey)) {
			structuralError('FlowConnection duplicates an explicit edge');
		}
		edges.add(edgeKey);
		seenEdges.set(canvasId, edges);

		if (payload) {
			const matches = payload.connections.some(
				(connection) =>
					connection.sourceNodeId === tuple.fromNodeId &&
					connection.targetNodeId === tuple.toNodeId &&
					connection.type === tuple.type &&
					connection.outputIndex === tuple.outputIndex,
			);
			if (!matches) {
				structuralError('FlowConnection does not match a real workflow connection');
			}
		}
	}
}

// Recasting these would leave the view without a root, an archetype, or a
// coherent canvas, so they keep failing the whole spec into the fallback.
const LOAD_BEARING_TYPES = new Set([
	'Screen',
	'FlowCanvas',
	'FlowNode',
	'FlowConnection',
	...ARCHETYPES,
]);

function firstText(...values: unknown[]): string | undefined {
	for (const value of values) {
		if (typeof value === 'string' && value.trim().length > 0) return value;
	}
	return undefined;
}

// Salvage whatever the model did say about the element, so a recast card still
// reads as itself and still opens its node.
function asStepProps(props: unknown): Record<string, unknown> {
	const source = isRecord(props) ? props : {};
	const nodeId = typeof source.nodeId === 'string' ? source.nodeId : undefined;

	return {
		title: firstText(source.title, source.label, source.subject, source.name) ?? 'Step',
		summary: firstText(source.summary, source.text, source.description, source.body) ?? '',
		...(nodeId === undefined ? {} : { nodeId }),
	};
}

function findComponent(type: string) {
	return Object.entries(catalog.data.components).find(([name]) => name === type)?.[1];
}

export function validateGeneratedSpec(spec: unknown, payload?: WorkflowUiPayload): Spec {
	const normalizedSpec = withStructuralDefaults(spec);

	if (payload !== undefined) {
		validateSpecStructure(normalizedSpec, payload);
	}

	const validation = catalog.validate(normalizedSpec);
	const validatedSource = normalizedSpec;
	if (!validation.success || validation.data === undefined) {
		throw new GenerateSpecError(
			'invalid-response',
			'Anthropic returned a spec that failed catalog validation',
			validation.error ? issueDetail(validation.error.issues) : undefined,
		);
	}

	const sourceElements =
		isRecord(validatedSource) && isRecord(validatedSource.elements) ? validatedSource.elements : {};
	const actionBindingsSchema = z.record(
		z.string(),
		z.union([ActionBindingSchema, z.array(ActionBindingSchema)]),
	);
	const elements = Object.fromEntries(
		Object.entries(validation.data.elements).map(([key, element]) => {
			const component = findComponent(element.type);
			const parsed = component
				? stripUnknownProps(component.props).safeParse(element.props)
				: undefined;

			const failureDetail = parsed
				? issueDetail(parsed.error?.issues ?? [], `${key} (${element.type}) props`)
				: `Unknown component: ${element.type}`;

			let type = element.type;
			let props: unknown;

			if (parsed?.success) {
				props = parsed.data;
			} else {
				// One unusable element must not cost the reader the whole view, but the
				// page still needs its root, archetype, and canvas to mean anything.
				const stepComponent = LOAD_BEARING_TYPES.has(element.type)
					? undefined
					: findComponent('Step');
				const stepProps = stepComponent
					? stripUnknownProps(stepComponent.props).safeParse(asStepProps(element.props))
					: undefined;

				if (!stepProps?.success) {
					throw new GenerateSpecError(
						'invalid-response',
						'Anthropic returned a spec that failed catalog validation',
						failureDetail,
					);
				}

				type = 'Step';
				props = stepProps.data;
			}

			const sourceElement = sourceElements[key];
			if (!isRecord(sourceElement) || sourceElement.on === undefined) {
				return [key, { ...element, type, props }];
			}

			const on = actionBindingsSchema.safeParse(sourceElement.on);
			if (!on.success) {
				throw new GenerateSpecError(
					'invalid-response',
					'Anthropic returned a spec that failed catalog validation',
					issueDetail(on.error.issues, `${key} (${element.type}) on`),
				);
			}

			return [key, { ...element, type, props, on: on.data }];
		}),
	);

	const parsedSpec: unknown = { ...validation.data, elements };
	if (!isSpec(parsedSpec)) {
		throw new GenerateSpecError(
			'invalid-response',
			'Anthropic returned a spec that failed catalog validation',
			'Parsed spec has an invalid shape',
		);
	}
	return parsedSpec;
}

export async function generateSpec(input: GenerateSpecInput): Promise<unknown> {
	const response = await fetch('/dev/anthropic', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-api-key': input.apiKey,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify(buildMessagesRequest(input)),
		signal: input.signal,
	});

	if (!response.ok) {
		const detail = await apiErrorDetail(response);
		if (response.status === 401) {
			throw new GenerateSpecError('unauthorized', 'Anthropic rejected the API key', detail);
		}
		throw new GenerateSpecError(
			'request-failed',
			`Anthropic request failed with ${response.status}`,
			detail,
		);
	}

	return parseMessagesResponse(await response.json(), input.currentSpec);
}
