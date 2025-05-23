import { getAdditionalKeys } from 'n8n-core';
import type {
	IDataObject,
	IExecuteData,
	INodeType,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { Workflow, WorkflowDataProxy } from 'n8n-workflow';

import { newDataRequestResponse } from '../../__tests__/test-data';
import { BuiltInsParser } from '../built-ins-parser';
import { BuiltInsParserState } from '../built-ins-parser-state';

describe('BuiltInsParser', () => {
	const parser = new BuiltInsParser();

	const parseAndExpectOk = (code: string) => {
		const result = parser.parseUsedBuiltIns(code);
		if (!result.ok) {
			throw result.error;
		}

		return result.result;
	};

	describe('Env, input, execution and prevNode', () => {
		const cases: Array<[string, BuiltInsParserState]> = [
			['$env', new BuiltInsParserState({ needs$env: true })],
			['$execution', new BuiltInsParserState({ needs$execution: true })],
			['$prevNode', new BuiltInsParserState({ needs$prevNode: true })],
		];

		test.each(cases)("should identify built-ins in '%s'", (code, expected) => {
			const state = parseAndExpectOk(code);
			expect(state).toEqual(expected);
		});
	});

	describe('Input', () => {
		it('should mark input as needed when $input is used', () => {
			const state = parseAndExpectOk(`
				$input.item.json.age = 10 + Math.floor(Math.random() * 30);
				$input.item.json.password = $input.item.json.password.split('').map(() => '*').join("")
				delete $input.item.json.lastname
				const emailParts = $input.item.json.email.split("@")
				$input.item.json.emailData = {
					user: emailParts[0],
					domain: emailParts[1]
				}

				return $input.item;
			`);

			expect(state).toEqual(new BuiltInsParserState({ needs$input: true }));
		});

		it('should mark input as needed when $json is used', () => {
			const state = parseAndExpectOk(`
				$json.age = 10 + Math.floor(Math.random() * 30);
				return $json;
				`);

			expect(state).toEqual(new BuiltInsParserState({ needs$input: true }));
		});

		test.each([['items'], ['item']])(
			'should mark input as needed when %s is used',
			(identifier) => {
				const state = parseAndExpectOk(`return ${identifier};`);

				expect(state).toEqual(new BuiltInsParserState({ needs$input: true }));
			},
		);
	});

	describe('$(...)', () => {
		const cases: Array<[string, BuiltInsParserState]> = [
			[
				'$("nodeName").first()',
				new BuiltInsParserState({ neededNodeNames: new Set(['nodeName']) }),
			],
			[
				'$("nodeName").all(); $("secondNode").matchingItem()',
				new BuiltInsParserState({ neededNodeNames: new Set(['nodeName', 'secondNode']) }),
			],
		];

		test.each(cases)("should identify nodes in '%s'", (code, expected) => {
			const state = parseAndExpectOk(code);
			expect(state).toEqual(expected);
		});

		it('should need all nodes when $() is called with a variable', () => {
			const state = parseAndExpectOk('var n = "name"; $(n)');
			expect(state).toEqual(new BuiltInsParserState({ needsAllNodes: true, needs$input: true }));
		});

		it('should require all nodes when there are multiple usages of $() and one is with a variable', () => {
			const state = parseAndExpectOk(`
				$("nodeName");
				$("secondNode");
				var n = "name";
				$(n)
			`);
			expect(state).toEqual(new BuiltInsParserState({ needsAllNodes: true, needs$input: true }));
		});

		test.each([
			['without parameters', '$()'],
			['number literal', '$(123)'],
		])('should ignore when $ is called %s', (_, code) => {
			const state = parseAndExpectOk(code);
			expect(state).toEqual(new BuiltInsParserState());
		});

		test.each([
			'$("node").item',
			'$("node")["item"]',
			'$("node").pairedItem()',
			'$("node")["pairedItem"]()',
			'$("node").itemMatching(0)',
			'$("node")["itemMatching"](0)',
			'$("node")[variable]',
			'var a = $("node")',
			'let a = $("node")',
			'const a = $("node")',
			'a = $("node")',
		])('should require all nodes if %s is used', (code) => {
			const state = parseAndExpectOk(code);
			expect(state).toEqual(new BuiltInsParserState({ needsAllNodes: true, needs$input: true }));
		});

		test.each(['$("node").first()', '$("node").last()', '$("node").all()', '$("node").params'])(
			'should require only accessed node if %s is used',
			(code) => {
				const state = parseAndExpectOk(code);
				expect(state).toEqual(
					new BuiltInsParserState({
						needsAllNodes: false,
						neededNodeNames: new Set(['node']),
					}),
				);
			},
		);
	});

	describe('$items(...)', () => {
		it('should mark input as needed when $items() is used without arguments', () => {
			const state = parseAndExpectOk('$items()');
			expect(state).toEqual(new BuiltInsParserState({ needs$input: true }));
		});

		it('should require the given node when $items() is used with a static value', () => {
			const state = parseAndExpectOk('$items("nodeName")');
			expect(state).toEqual(new BuiltInsParserState({ neededNodeNames: new Set(['nodeName']) }));
		});

		it('should require all nodes when $items() is used with a variable', () => {
			const state = parseAndExpectOk('var n = "name"; $items(n)');
			expect(state).toEqual(new BuiltInsParserState({ needsAllNodes: true, needs$input: true }));
		});
	});

	describe('$node', () => {
		it('should require all nodes when $node is used', () => {
			const state = parseAndExpectOk('return $node["name"];');
			expect(state).toEqual(new BuiltInsParserState({ needsAllNodes: true, needs$input: true }));
		});
	});

	describe('$item', () => {
		it('should require all nodes and input when $item is used', () => {
			const state = parseAndExpectOk('$item("0").$node["my node"].json["title"]');
			expect(state).toEqual(new BuiltInsParserState({ needsAllNodes: true, needs$input: true }));
		});
	});

	describe('ECMAScript syntax', () => {
		describe('ES2020', () => {
			it('should parse optional chaining', () => {
				parseAndExpectOk(`
					const a = { b: { c: 1 } };
					return a.b?.c;
				`);
			});

			it('should parse nullish coalescing', () => {
				parseAndExpectOk(`
					const a = null;
					return a ?? 1;
				`);
			});
		});

		describe('ES2021', () => {
			it('should parse numeric separators', () => {
				parseAndExpectOk(`
					const a = 1_000_000;
					return a;
				`);
			});
		});
	});

	describe('WorkflowDataProxy built-ins', () => {
		it('should have a known list of built-ins', () => {
			const data = newDataRequestResponse([]);
			const executeData: IExecuteData = {
				data: {},
				node: data.node,
				source: data.connectionInputSource,
			};
			const dataProxy = new WorkflowDataProxy(
				new Workflow({
					...data.workflow,
					nodeTypes: {
						getByName() {
							return undefined as unknown as INodeType;
						},
						getByNameAndVersion() {
							return undefined as unknown as INodeType;
						},
						getKnownTypes() {
							return undefined as unknown as IDataObject;
						},
					},
				}),
				data.runExecutionData,
				data.runIndex,
				0,
				data.activeNodeName,
				[],
				data.siblingParameters,
				data.mode,
				getAdditionalKeys(
					data.additionalData as IWorkflowExecuteAdditionalData,
					data.mode,
					data.runExecutionData,
				),
				executeData,
				data.defaultReturnRunIndex,
				data.selfData,
				data.contextNodeName,
				// Make sure that even if we don't receive the envProviderState for
				// whatever reason, we don't expose the task runner's env to the code
				data.envProviderState ?? {
					env: {},
					isEnvAccessBlocked: false,
					isProcessAvailable: true,
				},
			).getDataProxy({ throwOnMissingExecutionData: false });

			/**
			 * NOTE! If you are adding new built-ins to the WorkflowDataProxy class
			 * make sure the built-ins parser and Task Runner handle them properly.
			 */
			expect(Object.keys(dataProxy)).toStrictEqual([
				'$',
				'$input',
				'$binary',
				'$data',
				'$env',
				'$evaluateExpression',
				'$item',
				'$fromAI',
				'$fromai',
				'$fromAi',
				'$items',
				'$json',
				'$node',
				'$self',
				'$parameter',
				'$rawParameter',
				'$prevNode',
				'$runIndex',
				'$mode',
				'$workflow',
				'$itemIndex',
				'$now',
				'$today',
				'$jmesPath',
				'DateTime',
				'Interval',
				'Duration',
				'$execution',
				'$vars',
				'$secrets',
				'$executionId',
				'$resumeWebhookUrl',
				'$getPairedItem',
				'$jmespath',
				'$position',
				'$thisItem',
				'$thisItemIndex',
				'$thisRunIndex',
				'$nodeVersion',
				'$nodeId',
				'$agentInfo',
				'$webhookId',
			]);
		});
	});
});
