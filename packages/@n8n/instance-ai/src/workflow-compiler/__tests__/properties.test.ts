import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { NodeRegistry } from '../catalog/node-registry';
import { compileWorkflow } from '../compiler/compile';
import { resolveChoice, resolveNoul, choiceEntropy } from '../decision/policy';
import {
	NONE_OF_THESE,
	reconcileAnswers,
	type DecisionAnswer,
	type DecisionQuestions,
} from '../decision/schemas';
import {
	compileExpression,
	compileExpressionBody,
	compileParameterTree,
	compilePath,
	expr,
	referencedSteps,
	referencedStepsInTree,
	type Expression,
} from '../expressions/expression';
import { allSteps, workflowIrSchema, type StepIR, type WorkflowIR } from '../ir/schema';
import { validateWorkflowIr } from '../ir/validate-ir';
import { applyPatches, incomingEdges, type WorkflowPatch } from '../modes/patch';
import { enumerateExecutionPaths, pathCoverage } from '../paths/enumerate-paths';
import { detectScheduleCron } from '../requirements/extract';

/**
 * Property-based checks (fast-check, the TypeScript counterpart of Hypothesis).
 * Each property states an invariant the compiler must hold for every input,
 * so the generator finds the edge cases an example table would miss.
 */

const registry = new NodeRegistry();
const ident = fc.stringMatching(/^[a-z][a-z0-9]{0,5}$/);
const segment = fc.oneof(ident, fc.string({ maxLength: 6 }));
const STEP_IDS = ['trigger', 'a', 'b', 'c', 'd'];

const expression: fc.Arbitrary<Expression> = fc.letrec<{ e: Expression }>((tie) => ({
	e: fc.oneof(
		{ depthSize: 'small', withCrossShrink: true },
		fc.record({ type: fc.constant('literal' as const), value: fc.jsonValue() }),
		fc.record({
			type: fc.constant('field' as const),
			stepId: fc.constantFrom(...STEP_IDS),
			path: fc.array(segment, { maxLength: 3 }),
		}),
		fc.record({ type: fc.constant('input' as const), path: fc.array(segment, { maxLength: 3 }) }),
		fc.record({ type: fc.constant('raw' as const), code: fc.stringMatching(/^[a-z]{1,8}$/) }),
		fc.record({
			type: fc.constant('coalesce' as const),
			values: fc.array(tie('e'), { minLength: 1, maxLength: 3 }),
		}),
		fc.record({
			type: fc.constant('template' as const),
			parts: fc.array(fc.oneof(fc.string({ maxLength: 5 }), tie('e')), { maxLength: 3 }),
		}),
	),
})).e;

const resolveAll = (stepId: string) => `Node ${stepId}`;

describe('expressions', () => {
	it('compilePath emits one accessor per segment and quotes non-identifiers', () => {
		fc.assert(
			fc.property(fc.array(segment, { maxLength: 5 }), (path) => {
				const compiled = compilePath(path);
				for (const part of path) {
					const quoted = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(part)
						? `.${part}`
						: `[${JSON.stringify(part)}]`;
					expect(compiled).toContain(quoted);
				}
				expect(compilePath([])).toBe('');
			}),
		);
	});

	it('referencedSteps lists exactly the step ids the body compiles against', () => {
		fc.assert(
			fc.property(expression, (e) => {
				const referenced = referencedSteps(e);
				const seen = new Set<string>();
				const body = compileExpressionBody(e, (id) => {
					seen.add(id);
					return resolveAll(id);
				});
				expect(seen).toEqual(referenced);
				for (const id of referenced) expect(body).toContain(JSON.stringify(resolveAll(id)));
			}),
		);
	});

	it('an unresolvable field reference throws and names the step', () => {
		fc.assert(
			fc.property(fc.constantFrom(...STEP_IDS), fc.array(segment), (stepId, path) => {
				expect(() =>
					compileExpressionBody({ type: 'field', stepId, path }, () => undefined),
				).toThrow(stepId);
			}),
		);
	});

	it('literals compile to themselves and everything else to an = expression', () => {
		fc.assert(
			fc.property(expression, (e) => {
				const compiled = compileExpression(e, resolveAll);
				if (e.type === 'literal') expect(compiled).toBe(e.value);
				else expect(String(compiled).startsWith('=')).toBe(true);
			}),
		);
	});

	it('compileParameterTree keeps the shape of a tree and compiles only $expr leaves', () => {
		const tree = fc.letrec<{ t: unknown }>((tie) => ({
			t: fc.oneof(
				{ depthSize: 'small' },
				fc.jsonValue({ maxDepth: 1 }),
				expression.map(expr),
				fc.array(tie('t'), { maxLength: 3 }),
				fc.dictionary(ident, tie('t'), { maxKeys: 3 }),
			),
		})).t;
		fc.assert(
			fc.property(tree, (value) => {
				const compiled = compileParameterTree(value, resolveAll);
				const referenced = referencedStepsInTree(value);
				const json = JSON.stringify(compiled) ?? '';
				for (const id of referenced) expect(json).toContain(resolveAll(id));
				expect(json).not.toContain('"$expr"');
				if (!(JSON.stringify(value) ?? '').includes('"$expr"')) expect(compiled).toEqual(value);
			}),
		);
	});
});

