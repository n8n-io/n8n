import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalog } from './catalog';
import { buildMessagesRequest, parseMessagesResponse, validateSpecStructure } from './generate';
import { buildWorkflowUiPayload } from './workflowPayload';
import leads from './playground/fixtures/leads.json';
import ops from './playground/fixtures/ops.json';
import interview from './playground/fixtures/interview.json';

const keyPath = resolve(
	__dirname,
	'../../../../../../.superpowers/sdd/2026-08-13-workflow-generative-ui/.anthropic-key',
);

function readKey(): string | null {
	if (process.env.ANTHROPIC_API_KEY?.trim()) return process.env.ANTHROPIC_API_KEY.trim();
	if (existsSync(keyPath)) {
		const value = readFileSync(keyPath, 'utf8').trim();
		if (value) return value;
	}
	return null;
}

type Fixture = { name: string; nodes: Array<Record<string, unknown>>; connections: unknown };
type SpecElement = {
	type: string;
	props?: Record<string, unknown>;
	children: string[];
};

const FIXTURE_IDS = ['ops', 'leads', 'interview'] as const;
type FixtureId = (typeof FIXTURE_IDS)[number];
type Archetype = 'AdaptiveStoryboard' | 'OutcomeBoard' | 'GuidedTimeline';

const fixtures: Record<FixtureId, Fixture> = {
	leads: leads as Fixture,
	ops: ops as Fixture,
	interview: interview as Fixture,
};

const ARCHETYPES = new Set<Archetype>(['AdaptiveStoryboard', 'OutcomeBoard', 'GuidedTimeline']);
const EXPECTED_ARCHETYPE: Record<FixtureId, Archetype> = {
	ops: 'OutcomeBoard',
	leads: 'AdaptiveStoryboard',
	interview: 'GuidedTimeline',
};
const FORBIDDEN_PROPS = new Set([
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
	'x',
	'y',
	'width',
	'height',
	'path',
	'style',
	'class',
	'color',
	'stroke',
]);

function collectCanvasTuples(elements: Record<string, SpecElement>): string[] {
	const tuples: string[] = [];
	for (const element of Object.values(elements)) {
		if (element.type !== 'FlowConnection') continue;
		const { fromNodeId, toNodeId, type, outputIndex } = element.props ?? {};
		tuples.push(`${String(fromNodeId)}|${String(toNodeId)}|${String(type)}|${String(outputIndex)}`);
	}
	return tuples;
}

const key = readKey();

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asElements(spec: unknown): Record<string, SpecElement> {
	if (!isRecord(spec) || !isRecord(spec.elements)) {
		throw new Error('spec is missing elements');
	}
	const elements: Record<string, SpecElement> = {};
	for (const [id, value] of Object.entries(spec.elements)) {
		if (!isRecord(value) || typeof value.type !== 'string') {
			throw new Error(`element ${id} is invalid`);
		}
		elements[id] = {
			type: value.type,
			props: isRecord(value.props) ? value.props : undefined,
			children: Array.isArray(value.children)
				? value.children.filter((child): child is string => typeof child === 'string')
				: [],
		};
	}
	return elements;
}

function collectNodeIds(elements: Record<string, SpecElement>): string[] {
	const ids: string[] = [];
	for (const element of Object.values(elements)) {
		const nodeId = element.props?.nodeId;
		if (typeof nodeId === 'string') ids.push(nodeId);
		const nodeIds = element.props?.nodeIds;
		if (Array.isArray(nodeIds)) {
			for (const id of nodeIds) {
				if (typeof id === 'string') ids.push(id);
			}
		}
	}
	return ids;
}

