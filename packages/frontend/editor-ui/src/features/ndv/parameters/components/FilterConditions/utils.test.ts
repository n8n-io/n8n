import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { createTestingPinia } from '@pinia/testing';
import {
	NodeConnectionTypes,
	type FilterConditionValue,
	type FilterOptionsValue,
} from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import {
	getFilterOperator,
	handleOperatorChange,
	inferOperatorType,
	resolveCondition,
} from './utils';

describe('FilterConditions > utils', () => {
	describe('handleOperatorChange', () => {
		test('should convert string > number', () => {
			const condition = {
				id: '1',
				leftValue: '45',
				rightValue: 'notANumber',
				operator: getFilterOperator('string:equals'),
			};
			expect(
				handleOperatorChange({
					condition,
					newOperator: getFilterOperator('number:gt'),
				}),
			).toEqual({
				id: '1',
				leftValue: 45,
				rightValue: 'notANumber',
				operator: {
					operation: 'gt',
					type: 'number',
				},
			});
		});

		test('should convert string > boolean', () => {
			const condition = {
				id: '1',
				leftValue: 'notABool',
				rightValue: 'true',
				operator: getFilterOperator('string:equals'),
			};
			expect(
				handleOperatorChange({
					condition,
					newOperator: getFilterOperator('boolean:notEquals'),
				}),
			).toEqual({
				id: '1',
				leftValue: false,
				rightValue: true,
				operator: {
					operation: 'notEquals',
					type: 'boolean',
				},
			});
		});

		test('should not convert or clear expressions', () => {
			const condition = {
				id: '1',
				leftValue: '={{ $json.foo }}',
				rightValue: '={{ $("nodename").foo }}',
				operator: getFilterOperator('string:equals'),
			};
			expect(
				handleOperatorChange({
					condition,
					newOperator: getFilterOperator('boolean:equals'),
				}),
			).toEqual({
				id: '1',
				leftValue: '={{ $json.foo }}',
				rightValue: '={{ $("nodename").foo }}',
				operator: {
					operation: 'equals',
					type: 'boolean',
				},
			});
		});

		// NODE-5984: stored rightValue must survive switching to a single-value operator and back
		test('should preserve stored rightValue when switching to a single-value operator and back', () => {
			const condition: FilterConditionValue = {
				id: '1',
				leftValue: '={{ $json.value }}',
				rightValue: "={{ $('x').item.json.x }}",
				operator: getFilterOperator('string:equals'),
			};

			const afterSingleValue = handleOperatorChange({
				condition,
				newOperator: getFilterOperator('string:exists'),
			});
			expect(afterSingleValue.rightValue).toBe("={{ $('x').item.json.x }}");

			const afterRestored = handleOperatorChange({
				condition: afterSingleValue,
				newOperator: getFilterOperator('string:equals'),
			});
			expect(afterRestored.rightValue).toBe("={{ $('x').item.json.x }}");
		});
	});

	describe('resolveCondition', () => {
		const defaultOptions: FilterOptionsValue = {
			caseSensitive: true,
			leftValue: '',
			typeValidation: 'strict',
			version: 3,
		};

		const setupWorkflowContext = () => {
			setActivePinia(createTestingPinia({ stubActions: false }));

			const workflowData = createTestWorkflow({
				nodes: [
					createTestNode({
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
					}),
					createTestNode({
						name: 'If',
						type: 'n8n-nodes-base.if',
						typeVersion: 2.3,
					}),
					createTestNode({
						name: 'Unexecuted',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
					}),
				],
				connections: {
					Trigger: {
						[NodeConnectionTypes.Main]: [
							[{ node: 'If', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				},
				pinData: {
					Trigger: [{ json: { value: 'hello' } }],
				},
			});

			const workflowDocumentStore = useWorkflowDocumentStore(
				createWorkflowDocumentId(workflowData.id),
			);
			workflowDocumentStore.hydrate(workflowData);

			const ndvStore = useNDVStore(workflowDocumentStore.documentId);
			ndvStore.setActiveNodeName('If', 'other');

			return { workflowDocumentId: workflowDocumentStore.documentId };
		};

		// Happy path control test to prove resolveCondition evaluates against the hydrated workflow
		test('should resolve a single-value condition when rightValue is empty', async () => {
			const { workflowDocumentId } = setupWorkflowContext();
			const condition: FilterConditionValue = {
				id: '1',
				leftValue: '={{ $json.value }}',
				rightValue: '',
				operator: getFilterOperator('string:exists'),
			};

			const result = await resolveCondition({
				condition,
				options: defaultOptions,
				workflowDocumentId,
			});

			expect(result).toMatchObject({
				status: 'success',
				result: true,
				resolved: expect.objectContaining({ leftValue: 'hello' }),
			});
		});

		// NODE-5984: NDV should ignore hidden rightValue referencing a deleted node when singleValue is true
		test('should ignore hidden rightValue referencing a deleted node for single-value operator (NODE-5984)', async () => {
			const { workflowDocumentId } = setupWorkflowContext();
			const condition: FilterConditionValue = {
				id: '277c454f-6cdb-4699-857b-3e676998c8a2',
				leftValue: '={{ $json.value }}',
				rightValue: "={{ $('x').item.json.x }}",
				operator: getFilterOperator('string:exists'),
			};

			const result = await resolveCondition({
				condition,
				options: defaultOptions,
				workflowDocumentId,
			});

			expect(result).toMatchObject({
				status: 'success',
				result: true,
				resolved: expect.objectContaining({ leftValue: 'hello' }),
			});
			expect(condition.rightValue).toBe("={{ $('x').item.json.x }}");
		});

		// NODE-5984: NDV should also ignore hidden rightValue referencing an unexecuted node
		test('should ignore hidden rightValue referencing an unexecuted node for single-value operator (NODE-5984)', async () => {
			const { workflowDocumentId } = setupWorkflowContext();
			const condition: FilterConditionValue = {
				id: '277c454f-6cdb-4699-857b-3e676998c8a2',
				leftValue: '={{ $json.value }}',
				rightValue: "={{ $('Unexecuted').first().json.x }}",
				operator: getFilterOperator('string:exists'),
			};

			const result = await resolveCondition({
				condition,
				options: defaultOptions,
				workflowDocumentId,
			});

			expect(result).toMatchObject({
				status: 'success',
				result: true,
				resolved: expect.objectContaining({ leftValue: 'hello' }),
			});
			expect(condition.rightValue).toBe("={{ $('Unexecuted').first().json.x }}");
		});

		test('should still return resolve_error for two-value operator with unresolvable rightValue', async () => {
			const { workflowDocumentId } = setupWorkflowContext();
			const condition: FilterConditionValue = {
				id: '1',
				leftValue: '={{ $json.value }}',
				rightValue: "={{ $('x').item.json.x }}",
				operator: getFilterOperator('string:equals'),
			};

			const result = await resolveCondition({
				condition,
				options: defaultOptions,
				workflowDocumentId,
			});

			expect(result).toEqual({ status: 'resolve_error' });
		});

		test('should still return resolve_error for single-value operator with unresolvable leftValue', async () => {
			const { workflowDocumentId } = setupWorkflowContext();
			const condition: FilterConditionValue = {
				id: '1',
				leftValue: "={{ $('x').item.json.x }}",
				rightValue: '',
				operator: getFilterOperator('string:exists'),
			};

			const result = await resolveCondition({
				condition,
				options: defaultOptions,
				workflowDocumentId,
			});

			expect(result).toEqual({ status: 'resolve_error' });
		});
	});

	describe('inferOperatorType', () => {
		test.each([
			['hello world', 'string'],
			[14.2, 'number'],
			[false, 'boolean'],
			[[{ a: 1 }], 'array'],
			[{ a: 1 }, 'object'],
			['2024-01-01', 'dateTime'],
		])('should correctly infer %s type', (value, result) => {
			expect(inferOperatorType(value)).toBe(result);
		});
	});
});
