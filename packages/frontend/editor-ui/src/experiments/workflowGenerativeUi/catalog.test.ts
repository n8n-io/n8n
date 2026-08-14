import { describe, expect, it } from 'vitest';
import { catalog, type CatalogTypeName } from './catalog';
import { z } from 'zod';

const narrativePrimitives = ['Hero', 'Summary', 'Chapter', 'Beat', 'Caption'] as const;
const compositionPrimitives = [
	'Split',
	'Branch',
	'Cluster',
	'Spotlight',
	'Lane',
	'Ends',
	'FlowCanvas',
	'FlowNode',
	'FlowConnection',
] as const;
const disclosurePrimitives = ['Reveal', 'Accordion'] as const;
const archetypes = ['AdaptiveStoryboard', 'OutcomeBoard', 'GuidedTimeline'] as const;
const expressionProps = [
	'emphasis',
	'density',
	'tone',
	'orientation',
	'motion',
	'variant',
	'accent',
	'surface',
	'radius',
	'pad',
] as const;

function componentProps(name: string): z.ZodTypeAny {
	const entry = catalog.data.components[name as keyof typeof catalog.data.components];
	if (!entry || !('props' in entry)) {
		throw new Error(`Missing catalog component: ${name}`);
	}
	return entry.props as z.ZodTypeAny;
}

function parseComponent(name: string, props: unknown) {
	return componentProps(name).safeParse(props);
}

function exposedPropNames(props: z.ZodTypeAny): string[] {
	let current: z.ZodTypeAny = props;
	while (current instanceof z.ZodEffects) {
		current = current._def.schema as z.ZodTypeAny;
	}
	if (!('shape' in current)) {
		return [];
	}
	return Object.keys((current as z.ZodObject<z.ZodRawShape>).shape);
}

describe('catalog', () => {
	it('registers all narrative, composition, and disclosure primitives', () => {
		for (const name of [
			...narrativePrimitives,
			...compositionPrimitives,
			...disclosurePrimitives,
		]) {
			expect(catalog.componentNames).toContain(name);
			expect(catalog.data.components).toHaveProperty(name);
		}
	});

	it('registers the three slotted archetypes with selection criteria', () => {
		for (const name of archetypes) {
			const component = catalog.data.components[name];
			expect(catalog.componentNames).toContain(name);
			expect(component.slots).toContain('default');
			expect(component.description.toLowerCase()).toMatch(/use (for|when)/);
			expect(component.description.toLowerCase()).toMatch(/not|instead|rather/);
		}
	});

	it('requires Screen.summary', () => {
		expect(parseComponent('Screen', { title: 'Ops' }).success).toBe(false);
		expect(
			parseComponent('Screen', { title: 'Ops', summary: 'Recovers an unhealthy service.' }).success,
		).toBe(true);
	});

	it('validates AiTask.model and AiTask.tools', () => {
		const base = {
			task: 'Classify severity',
			promptExcerpt: 'Rate the alert',
			nodeId: 'ai-1',
		};

		expect(parseComponent('AiTask', base).success).toBe(true);
		expect(
			parseComponent('AiTask', {
				...base,
				model: 'claude-opus-5',
				tools: ['search', 'http'],
			}).success,
		).toBe(true);
		expect(parseComponent('AiTask', { ...base, tools: 'search' }).success).toBe(false);
	});

	it('registers strict connected canvas props and defaults', () => {
		const flowCanvas = parseComponent('FlowCanvas', {});
		expect(flowCanvas.success).toBe(true);
		expect(flowCanvas.data).toEqual({ layout: 'auto' });
		expect(parseComponent('FlowCanvas', { layout: 'branch', title: null }).success).toBe(true);
		expect(parseComponent('FlowCanvas', { layout: 'radial' }).success).toBe(false);

		expect(parseComponent('FlowNode', { nodeId: 'node-1', label: null }).success).toBe(true);
		expect(parseComponent('FlowNode', { nodeIds: ['node-1', 'node-2'] }).success).toBe(true);

		const flowConnection = parseComponent('FlowConnection', {
			fromNodeId: 'node-1',
			toNodeId: 'node-2',
		});
		expect(flowConnection.success).toBe(true);
		expect(flowConnection.data).toEqual({
			fromNodeId: 'node-1',
			toNodeId: 'node-2',
			type: 'main',
			outputIndex: 0,
		});
		expect(
			parseComponent('FlowConnection', {
				fromNodeId: 'node-1',
				toNodeId: 'node-2',
				outputIndex: -1,
			}).success,
		).toBe(false);

		expect(catalog.data.components.FlowCanvas.slots).toEqual(['default']);
		expect(catalog.data.components.FlowNode.slots).toEqual(['default']);
		expect(catalog.data.components.FlowConnection).not.toHaveProperty('slots');
	});

	it('requires exactly one FlowNode identity', () => {
		expect(parseComponent('FlowNode', {}).success).toBe(false);
		expect(parseComponent('FlowNode', { nodeId: null }).success).toBe(false);
		expect(parseComponent('FlowNode', { nodeId: '' }).success).toBe(false);
		expect(parseComponent('FlowNode', { nodeIds: [] }).success).toBe(false);
		expect(parseComponent('FlowNode', { nodeId: null, nodeIds: [] }).success).toBe(false);
		expect(parseComponent('FlowNode', { nodeId: 'node-1', nodeIds: ['node-2'] }).success).toBe(
			false,
		);
		expect(parseComponent('FlowNode', { nodeId: 'node-1' }).success).toBe(true);
		expect(parseComponent('FlowNode', { nodeId: 'node-1', nodeIds: [] }).success).toBe(true);
		expect(parseComponent('FlowNode', { nodeIds: ['node-1'] }).success).toBe(true);
		expect(parseComponent('FlowNode', { nodeId: null, nodeIds: ['node-1'] }).success).toBe(true);
	});

	it('rejects canvas presentation props', () => {
		const cases = [
			['FlowCanvas', { layout: 'auto' }],
			['FlowNode', { nodeId: 'node-1' }],
			['FlowConnection', { fromNodeId: 'node-1', toNodeId: 'node-2' }],
		] as const;

		for (const [name, props] of cases) {
			for (const prop of ['x', 'y', 'path', 'style', 'motion']) {
				expect(
					parseComponent(name, { ...props, [prop]: 'anything' }).success,
					`${name}.${prop}`,
				).toBe(false);
			}
		}
	});

	it('rejects expression and motion props from every model-facing component', () => {
		for (const name of catalog.componentNames as CatalogTypeName[]) {
			const component = catalog.data.components[name];
			if (!('props' in component)) continue;

			const exposedProps = exposedPropNames(component.props as z.ZodTypeAny);
			for (const prop of expressionProps) {
				expect(exposedProps, `${name}.${prop}`).not.toContain(prop);
			}
		}

		for (const prop of expressionProps) {
			expect(
				parseComponent('Screen', {
					title: 'Ops',
					summary: 'Recovers an unhealthy service.',
					[prop]: 'anything',
				}).success,
				`Screen.${prop}`,
			).toBe(false);
		}

		const prompt = catalog.prompt().toLowerCase();
		for (const prop of expressionProps) {
			expect(prompt, prop).not.toContain(prop);
		}
	});
});