const probability = fc.double({ min: 0, max: 1, noNaN: true });
const options = fc.uniqueArray(ident, { minLength: 1, maxLength: 4 });
const choiceAnswer = (allowed: string[]) =>
	fc.record({
		type: fc.constant('choice' as const),
		choice: fc.oneof(fc.constantFrom(...allowed, NONE_OF_THESE), ident),
		probabilities: fc.dictionary(fc.constantFrom(...allowed, NONE_OF_THESE), probability),
		confidence: probability,
	});

describe('decision policy', () => {
	it('never chooses a value outside the allowed set, and chosen values clear the threshold', () => {
		fc.assert(
			fc.property(
				options.chain((allowed) =>
					fc.record({
						allowed: fc.constant(allowed),
						answer: fc.option(choiceAnswer(allowed), { nil: undefined }),
						prior: fc.option(fc.dictionary(fc.constantFrom(...allowed), probability), {
							nil: undefined,
						}),
						act: fc.double({ min: 0.5, max: 1, noNaN: true }),
					}),
				),
				({ allowed, answer, prior, act }) => {
					const resolution = resolveChoice({ allowed, answer, prior, thresholds: { act } });
					expect(resolution.confidence).toBeGreaterThanOrEqual(0);
					expect(resolution.confidence).toBeLessThanOrEqual(1);
					if (resolution.status === 'chosen') {
						expect(allowed).toContain(resolution.value);
						if (resolution.source !== 'only_option')
							expect(resolution.confidence).toBeGreaterThanOrEqual(act);
						if (resolution.source === 'decision') expect(answer?.choice).toBe(resolution.value);
					} else if (resolution.best !== undefined) {
						expect(allowed).toContain(resolution.best);
					}
				},
			),
		);
	});

	it('resolveNoul is monotonic in P(yes)', () => {
		fc.assert(
			fc.property(probability, probability, (a, b) => {
				const [low, high] = a <= b ? [a, b] : [b, a];
				const order = { no: 0, uncertain: 1, yes: 2 };
				expect(order[resolveNoul({ type: 'noul', noul: low })]).toBeLessThanOrEqual(
					order[resolveNoul({ type: 'noul', noul: high })],
				);
			}),
		);
	});

	it('choice entropy is bounded by log2 of the option count', () => {
		fc.assert(
			fc.property(options.chain(choiceAnswer), (answer) => {
				const entropy = choiceEntropy(answer);
				const positive = Object.values(answer.probabilities).filter((p) => p > 0).length;
				expect(entropy).toBeGreaterThanOrEqual(-1e-9);
				expect(entropy).toBeLessThanOrEqual(Math.log2(Math.max(1, positive)) + 1e-9);
			}),
		);
	});

	it('reconcileAnswers returns one entry per question and only type-correct in-range answers', () => {
		const question = fc.oneof(
			fc.record({ type: fc.constant('noul' as const), instructions: fc.constant('q') }),
			fc.record({
				type: fc.constant('choice' as const),
				instructions: fc.constant('q'),
				criteria: fc.dictionary(ident, fc.constant(null), { minKeys: 1, maxKeys: 3 }),
			}),
			fc.record({
				type: fc.constant('score' as const),
				instructions: fc.constant('q'),
				criteria: fc.array(fc.constant('level'), { minLength: 2, maxLength: 4 }),
			}),
		);
		const answer: fc.Arbitrary<DecisionAnswer> = fc.oneof(
			fc.constant(null),
			fc.record({ type: fc.constant('noul' as const), noul: probability }),
			fc.record({
				type: fc.constant('choice' as const),
				choice: ident,
				probabilities: fc.constant({}),
				confidence: probability,
			}),
			fc.record({
				type: fc.constant('score' as const),
				score: fc.integer({ min: -1, max: 5 }),
				legend: fc.constant({}),
				probabilities: fc.constant({}),
				confidence: probability,
			}),
		);
		fc.assert(
			fc.property(
				fc.dictionary(ident, question, { maxKeys: 4 }),
				fc.dictionary(ident, answer, { maxKeys: 5 }),
				(questions: DecisionQuestions, answers) => {
					const result = reconcileAnswers(questions, answers);
					expect(Object.keys(result.answers).sort()).toEqual(Object.keys(questions).sort());
					for (const [name, reconciled] of Object.entries(result.answers)) {
						if (reconciled === null) continue;
						const asked = questions[name];
						expect(reconciled.type).toBe(asked.type);
						if (reconciled.type === 'choice' && asked.type === 'choice')
							expect(Object.keys(asked.criteria)).toContain(reconciled.choice);
						if (reconciled.type === 'score' && asked.type === 'score') {
							expect(reconciled.score).toBeGreaterThanOrEqual(0);
							expect(reconciled.score).toBeLessThanOrEqual(asked.criteria.length - 1);
						}
					}
					const unexpected = Object.keys(answers).filter((name) => !(name in questions));
					expect(result.problems.length).toBeGreaterThanOrEqual(unexpected.length);
				},
			),
		);
	});
});

