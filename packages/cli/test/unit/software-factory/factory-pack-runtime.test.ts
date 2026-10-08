import { randomUUID } from 'node:crypto';

import type { TemplateWorkflow } from './factory-pack-files';
import { loadBuiltinNodeTypes } from './factory-pack-files';
import { TemplateRuntime, nodeTypesOf } from './factory-pack-runtime';

/**
 * A small workflow in the shape of the factory: a step with an error output, a gate, a Switch,
 * two outcomes and a Code node behind both outcomes.
 */
const node = (name: string, type: string, typeVersion: number, parameters = {}, extra = {}) => ({
	id: randomUUID(),
	name,
	type: `n8n-nodes-base.${type}`,
	typeVersion,
	position: [0, 0] satisfies [number, number],
	parameters,
	...extra,
});

const filter = (leftValue: string, operation: string, rightValue: unknown) => ({
	options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 },
	conditions: [{ id: 'c', leftValue, rightValue, operator: { type: 'string', operation } }],
	combinator: 'and',
});

const to = (...names: string[]) => names.map((name) => ({ node: name, type: 'main', index: 0 }));

const small: TemplateWorkflow = {
	name: 'Small',
	nodes: [
		node('Start', 'manualTrigger', 1),
		node('Step', 'set', 3.4, { assignments: { assignments: [] }, includeOtherFields: true }, {
			onError: 'continueErrorOutput',
		}),
		node('Gate', 'if', 2.3, { conditions: filter('={{ $json.result }}', 'equals', 'ok') }),
		node('Route', 'switch', 3.4, {
			mode: 'rules',
			rules: {
				values: [
					{ conditions: filter('={{ $json.result }}', 'equals', 'a') },
					{ conditions: filter('={{ $json.result }}', 'equals', 'b') },
				],
			},
			options: { fallbackOutput: 'extra' },
		}),
		node('Failure', 'set', 3.4, { assignments: { assignments: [] } }),
		node('Done', 'set', 3.4, { assignments: { assignments: [] } }),
		node('Record', 'code', 2, {
			jsCode: "return [{ json: { last: $('Step').last()?.json ?? null, success: $('Step').last(0)?.json ?? null } }];",
		}),
	],
	connections: {
		Start: { main: [to('Step')] },
		// The failure path comes first, so a search back from Record meets the error output first.
		Step: { main: [to('Gate'), to('Failure')] },
		Gate: { main: [to('Route'), to('Failure')] },
		Route: { main: [to('Done'), to('Done'), to('Failure')] },
		Failure: { main: [to('Record')] },
		Done: { main: [to('Record')] },
	},
	settings: { executionOrder: 'v1' },
};

const runtime = new TemplateRuntime(small, nodeTypesOf(loadBuiltinNodeTypes()));
const succeeded = { nodes: { Step: { result: 'ok' } } };