function assertStructuralInvariants(
	spec: unknown,
	payload: ReturnType<typeof buildWorkflowUiPayload>,
	fixtureId: FixtureId,
) {
	const validation = catalog.validate(spec);
	expect(
		validation.success,
		validation.error ? JSON.stringify(validation.error.issues, null, 2) : 'catalog.validate failed',
	).toBe(true);

	const elements = asElements(spec);
	if (!isRecord(spec) || typeof spec.root !== 'string') {
		throw new Error('spec is missing root');
	}
	const root = elements[spec.root];
	expect(root?.type, 'root must be Screen').toBe('Screen');
	expect(typeof root?.props?.summary, 'Screen.summary required').toBe('string');
	expect(
		String(root?.props?.summary ?? '').trim().length,
		'Screen.summary non-empty',
	).toBeGreaterThan(0);

	const archetypeElements = Object.entries(elements).filter(([, element]) =>
		ARCHETYPES.has(element.type as Archetype),
	);
	expect(archetypeElements, 'spec must contain exactly one archetype').toHaveLength(1);

	const directArchetypes = root.children.filter((id) =>
		ARCHETYPES.has(elements[id]?.type as Archetype),
	);
	expect(directArchetypes, 'Screen must have exactly one direct archetype child').toHaveLength(1);

	const [archetypeId, archetype] = archetypeElements[0];
	expect(directArchetypes[0], 'the sole archetype must be directly under Screen').toBe(archetypeId);
	expect(archetype.type, `${fixtureId} must use its expected archetype`).toBe(
		EXPECTED_ARCHETYPE[fixtureId],
	);
	expect(
		archetype.children.length,
		'archetype must contain 3-5 meaningful sections',
	).toBeGreaterThanOrEqual(3);
	expect(
		archetype.children.length,
		'archetype must contain 3-5 meaningful sections',
	).toBeLessThanOrEqual(5);

	const forbiddenProps = Object.entries(elements).flatMap(([id, element]) =>
		Object.keys(element.props ?? {})
			.filter((prop) => FORBIDDEN_PROPS.has(prop))
			.map((prop) => `${id}.${prop}`),
	);
	expect(forbiddenProps, 'spec must not contain expression, styling, or motion props').toEqual([]);

	const knownIds = new Set(payload.nodes.map((node) => node.id));
	const nodeIds = collectNodeIds(elements);
	const unknownIds = nodeIds.filter((id) => !knownIds.has(id));
	expect(nodeIds.length, 'spec must reference real workflow nodes').toBeGreaterThan(0);
	expect(unknownIds, 'spec references node ids absent from the workflow').toEqual([]);

	expect(
		() => validateSpecStructure(spec, payload),
		'spec must pass structural validation',
	).not.toThrow();

	expect(Array.isArray(payload.connections), 'payload connections must be normalized').toBe(true);

	const payloadTuples = new Set(
		payload.connections.map(
			(connection) =>
				`${connection.sourceNodeId}|${connection.targetNodeId}|${connection.type}|${connection.outputIndex}`,
		),
	);
	const inventedTuples = collectCanvasTuples(elements).filter((tuple) => !payloadTuples.has(tuple));
	expect(inventedTuples, 'FlowConnection edges must match normalized workflow connections').toEqual(
		[],
	);

	const usedTypes = [...new Set(Object.values(elements).map((element) => element.type))];
	const stepCount = Object.values(elements).filter((element) => element.type === 'Step').length;
	const metaphorWithNodeId = Object.values(elements).filter(
		(element) =>
			element.type !== 'Step' &&
			(typeof element.props?.nodeId === 'string' || Array.isArray(element.props?.nodeIds)),
	).length;
	expect(
		metaphorWithNodeId,
		`must not collapse to only generic Step cards (steps=${stepCount}, metaphors=${metaphorWithNodeId}, types=${usedTypes.join(',')})`,
	).toBeGreaterThan(0);

	return { usedTypes, nodeIds, unknownIds };
}

describe.skipIf(!key)('live generate against Anthropic', () => {
	for (const view of ['story', 'play'] as const) {
		for (const fixtureId of FIXTURE_IDS) {
			it(`${fixtureId} / ${view} produces a valid spec`, async () => {
				const payload = buildWorkflowUiPayload(fixtures[fixtureId]);
				const request = buildMessagesRequest({ payload, view });
				const response = await fetch('https://api.anthropic.com/v1/messages', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						'x-api-key': key as string,
						'anthropic-version': '2023-06-01',
					},
					body: JSON.stringify(request),
				});
				const body = (await response.json()) as Record<string, unknown>;
				expect(response.status, JSON.stringify(body)).toBe(200);

				const spec = parseMessagesResponse(body);
				const { usedTypes, nodeIds, unknownIds } = assertStructuralInvariants(
					spec,
					payload,
					fixtureId,
				);
				const elements = asElements(spec);

				process.stdout.write(
					`\n[${fixtureId}/${view}] stop=${String(body.stop_reason)} elements=${Object.keys(elements).length} types=${usedTypes.join(',')} nodeIds=${nodeIds.length} unknown=${unknownIds.length}\n`,
				);
				process.stdout.write(`${JSON.stringify(spec, null, 2)}\n`);
			}, 120_000);
		}
	}
});