describe('schedule extraction', () => {
	const phrase = fc
		.tuple(
			fc.constantFrom('', 'every', 'each', 'on', 'cron', 'every 5 minutes', 'hourly', 'nightly'),
			fc.constantFrom('', 'day', 'morning', 'monday', 'fridays', 'weekday', 'week', 'night'),
			fc.option(
				fc.tuple(
					fc.integer({ min: 0, max: 99 }),
					fc.option(fc.integer({ min: 0, max: 99 })),
					fc.constantFrom('', 'am', 'pm'),
				),
			),
			fc.option(fc.integer({ min: 0, max: 200 })),
		)
		.map(([lead, unit, time, every]) => {
			const at = time ? ` at ${time[0]}${time[1] === null ? '' : `:${time[1]}`}${time[2]}` : '';
			const minutes = every === null ? '' : ` every ${every} minutes`;
			return `run ${lead} ${unit}${at}${minutes}`;
		});

	it('always returns a five-field cron with in-range hour, minute and step', () => {
		fc.assert(
			fc.property(phrase, (text) => {
				const cron = detectScheduleCron(text);
				if (cron === undefined) return;
				const fields = cron.split(' ');
				expect(fields).toHaveLength(5);
				const [minute, hour] = fields;
				const step = minute.match(/^\*\/(\d+)$/);
				if (step) expect(Number(step[1])).toBeGreaterThanOrEqual(1);
				else expect(Number(minute)).toBeLessThanOrEqual(59);
				if (hour !== '*') expect(Number(hour)).toBeLessThanOrEqual(23);
			}),
		);
	});
});

// ── IR generation ────────────────────────────────────────────────────────────