describe('TemplateRuntime', () => {
	describe('output of earlier nodes', () => {
		it('reads the output that n8n picks when an expression gives no output index', () => {
			// n8n reads the output through which the active node is connected: here the error output.
			expect(runtime.evaluate('Record', "={{ $('Step').last()?.json ?? 'none' }}", succeeded)).toBe(
				'none',
			);
			expect(runtime.evaluate('Record', "={{ $('Step').last(0).json.result }}", succeeded)).toBe(
				'ok',
			);
			expect(runtime.evaluate('Done', "={{ $('Step').last().json.result }}", succeeded)).toBe('ok');
		});

		it('finds the output that n8n reads by default with its own search', () => {
			expect(runtime.defaultOutputIndex('Record', 'Step')).toBe(1);
			expect(runtime.defaultOutputIndex('Done', 'Step')).toBe(0);
			// A node that is not behind the referenced node reads output 0.
			expect(runtime.defaultOutputIndex('Step', 'Done')).toBe(0);
		});

		it('gives a Code node the same data proxy', () => {
			expect(runtime.runCode('Record', succeeded)).toEqual([
				{ json: { last: null, success: { result: 'ok' } } },
			]);
		});

		it('puts the item of a failed node on its error output', () => {
			const run = { failed: { Step: { error: 'It broke.' } } };

			expect(runtime.evaluate('Record', "={{ $('Step').last(1).json.error }}", run)).toBe(
				'It broke.',
			);
			expect(runtime.evaluate('Record', "={{ $('Step').last(0) ?? 'none' }}", run)).toBe('none');
		});

		it('reports a node that did not run, as n8n does', () => {
			expect(runtime.evaluate('Done', "={{ $('Step').isExecuted }}")).toBe(false);
			expect(() => runtime.evaluate('Done', "={{ $('Step').first().json }}")).toThrow(
				"Node 'Step' hasn't been executed",
			);
		});

		it('rejects data for a node that the workflow does not have', () => {
			expect(() => runtime.evaluate('Done', '={{ 1 }}', { nodes: { Missing: {} } })).toThrow(
				'The template has no node "Missing"',
			);
			expect(() => runtime.evaluate('Missing', '={{ 1 }}')).toThrow(
				'The template has no node "Missing"',
			);
			expect(() => runtime.evaluate('Done', '={{ 1 }}', { failed: { Start: {} } })).toThrow(
				'"Start" has no error output',
			);
		});
	});

	describe('expressions', () => {
		it.each([
			['one expression keeps its number type', '={{ 1 + 1 }}', 2],
			['one expression keeps its object type', '={{ { a: { b: [1, 2] } } }}', { a: { b: [1, 2] } }],
			['nested braces inside one expression', '={{ JSON.stringify({ a: { b: 1 } }) }}', '{"a":{"b":1}}'],
			['text around an expression makes a string', '=a{{ 1 + 1 }}b', 'a2b'],
			['two expressions make a string', '={{ 1 }}-{{ 2 }}', '1-2'],
			['a value without "=" is not an expression', '{{ 1 + 1 }}', '{{ 1 + 1 }}'],
			['a number stays a number', 5, 5],
			['null stays null', null, null],
		])('resolves %s', (_case, value, expected) => {
			expect(runtime.evaluate('Done', value)).toEqual(expected);
		});

		it('resolves each expression inside an object or a list', () => {
			const value = { a: '={{ 1 }}', b: ['={{ "x" }}', 'y'], c: { d: '=n{{ 2 }}' } };

			expect(runtime.evaluate('Done', value)).toEqual({ a: 1, b: ['x', 'y'], c: { d: 'n2' } });
		});

		it('gives $json, $prevNode, $runIndex, $execution and node parameters from the run', () => {
			const value =
				"={{ [$json.result, $prevNode.name, $prevNode.runIndex, $runIndex, $execution.id, $('Step').params.includeOtherFields].join(' ') }}";
			const run = {
				json: { result: 'b' },
				previousNode: 'Route',
				previousNodeRun: 2,
				runIndex: 3,
				executionId: '77',
			};

			expect(runtime.evaluate('Done', value, run)).toBe('b Route 2 3 77 true');
			expect(runtime.evaluate('Done', '={{ $prevNode.name }}')).toBe('Route');
		});

		it('adds the default parameters of the node type, as n8n does when it loads a workflow', () => {
			expect(runtime.parametersOf('Done')).toMatchObject({ includeOtherFields: false });
			const changed = runtime.withParameters({ Step: { includeOtherFields: false } });

			expect(changed.parametersOf('Step')).toMatchObject({ includeOtherFields: false });
			expect(runtime.parametersOf('Step')).toMatchObject({ includeOtherFields: true });
		});
	});

	describe('gates', () => {
		it('decides an If node with the filter logic of n8n', () => {
			expect(runtime.passesIf('Gate', { json: { result: 'ok' } })).toBe(true);
			expect(runtime.passesIf('Gate', { json: { result: 'no' } })).toBe(false);
			expect(runtime.passesIf('Gate', { json: {} })).toBe(false);
		});

		it('fails like the If node when a strict type check fails', () => {
			expect(() => runtime.passesIf('Gate', { json: { result: 7 } })).toThrow();
		});

		it('sends a Switch item to the first matching rule or to the fallback', () => {
			expect(runtime.routeOf('Route', { json: { result: 'a' } })).toBe(0);
			expect(runtime.routeOf('Route', { json: { result: 'b' } })).toBe(1);
			expect(runtime.routeOf('Route', { json: { result: 'c' } })).toBe('fallback');
			expect(() => runtime.routeOf('Gate')).toThrow('"Gate" has no rules');
		});
	});

	it('names an unknown node type', () => {
		expect(() => nodeTypesOf([]).getByNameAndVersion('n8n-nodes-base.nothing', 1)).toThrow(
			'Unknown node type n8n-nodes-base.nothing@1',
		);
	});
});
