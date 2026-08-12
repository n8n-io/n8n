import { describe, expect, it } from 'vitest';

import { validateUiDefinition } from './validate';
import orders from '../../demo/orders.json';

function messages(definition: unknown): string[] {
	return validateUiDefinition(definition).map((issue) => `${issue.path}: ${issue.message}`);
}

const BUTTON = { id: 'btn', type: 'button', props: { label: 'Add' }, tree: {} };

describe('validateUiDefinition', () => {
	it('accepts the demo app', () => {
		const node = orders.nodes.find((entry) => entry.type.endsWith('uiBuilder'));

		expect(validateUiDefinition((node?.parameters as { definition: unknown }).definition)).toEqual(
			[],
		);
	});

	it('rejects an unknown component type', () => {
		expect(messages({ id: 'a', type: 'buton', props: {}, tree: {} })).toEqual([
			'a.type: Unknown component type "buton"',
		]);
	});

	it('rejects an unknown prop', () => {
		expect(messages({ id: 'a', type: 'text', props: { txt: 'hi' }, tree: {} })).toEqual([
			'a.props.txt: "text" has no prop "txt". Known: text',
		]);
	});

	it('rejects a value outside an options prop', () => {
		expect(messages({ ...BUTTON, props: { variant: 'ghost' } })).toEqual([
			'btn.props.variant: "ghost" is not one of: primary, secondary, tertiary',
		]);
	});

	it('accepts an expression where a literal would be checked', () => {
		expect(validateUiDefinition({ ...BUTTON, props: { variant: '={{ $item.kind }}' } })).toEqual(
			[],
		);
	});

	it('rejects a child in an undeclared region', () => {
		expect(messages({ id: 'a', type: 'card', props: {}, tree: { side: [BUTTON] } })).toEqual([
			'a.tree.side: "card" has no region "side". Known: header, default, footer',
		]);
	});

	it('rejects children on a leaf component', () => {
		expect(messages({ id: 'a', type: 'text', props: {}, tree: { default: [BUTTON] } })).toEqual([
			'a.tree.default: "text" takes no children',
		]);
	});

	it('rejects a duplicate id', () => {
		const definition = {
			id: 'a',
			type: 'stack',
			props: {},
			tree: { default: [{ ...BUTTON, id: 'a' }] },
		};

		expect(messages(definition)).toEqual(['a.tree.default[0].id: Duplicate id "a"']);
	});

	it('rejects an unknown action step kind', () => {
		expect(messages({ ...BUTTON, props: { onClick: [{ kind: 'fetch' }] } })).toEqual([
			'btn.props.onClick[0]: Unknown step kind "fetch". Expected one of: webhook, notify, navigate, set',
		]);
	});

	it('rejects a webhook step with no url', () => {
		expect(messages({ ...BUTTON, props: { onClick: [{ kind: 'webhook' }] } })).toEqual([
			'btn.props.onClick[0].url: A webhook step needs a string `url`',
		]);
	});

	it('accepts the legacy single-call action shape', () => {
		expect(
			validateUiDefinition({ ...BUTTON, props: { onClick: { url: 'https://x', method: 'POST' } } }),
		).toEqual([]);
	});

	it('reports every problem in one pass', () => {
		const definition = {
			id: 'a',
			type: 'card',
			props: { padded: 'yes' },
			tree: { header: [{ id: 'b', type: 'heading', props: { level: 9 }, tree: {} }] },
		};

		expect(messages(definition)).toEqual([
			'a.props.padded: Expected a boolean or an expression',
			'b.props.level: "9" is not one of: 1, 2, 3',
		]);
	});
});