const OPERATIONS = ['slack.message.post', 'postgres.row.insert', 'http.request'] as const;
const OPERATION_PARAMS: Record<(typeof OPERATIONS)[number], Record<string, unknown>> = {
	'slack.message.post': { channel: '#ops', text: 'hi' },
	'postgres.row.insert': { table: 'events' },
	'http.request': { url: 'https://example.com' },
};

/** A well-formed IR whose references only point at earlier steps. */
function irArbitrary(): fc.Arbitrary<WorkflowIR> {
	let counter = 0;
	const nextId = (prefix: string) => `${prefix}-${++counter}`;
	const leaf = (previous: string[]): fc.Arbitrary<StepIR> =>
		fc.oneof(
			fc.constantFrom(...OPERATIONS).map(
				(operationId): StepIR => ({
					id: nextId('act'),
					kind: 'action',
					operation: { operationId },
					params: previous.length
						? {
								...OPERATION_PARAMS[operationId],
								note: expr({ type: 'field', stepId: previous[0], path: ['x'] }),
							}
						: OPERATION_PARAMS[operationId],
				}),
			),
			fc.constant<StepIR>({ id: nextId('noop'), kind: 'noop' }),
			fc.constant<StepIR>({
				id: nextId('set'),
				kind: 'transform',
				fields: { a: 1 },
				includeInput: true,
			}),
			fc.constant<StepIR>({
				id: nextId('code'),
				kind: 'code',
				language: 'javascript',
				source: 'return $input.all();',
				mode: 'all_items',
			}),
		);
	const steps = (previous: string[], depth: number): fc.Arbitrary<StepIR[]> =>
		fc
			.array(fc.constant(null), { maxLength: depth > 0 ? 3 : 2 })
			.chain((slots) => sequence(slots.length, previous, depth));
	const sequence = (count: number, previous: string[], depth: number): fc.Arbitrary<StepIR[]> => {
		if (count === 0) return fc.constant([]);
		return step(previous, depth).chain((first) => {
			// An unjoined parallel emits no node, so later steps cannot reference it.
			const visible = first.kind === 'parallel' && first.join === 'none' ? [] : [first.id];
			return sequence(count - 1, [...visible, ...previous], depth).map((rest) => [first, ...rest]);
		});
	};
	const step = (previous: string[], depth: number): fc.Arbitrary<StepIR> => {
		if (depth === 0) return leaf(previous);
		return fc.oneof(
			{ arbitrary: leaf(previous), weight: 4 },
			fc.tuple(steps(previous, depth - 1), steps(previous, depth - 1)).map(
				([then, otherwise]): StepIR => ({
					id: nextId('if'),
					kind: 'branch',
					condition: { op: 'exists', left: { type: 'input', path: ['flag'] } },
					then,
					else: otherwise,
				}),
			),
			fc.tuple(steps(previous, depth - 1), steps(previous, depth - 1), fc.boolean()).map(
				([a, b, fallback]): StepIR => ({
					id: nextId('switch'),
					kind: 'switch',
					on: { type: 'input', path: ['kind'] },
					cases: [
						{ value: 'x', steps: a },
						{ value: 'y', steps: b },
					],
					...(fallback ? { fallback: [] } : {}),
				}),
			),
			fc
				.tuple(
					steps(previous, depth - 1),
					steps(previous, depth - 1),
					fc.constantFrom('all' as const, 'none' as const),
				)
				.map(
					([a, b, join]): StepIR => ({
						id: nextId('par'),
						kind: 'parallel',
						branches: [a, b],
						join,
					}),
				),
			sequence(1, previous, depth - 1).map(
				(body): StepIR => ({ id: nextId('map'), kind: 'map', batchSize: 5, steps: body }),
			),
		);
	};
	return fc
		.tuple(fc.constantFrom('webhook', 'schedule', 'manual'), fc.integer({ min: 0, max: 2 }))
		.chain(([triggerKind, depth]) => {
			counter = 0;
			const trigger =
				triggerKind === 'webhook'
					? { operationId: 'webhook.trigger', params: { method: 'POST', path: 'in' } }
					: triggerKind === 'schedule'
						? { operationId: 'schedule.trigger', params: { cron: '0 9 * * *' } }
						: { operationId: 'manual.trigger', params: {} };
			return steps(['trigger'], depth).map((body) =>
				workflowIrSchema.parse({
					id: 'wf',
					name: 'Generated',
					triggers: [
						{
							id: 'trigger',
							kind: 'trigger',
							triggerKind,
							operation: { operationId: trigger.operationId },
							params: trigger.params,
						},
					],
					steps: body,
				}),
			);
		});
}

