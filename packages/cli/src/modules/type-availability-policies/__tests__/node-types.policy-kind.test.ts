import { mock } from 'vitest-mock-extended';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { NodeTypes } from '@/node-types';

import {
	NodeTypesPolicyKind,
	nodeTypeCoveringSelectors,
	nodeTypeSelectorMatcher,
} from '../node-types.policy-kind';
import type { PolicyRule } from '../policy-rule.types';

const GMAIL = 'n8n-nodes-base.gmail';
const GMAIL_TOOL = 'n8n-nodes-base.gmailTool';

describe('nodeTypeSelectorMatcher', () => {
	const matches = nodeTypeSelectorMatcher({ name: GMAIL_TOOL, baseName: GMAIL });

	it('matches a name rule for its own type name', () => {
		expect(matches({ kind: 'name', value: GMAIL_TOOL })).toBe(true);
	});

	it('matches a name rule for the base node it is a tool variant of', () => {
		expect(matches({ kind: 'name', value: GMAIL })).toBe(true);
	});

	it('does not match a name rule for an unrelated type', () => {
		expect(matches({ kind: 'name', value: 'n8n-nodes-base.slack' })).toBe(false);
	});

	it('matches a package rule for the segment before the first dot', () => {
		expect(matches({ kind: 'package', value: 'n8n-nodes-base' })).toBe(true);
	});

	it('does not match a package rule for another package', () => {
		expect(matches({ kind: 'package', value: 'n8n-nodes-other' })).toBe(false);
	});

	it('never matches an extends rule, which is credential-only', () => {
		expect(matches({ kind: 'extends', value: GMAIL })).toBe(false);
	});
});

describe('nodeTypeCoveringSelectors', () => {
	const baseNameOf = (typeName: string) => (typeName === GMAIL_TOOL ? GMAIL : typeName);

	it('covers a tool variant by itself, its base node, and its package', () => {
		expect(nodeTypeCoveringSelectors({ kind: 'name', value: GMAIL_TOOL }, baseNameOf)).toEqual([
			{ kind: 'name', value: GMAIL_TOOL },
			{ kind: 'name', value: GMAIL },
			{ kind: 'package', value: 'n8n-nodes-base' },
		]);
	});

	it('only covers itself for a package selector', () => {
		expect(
			nodeTypeCoveringSelectors({ kind: 'package', value: 'n8n-nodes-base' }, baseNameOf),
		).toEqual([{ kind: 'package', value: 'n8n-nodes-base' }]);
	});

	it('lists no base node entry for a type that is not a tool variant', () => {
		expect(
			nodeTypeCoveringSelectors({ kind: 'name', value: 'n8n-nodes-base.slack' }, baseNameOf),
		).toEqual([
			{ kind: 'name', value: 'n8n-nodes-base.slack' },
			{ kind: 'package', value: 'n8n-nodes-base' },
		]);
	});
});

describe('NodeTypesPolicyKind', () => {
	const registryWith = (loaders: LoadNodesAndCredentials['loaders'] = {}) =>
		({ loaders }) as unknown as LoadNodesAndCredentials;
	const rule = (overrides: Partial<PolicyRule> & Pick<PolicyRule, 'selector'>): PolicyRule => ({
		id: 'r1',
		action: 'allow',
		...overrides,
	});

	describe('knownTypeNames', () => {
		it('lists the keys NodeTypes reports as known', () => {
			const nodeTypes = mock<NodeTypes>();
			nodeTypes.getKnownTypes.mockReturnValue({
				[GMAIL]: { className: 'Gmail', sourcePath: '' },
				'n8n-nodes-base.slack': { className: 'Slack', sourcePath: '' },
			});
			const kind = new NodeTypesPolicyKind(nodeTypes, registryWith());

			expect(kind.knownTypeNames()).toEqual([GMAIL, 'n8n-nodes-base.slack']);
		});
	});

	describe('matcherFor', () => {
		it('matches the base name NodeTypes resolves for the given type', () => {
			const nodeTypes = mock<NodeTypes>();
			nodeTypes.resolveBaseName.mockReturnValue({ baseName: GMAIL, isSyntheticTool: true });
			const kind = new NodeTypesPolicyKind(nodeTypes, registryWith());

			const matches = kind.matcherFor(GMAIL_TOOL);

			expect(matches({ kind: 'name', value: GMAIL })).toBe(true);
			expect(matches({ kind: 'name', value: 'n8n-nodes-base.slack' })).toBe(false);
		});
	});

	describe('coveringSelectors', () => {
		it('builds the covering selectors from the base name NodeTypes resolves', () => {
			const nodeTypes = mock<NodeTypes>();
			nodeTypes.resolveBaseName.mockReturnValue({ baseName: GMAIL, isSyntheticTool: true });
			const kind = new NodeTypesPolicyKind(nodeTypes, registryWith());

			expect(kind.coveringSelectors({ kind: 'name', value: GMAIL_TOOL })).toEqual([
				{ kind: 'name', value: GMAIL_TOOL },
				{ kind: 'name', value: GMAIL },
				{ kind: 'package', value: 'n8n-nodes-base' },
			]);
		});
	});

	describe('assertWritable', () => {
		it('does not throw for a name or package rule naming an installed package', () => {
			const kind = new NodeTypesPolicyKind(
				mock<NodeTypes>(),
				registryWith({ 'n8n-nodes-base': {} as LoadNodesAndCredentials['loaders'][string] }),
			);

			expect(() =>
				kind.assertWritable([
					rule({ selector: { kind: 'name', value: GMAIL } }),
					rule({ selector: { kind: 'package', value: 'n8n-nodes-base' } }),
				]),
			).not.toThrow();
		});

		it('rejects an extends rule, which only a credential type policy accepts', () => {
			const kind = new NodeTypesPolicyKind(mock<NodeTypes>(), registryWith());

			expect(() =>
				kind.assertWritable([rule({ selector: { kind: 'extends', value: GMAIL } })]),
			).toThrow('An "extends" rule is only valid in a credential type policy');
		});

		it('rejects a package rule naming a package that is not installed', () => {
			const kind = new NodeTypesPolicyKind(mock<NodeTypes>(), registryWith());

			expect(() =>
				kind.assertWritable([
					rule({ selector: { kind: 'package', value: 'n8n-nodes-not-installed' } }),
				]),
			).toThrow(/^Package rule names a package that is not installed:/);
		});
	});
});
