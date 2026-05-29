import type { NodesConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { INode, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { DeprecatedNodesError } from '@/errors/response-errors/deprecated-nodes.error';
import type { NodeTypes } from '@/node-types';
import { DeprecatedNodesValidationService } from '@/workflows/deprecated-nodes-validation.service';

describe('DeprecatedNodesValidationService', () => {
	let validator: DeprecatedNodesValidationService;
	let nodesConfig: NodesConfig;
	let nodeTypes: ReturnType<typeof mock<NodeTypes>>;

	const nodeTypeFor = (type: string, deprecated?: boolean): INodeType =>
		mock<INodeType>({
			description: mock<INodeTypeDescription>({
				name: type,
				deprecated: deprecated ? true : undefined,
			}),
		});

	beforeEach(() => {
		nodesConfig = { blockDeprecated: true } as NodesConfig;
		nodeTypes = mock<NodeTypes>();

		// By default: function + functionItem are deprecated, everything else isn't.
		nodeTypes.getByNameAndVersion.mockImplementation((type) => {
			if (type === 'n8n-nodes-base.function' || type === 'n8n-nodes-base.functionItem') {
				return nodeTypeFor(type, true);
			}
			return nodeTypeFor(type, false);
		});

		validator = new DeprecatedNodesValidationService(nodesConfig, nodeTypes);
	});

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

		it('names the configured replacement node in the error message', () => {
			nodeTypes.getByNameAndVersion.mockImplementation((type) => {
				if (type === 'n8n-nodes-base.function') {
					return mock<INodeType>({
						description: mock<INodeTypeDescription>({
							name: type,
							deprecated: true,
							replacedByNodeType: 'n8n-nodes-base.code',
						}),
					});
				}
				if (type === 'n8n-nodes-base.code') {
					return mock<INodeType>({
						description: mock<INodeTypeDescription>({ name: type, displayName: 'Code' }),
					});
				}
				return nodeTypeFor(type, false);
			});

			const nodes = [makeNode({ id: 'a', type: 'n8n-nodes-base.function' })];
			expect(() => validator.validateOnCreate(nodes)).toThrow(/Replace it with the Code node/);
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

		it('blocks position-only changes to a deprecated node', () => {
			const before = makeNode({
				id: 'a',
				type: 'n8n-nodes-base.function',
				name: 'Func',
				position: [0, 0],
			});
			const after = { ...before, position: [200, 100] as [number, number] };
			expect(() => validator.validateOnUpdate([after], [before])).toThrow(/Cannot modify.*Func/);
		});

		it('blocks adding a deprecated node that did not exist before', () => {
			const before = [makeNode({ id: 'a', type: 'n8n-nodes-base.set' })];
			const after = [
				...before,
				makeNode({ id: 'b', type: 'n8n-nodes-base.function', name: 'New Func' }),
			];
			expect(() => validator.validateOnUpdate(after, before)).toThrow(/Cannot add.*New Func/);
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
			// Pretend v2 of "myNode" is fine, v1 is deprecated.
			nodeTypes.getByNameAndVersion.mockImplementation((type, version) => {
				if (type === 'n8n-nodes-base.myNode' && version === 1) {
					return nodeTypeFor(type, true);
				}
				return nodeTypeFor(type, false);
			});

			const before = makeNode({ id: 'a', type: 'n8n-nodes-base.myNode', typeVersion: 2 });
			const after = { ...before, typeVersion: 1 };
			expect(() => validator.validateOnUpdate([after], [before])).toThrow(/Cannot add/);
		});

		it('allows migrating a deprecated typeVersion forward, including parameter changes', () => {
			// v1 is deprecated, v2 is the safe replacement.
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