const workflowIr = irArbitrary();

describe('compiler', () => {
	it('is deterministic and emits unique names and ids, wired only to emitted nodes', () => {
		fc.assert(
			fc.property(workflowIr, (ir) => {
				expect(validateWorkflowIr(ir)).toEqual([]);
				const first = compileWorkflow(ir, registry);
				const second = compileWorkflow(ir, registry);
				expect(second).toEqual(first);
				const names = first.workflow.nodes.map((node) => node.name);
				const ids = first.workflow.nodes.map((node) => node.id);
				expect(new Set(names).size).toBe(names.length);
				expect(new Set(ids).size).toBe(ids.length);
				for (const step of allSteps(ir)) {
					if (step.kind === 'parallel' && step.join === 'none') continue;
					expect(names).toContain(first.stepNodeNames[step.id]);
				}
				for (const [source, outputs] of Object.entries(first.workflow.connections)) {
					expect(names).toContain(source);
					for (const slot of outputs.main ?? [])
						for (const edge of slot ?? []) expect(names).toContain(edge.node);
				}
				for (const node of first.workflow.nodes) {
					expect(node.position[0]).toBeGreaterThanOrEqual(0);
					expect(node.position[1]).toBeGreaterThanOrEqual(0);
				}
				expect(JSON.stringify(first.workflow)).not.toContain('"$expr"');
			}),
			{ numRuns: 60 },
		);
	});

	it('every compiled node except the trigger has an incoming edge', () => {
		fc.assert(
			fc.property(workflowIr, (ir) => {
				const { workflow } = compileWorkflow(ir, registry);
				for (const node of workflow.nodes) {
					if (node.name === workflow.nodes[0].name) continue;
					expect(incomingEdges(workflow, node.name ?? '').length).toBeGreaterThan(0);
				}
			}),
			{ numRuns: 60 },
		);
	});
});

describe('execution paths', () => {
	it('every path starts at the trigger, visits real nodes once, and coverage is exact', () => {
		fc.assert(
			fc.property(workflowIr, fc.integer({ min: 1, max: 8 }), (ir, maxPaths) => {
				const { workflow } = compileWorkflow(ir, registry);
				const names = new Set(workflow.nodes.map((node) => node.name ?? ''));
				const paths = enumerateExecutionPaths(workflow, { maxPaths });
				expect(paths.length).toBeGreaterThan(0);
				expect(paths.length).toBeLessThanOrEqual(maxPaths);
				const keys = paths.map((path) => `${path.id}|${path.end}`);
				expect(new Set(keys).size).toBe(keys.length);
				for (const path of paths) {
					expect(path.trigger).toBe(workflow.nodes[0].name);
					expect(path.nodes[0]).toBe(path.trigger);
					expect(path.nodes[path.nodes.length - 1]).toBe(path.end);
					for (const node of path.nodes) expect(names.has(node)).toBe(true);
					const loopFree = path.nodes.slice(0, -1);
					expect(new Set(loopFree).size).toBe(loopFree.length);
				}
				const full = pathCoverage(paths, [names]);
				expect(full).toMatchObject({ total: paths.length, covered: paths.length, uncovered: [] });
				const none = pathCoverage(paths, []);
				expect(none.covered).toBe(0);
				expect(none.uncovered.map((u) => u.firstMissingNode)).toEqual(
					paths.map((path) => path.nodes[0]),
				);
			}),
			{ numRuns: 60 },
		);
	});
});

