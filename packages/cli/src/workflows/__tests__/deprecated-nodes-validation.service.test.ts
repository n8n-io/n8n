import type { Logger } from '@n8n/backend-common';
import type { NodesConfig } from '@n8n/config';
import type { INode, INodeType } from 'n8n-workflow';
import { fail } from 'node:assert';
import { mock } from 'vitest-mock-extended';

import {
	DeprecatedNodesError,
	type DeprecatedNodeViolation,
} from '@/errors/response-errors/deprecated-nodes.error';
import type { NodeTypes } from '@/node-types';
import { DeprecatedNodesValidationService } from '@/workflows/deprecated-nodes-validation.service';

describe('DeprecatedNodesValidationService', () => {
	let validator: DeprecatedNodesValidationService;
	let nodesConfig: NodesConfig;
	let nodeTypes: ReturnType<typeof mock<NodeTypes>>;
	let logger: ReturnType<typeof mock<Logger>>;

	const nodeTypeFor = (type: string, deprecated?: boolean): INodeType =>
		Object.assign(mock<INodeType>(), {
			description: {
				name: type,
				deprecated: deprecated ? true : undefined,
				properties: [
					{ displayName: 'Code', name: 'functionCode', type: 'string', default: '// default' },
				],
			},
		});

	beforeEach(() => {
		nodesConfig = { blockDeprecated: true } as NodesConfig;
		nodeTypes = mock<NodeTypes>();
		logger = mock<Logger>();

		nodeTypes.getByNameAndVersion.mockImplementation((type) => {
			if (type === 'n8n-nodes-base.function' || type === 'n8n-nodes-base.functionItem') {
				return nodeTypeFor(type, true);
			}
			return nodeTypeFor(type, false);
		});

		validator = new DeprecatedNodesValidationService(logger, nodesConfig, nodeTypes);
	});

	const expectViolations = (run: () => void, violations: DeprecatedNodeViolation[]) => {
		try {
			run();
			fail('expected to throw');
		} catch (error) {
			expect(error).toBeInstanceOf(DeprecatedNodesError);
			expect((error as DeprecatedNodesError).meta.violations).toEqual(violations);
		}
	};

	const makeNode = (overrides: Partial<INode> & Pick<INode, 'id' | 'type'>): INode => ({
		name: overrides.id,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	});

	describe('validateOnCreate', () => {
		it('passes when no deprecated nodes are present', () => {
			const nodes = [makeNode({ id: 'a', type: 'n8n-nodes-base.set' })];
			expect(() => validator.validateOnCreate(nodes)).not.toThrow();
		});

		it('throws DeprecatedNodesError when any node type is deprecated', () => {
			const nodes = [
				makeNode({ id: 'a', type: 'n8n-nodes-base.set' }),
				makeNode({ id: 'b', type: 'n8n-nodes-base.function' }),
			];
			expect(() => validator.validateOnCreate(nodes)).toThrow(DeprecatedNodesError);
			expect(() => validator.validateOnCreate(nodes)).toThrow(/deprecated/);
		});

		it('exposes every deprecated node in error meta and message', () => {
			const nodes = [
				makeNode({ id: 'a', type: 'n8n-nodes-base.function', name: 'Func A' }),
				makeNode({ id: 'b', type: 'n8n-nodes-base.functionItem', name: 'Func B' }),
			];
			try {
				validator.validateOnCreate(nodes);
				fail('expected to throw');
			} catch (error) {
				expect(error).toBeInstanceOf(DeprecatedNodesError);
				const typed = error as DeprecatedNodesError;
				expect(typed.meta.violations).toEqual([
					{ kind: 'added', nodeName: 'Func A', nodeType: 'n8n-nodes-base.function' },
					{ kind: 'added', nodeName: 'Func B', nodeType: 'n8n-nodes-base.functionItem' },
				]);
				expect(typed.message).toContain('Func A');
				expect(typed.message).toContain('Func B');
			}
		});

		it('does not treat an unknown node type as deprecated', () => {
			nodeTypes.getByNameAndVersion.mockImplementation(() => {
				throw new Error('Unrecognized node type');
			});
			const nodes = [makeNode({ id: 'a', type: 'community.unknown' })];
			expect(() => validator.validateOnCreate(nodes)).not.toThrow();
		});

		it('is a no-op when the config flag is off', () => {
			nodesConfig.blockDeprecated = false;
			const nodes = [makeNode({ id: 'a', type: 'n8n-nodes-base.function' })];
			expect(() => validator.validateOnCreate(nodes)).not.toThrow();
		});
	});

	describe('validateOnUpdate', () => {
		it('allows an unchanged deprecated node to pass through', () => {
			const node = makeNode({
				id: 'a',
				type: 'n8n-nodes-base.function',
				parameters: { functionCode: 'return items;' },
			});
			expect(() => validator.validateOnUpdate([node], [node])).not.toThrow();
		});

		it('allows position-only changes to a deprecated node', () => {
			const before = makeNode({
				id: 'a',
				type: 'n8n-nodes-base.function',
				name: 'Func',
				position: [0, 0],
			});
			const after = { ...before, position: [200, 100] as [number, number] };
			expect(() => validator.validateOnUpdate([after], [before])).not.toThrow();
		});

		it('allows a structurally equal copy of a deprecated node', () => {
			const before = makeNode({
				id: 'a',
				type: 'n8n-nodes-base.function',
				parameters: { functionCode: 'return items;' },
				credentials: { someApi: { id: '1', name: 'Some API' } },
			});
			expect(() => validator.validateOnUpdate([structuredClone(before)], [before])).not.toThrow();
		});

		it('treats absent and default disabled and credentials as unchanged', () => {
			const before = makeNode({ id: 'a', type: 'n8n-nodes-base.function' });
			const after = { ...before, disabled: false, credentials: {} };
			expect(() => validator.validateOnUpdate([after], [before])).not.toThrow();
		});

		it('allows the editor-saved shape of a deprecated node stored with explicit defaults', () => {
			const before: INode = {
				...makeNode({ id: 'a', type: 'n8n-nodes-base.function', name: 'Func' }),
				parameters: { functionCode: '// default' },
				notes: '',
				onError: 'stopWorkflow',
				continueOnFail: false,
			};
			const after = makeNode({ id: 'a', type: 'n8n-nodes-base.function', name: 'Func' });
			expect(() => validator.validateOnUpdate([after], [before])).not.toThrow();
		});

		it('blocks adding notes to an existing deprecated node', () => {
			const before = makeNode({ id: 'a', type: 'n8n-nodes-base.function', name: 'Func' });
			const after = { ...before, notes: 'changed' };
			expect(() => validator.validateOnUpdate([after], [before])).toThrow(/Cannot modify.*Func/);
		});

		it('blocks disabling an existing deprecated node', () => {
			const before = makeNode({ id: 'a', type: 'n8n-nodes-base.function', name: 'Func' });
			const after = { ...before, disabled: true };
			expect(() => validator.validateOnUpdate([after], [before])).toThrow(/Cannot modify.*Func/);
		});

		it('blocks changing the credentials of an existing deprecated node', () => {
			const before = makeNode({ id: 'a', type: 'n8n-nodes-base.function', name: 'Func' });
			const after = { ...before, credentials: { someApi: { id: '2', name: 'Other API' } } };
			expect(() => validator.validateOnUpdate([after], [before])).toThrow(/Cannot modify.*Func/);
		});

		it('blocks changing the error handling of an existing deprecated node', () => {
			const before = makeNode({ id: 'a', type: 'n8n-nodes-base.function', name: 'Func' });
			const after: INode = { ...before, onError: 'continueRegularOutput' };
			expect(() => validator.validateOnUpdate([after], [before])).toThrow(/Cannot modify.*Func/);
		});

		it('treats a deprecated node sent with a new id as added', () => {
			const before = makeNode({ id: 'a', type: 'n8n-nodes-base.function', name: 'Func' });
			const after = { ...before, id: 'b' };
			expectViolations(
				() => validator.validateOnUpdate([after], [before]),
				[{ kind: 'added', nodeName: 'Func', nodeType: 'n8n-nodes-base.function' }],
			);
		});

		it('treats a deprecated node sent without an id as added', () => {
			const before = makeNode({ id: 'a', type: 'n8n-nodes-base.function', name: 'Func' });
			const after = { ...before, id: undefined as unknown as string };
			expectViolations(
				() => validator.validateOnUpdate([after], [before]),
				[{ kind: 'added', nodeName: 'Func', nodeType: 'n8n-nodes-base.function' }],
			);
		});

		it('treats a deprecated node reusing the id of a non-deprecated node as added', () => {
			const before = makeNode({ id: 'a', type: 'n8n-nodes-base.set', name: 'Set' });
			const after = makeNode({ id: 'a', type: 'n8n-nodes-base.function', name: 'Set' });
			expectViolations(
				() => validator.validateOnUpdate([after], [before]),
				[{ kind: 'added', nodeName: 'Set', nodeType: 'n8n-nodes-base.function' }],
			);
		});

		it('logs a warning with the workflow id when it rejects a save', () => {
			const before = makeNode({ id: 'a', type: 'n8n-nodes-base.function', name: 'Func' });
			const after = { ...before, parameters: { functionCode: 'return [];' } };
			expect(() => validator.validateOnUpdate([after], [before], 'wf-1')).toThrow(
				DeprecatedNodesError,
			);
			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
				workflowId: 'wf-1',
				violations: [{ kind: 'edited', nodeType: 'n8n-nodes-base.function' }],
			});
		});

		it('blocks adding a deprecated node that did not exist before', () => {
			const before = [makeNode({ id: 'a', type: 'n8n-nodes-base.set' })];
			const after = [
				...before,
				makeNode({ id: 'b', type: 'n8n-nodes-base.function', name: 'New Func' }),
			];
			expect(() => validator.validateOnUpdate(after, before)).toThrow(/Cannot use.*New Func/);
		});

		it('blocks editing the parameters of an existing deprecated node', () => {
			const before = makeNode({
				id: 'a',
				type: 'n8n-nodes-base.function',
				name: 'Func',
				parameters: { functionCode: 'return items;' },
			});
			const after = { ...before, parameters: { functionCode: 'return [];' } };
			expect(() => validator.validateOnUpdate([after], [before])).toThrow(/Cannot modify.*Func/);
		});

		it('blocks editing the name of an existing deprecated node', () => {
			const before = makeNode({
				id: 'a',
				type: 'n8n-nodes-base.function',
				name: 'Func',
			});
			const after = { ...before, name: 'Renamed' };
			expect(() => validator.validateOnUpdate([after], [before])).toThrow(/Cannot modify/);
		});

		it('blocks bumping the typeVersion of a non-deprecated node down to a deprecated version', () => {
			nodeTypes.getByNameAndVersion.mockImplementation((type, version) => {
				if (type === 'n8n-nodes-base.myNode' && version === 1) {
					return nodeTypeFor(type, true);
				}
				return nodeTypeFor(type, false);
			});

			const before = makeNode({ id: 'a', type: 'n8n-nodes-base.myNode', typeVersion: 2 });
			const after = { ...before, typeVersion: 1 };
			expect(() => validator.validateOnUpdate([after], [before])).toThrow(/Cannot use/);
		});

		it('allows migrating a deprecated typeVersion forward, including parameter changes', () => {
			nodeTypes.getByNameAndVersion.mockImplementation((type, version) => {
				if (type === 'n8n-nodes-base.myNode' && version === 1) {
					return nodeTypeFor(type, true);
				}
				return nodeTypeFor(type, false);
			});

			const before = makeNode({
				id: 'a',
				type: 'n8n-nodes-base.myNode',
				typeVersion: 1,
				parameters: { mode: 'legacy' },
			});
			const after = {
				...before,
				typeVersion: 2,
				parameters: { mode: 'safe', extra: 'new-field' },
			};
			expect(() => validator.validateOnUpdate([after], [before])).not.toThrow();
		});

		it('allows replacing a deprecated node with a different node type at the same id', () => {
			const before = makeNode({ id: 'a', type: 'n8n-nodes-base.function', name: 'Func' });
			const after = makeNode({ id: 'a', type: 'n8n-nodes-base.code', name: 'Func' });
			expect(() => validator.validateOnUpdate([after], [before])).not.toThrow();
		});

		it('allows deleting a deprecated node', () => {
			const before = [
				makeNode({ id: 'a', type: 'n8n-nodes-base.set' }),
				makeNode({ id: 'b', type: 'n8n-nodes-base.function' }),
			];
			const after = [before[0]];
			expect(() => validator.validateOnUpdate(after, before)).not.toThrow();
		});

		it('allows edits to non-deprecated nodes alongside a frozen deprecated one', () => {
			const deprecated = makeNode({ id: 'a', type: 'n8n-nodes-base.function' });
			const otherBefore = makeNode({ id: 'b', type: 'n8n-nodes-base.set', parameters: { x: 1 } });
			const otherAfter = { ...otherBefore, parameters: { x: 2 } };
			expect(() =>
				validator.validateOnUpdate([deprecated, otherAfter], [deprecated, otherBefore]),
			).not.toThrow();
		});

		it('is a no-op when the config flag is off', () => {
			nodesConfig.blockDeprecated = false;
			const before = [makeNode({ id: 'a', type: 'n8n-nodes-base.set' })];
			const after = [...before, makeNode({ id: 'b', type: 'n8n-nodes-base.function' })];
			expect(() => validator.validateOnUpdate(after, before)).not.toThrow();
		});
	});
});