describe('patches', () => {
	it('never mutates the input and only ever references existing nodes', () => {
		const patch = (names: string[]): fc.Arbitrary<WorkflowPatch> =>
			fc.oneof(
				fc.record({
					op: fc.constant('add_edge' as const),
					from: fc.constantFrom(...names),
					fromOutput: fc.integer({ min: 0, max: 2 }),
					to: fc.constantFrom(...names),
					toInput: fc.integer({ min: 0, max: 1 }),
				}),
				fc.record({
					op: fc.constant('remove_edge' as const),
					from: fc.constantFrom(...names),
					fromOutput: fc.integer({ min: 0, max: 2 }),
					to: fc.constantFrom(...names),
					toInput: fc.integer({ min: 0, max: 1 }),
				}),
				fc.record({ op: fc.constant('remove_node' as const), nodeName: fc.constantFrom(...names) }),
				fc.record({
					op: fc.constant('update_node' as const),
					nodeName: fc.constantFrom(...names),
					parameters: fc.dictionary(ident, fc.jsonValue({ maxDepth: 1 }), { maxKeys: 2 }),
				}),
				fc.record({ op: fc.constant('rename_workflow' as const), name: ident }),
				ident.map(
					(name): WorkflowPatch => ({
						op: 'add_node',
						node: {
							id: name,
							name: `new ${name}`,
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					}),
				),
			);
		fc.assert(
			fc.property(
				workflowIr.chain((ir) => {
					const { workflow } = compileWorkflow(ir, registry);
					const names = workflow.nodes.map((node) => node.name ?? '');
					return fc.tuple(fc.constant(workflow), fc.array(patch(names), { maxLength: 6 }));
				}),
				([workflow, patches]) => {
					const before = JSON.stringify(workflow);
					let result: ReturnType<typeof applyPatches> | undefined;
					try {
						result = applyPatches(workflow, patches);
					} catch (error) {
						expect(String(error)).toMatch(/unknown node|already exists/);
					}
					expect(JSON.stringify(workflow)).toBe(before);
					if (!result) return;
					const names = new Set(result.nodes.map((node) => node.name));
					for (const [source, outputs] of Object.entries(result.connections)) {
						expect(names.has(source)).toBe(true);
						for (const slot of outputs.main ?? [])
							for (const edge of slot ?? []) expect(names.has(edge.node)).toBe(true);
					}
					const removed = patches.filter((p) => p.op === 'remove_node').map((p) => p.nodeName);
					for (const name of removed) {
						const readded = patches.some((p) => p.op === 'add_node' && p.node.name === name);
						if (!readded) expect(names.has(name)).toBe(false);
					}
				},
			),
			{ numRuns: 80 },
		);
	});

	it('adding then removing an edge restores the wiring', () => {
		fc.assert(
			fc.property(
				workflowIr.chain((ir) => {
					const { workflow } = compileWorkflow(ir, registry);
					const names = workflow.nodes.map((node) => node.name ?? '');
					return fc.tuple(
						fc.constant(workflow),
						fc.constantFrom(...names),
						fc.constantFrom(...names),
						fc.integer({ min: 0, max: 1 }),
					);
				}),
				([workflow, from, to, fromOutput]) => {
					const edge = { from, fromOutput, to, toInput: 0 };
					const already = incomingEdges(workflow, to).some(
						(e) => e.from === from && e.fromOutput === fromOutput && e.toInput === 0,
					);
					const added = applyPatches(workflow, [{ op: 'add_edge', ...edge }]);
					expect(
						incomingEdges(added, to).filter((e) => e.from === from && e.fromOutput === fromOutput),
					).toHaveLength(1);
					const restored = applyPatches(added, [{ op: 'remove_edge', ...edge }]);
					if (!already) {
						const strip = (w: typeof workflow) =>
							Object.fromEntries(
								Object.entries(w.connections).map(([k, v]) => [
									k,
									(v.main ?? []).map((s) => s ?? []),
								]),
							);
						const expected = strip(workflow);
						const actual = strip(restored);
						for (const key of Object.keys(expected))
							expect(actual[key].flat()).toEqual(expected[key].flat());
					}
				},
			),
			{ numRuns: 60 },
		);
	});
});
