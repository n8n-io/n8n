/* eslint-disable @typescript-eslint/naming-convention */
import type { Protocol } from 'devtools-protocol';

import { buildSnapshot, computeSnapshotDiff, renderSnapshot, type TreeNode } from './ariaSnapshot';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const roleVal = (value: string): Protocol.Accessibility.AXValue => ({ type: 'role', value });
const nameVal = (value: string): Protocol.Accessibility.AXValue => ({ type: 'string', value });

/** No-op fetchAttributes — returns empty attrs (no test-ID, no id) */
const noAttrs = async (_id: number): Promise<string[]> => await Promise.resolve([]);

/** Build a fetchAttributes mock that returns given attrs for given backendNodeIds */
function attrsMock(map: Record<number, string[]>): (id: number) => Promise<string[]> {
	return async (id: number) => await Promise.resolve(map[id] ?? []);
}

const boolProp = (
	name: string,
	value: boolean | string = true,
): Protocol.Accessibility.AXProperty => ({
	name: name as Protocol.Accessibility.AXPropertyName,
	value: { type: typeof value === 'string' ? 'string' : 'tristate', value },
});

const intProp = (name: string, value: number): Protocol.Accessibility.AXProperty => ({
	name: name as Protocol.Accessibility.AXPropertyName,
	value: { type: 'integer', value },
});

function axNode(
	nodeId: string,
	role: string,
	opts: {
		name?: string;
		childIds?: string[];
		backendDOMNodeId?: number;
		ignored?: boolean;
		parentId?: string;
		properties?: Protocol.Accessibility.AXProperty[];
	} = {},
): Protocol.Accessibility.AXNode {
	return {
		nodeId,
		role: roleVal(role),
		name: opts.name !== undefined ? nameVal(opts.name) : undefined,
		childIds: opts.childIds ?? [],
		backendDOMNodeId: opts.backendDOMNodeId,
		ignored: opts.ignored ?? false,
		parentId: opts.parentId,
		properties: opts.properties,
	};
}

// ---------------------------------------------------------------------------
// Snapshot building tests
// ---------------------------------------------------------------------------

describe('buildSnapshot', () => {
	it('returns empty nodes for empty axNodes', async () => {
		const result = await buildSnapshot({ axNodes: [], fetchAttributes: noAttrs });
		expect(result.nodes).toEqual([]);
		expect(result.refs.size).toBe(0);
	});

	it('includes interactive button and context navigation', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2', '3'] }),
			axNode('2', 'navigation', { childIds: ['4'], backendDOMNodeId: 10 }),
			axNode('3', 'main', { childIds: ['5'], backendDOMNodeId: 11 }),
			axNode('4', 'link', { name: 'Home', childIds: [], backendDOMNodeId: 12 }),
			axNode('5', 'button', { name: 'Submit', childIds: [], backendDOMNodeId: 13 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('excludes headings in interactive-only mode (default)', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2', '3'] }),
			axNode('2', 'heading', { name: 'Page Title', childIds: [] }),
			axNode('3', 'button', { name: 'Click me', childIds: [], backendDOMNodeId: 10 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('includes headings in full mode', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2', '3'] }),
			axNode('2', 'heading', { name: 'Page Title', childIds: [] }),
			axNode('3', 'button', { name: 'Click me', childIds: [], backendDOMNodeId: 10 }),
		];

		const result = await buildSnapshot({
			axNodes,
			fetchAttributes: noAttrs,
			type: 'full',
		});
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('hoists button out of generic wrapper', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'generic', { childIds: ['3'], backendDOMNodeId: 10 }),
			axNode('3', 'button', { name: 'Save', childIds: [], backendDOMNodeId: 11 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('includes label text in label context', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'labeltext', { childIds: ['3', '4'] }),
			axNode('3', 'statictext', { name: 'Email', childIds: [] }),
			axNode('4', 'textbox', { name: 'Email', childIds: [], backendDOMNodeId: 10 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('preserves indent offset for children of ignored nodes', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'generic', { childIds: ['3'], ignored: true, backendDOMNodeId: 10 }),
			axNode('3', 'button', { name: 'Go', childIds: [], backendDOMNodeId: 11 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		// Children of ignored node get +1 indent
		const allNodes = flattenNodes(result.nodes);
		const button = allNodes.find((n) => n.role === 'button');
		expect(button).toBeDefined();
		expect(button!.indentOffset ?? 0).toBeGreaterThanOrEqual(1);
	});

	it('uses data-testid attr as ref (highest priority)', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', { name: 'Save', childIds: [], backendDOMNodeId: 10 }),
		];

		const fetch = attrsMock({ 10: ['data-testid', 'save-btn', 'id', 'btn1'] });
		const result = await buildSnapshot({ axNodes, fetchAttributes: fetch });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('falls back to id attr as ref when no test-ID attr present', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', { name: 'Save', childIds: [], backendDOMNodeId: 10 }),
		];

		const fetch = attrsMock({ 10: ['id', 'my-save-btn'] });
		const result = await buildSnapshot({ axNodes, fetchAttributes: fetch });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('falls back to role+name ref when no stable attr', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', { name: 'Save', childIds: [], backendDOMNodeId: 10 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('deduplicates identical selectors in refs map with >> nth=', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2', '3'] }),
			axNode('2', 'button', { name: 'OK', childIds: [], backendDOMNodeId: 10 }),
			axNode('3', 'button', { name: 'OK', childIds: [], backendDOMNodeId: 11 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);

		// Rendered output has two distinct refs
		expect(text).toMatchSnapshot();

		// Refs map has nth= selectors to distinguish the duplicates
		expect(result.refs.get('btn1')).toBe('role=button[name="OK"] >> nth=0');
		expect(result.refs.get('btn2')).toBe('role=button[name="OK"] >> nth=1');
	});

	it('promotes contenteditable generic div to textbox', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'generic', { name: '', childIds: [], backendDOMNodeId: 10 }),
		];

		const fetch = attrsMock({ 10: ['contenteditable', 'true', 'class', 'editor'] });
		const result = await buildSnapshot({ axNodes, fetchAttributes: fetch });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('scopes snapshot to scopeNodeId subtree', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2', '3'] }),
			axNode('2', 'navigation', { childIds: ['4'], backendDOMNodeId: 10 }),
			axNode('3', 'main', { childIds: ['5'], backendDOMNodeId: 11 }),
			axNode('4', 'link', { name: 'Nav Link', childIds: [], backendDOMNodeId: 12 }),
			axNode('5', 'button', { name: 'Main Button', childIds: [], backendDOMNodeId: 13 }),
		];

		// Scope to 'main' node (id='3')
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs, scopeNodeId: '3' });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('assigns stable refs from data-testid', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', { name: 'Submit', childIds: [], backendDOMNodeId: 10 }),
		];

		const fetch = attrsMock({ 10: ['data-testid', 'submit-btn'] });
		const result = await buildSnapshot({ axNodes, fetchAttributes: fetch });

		expect(result.refs.has('btn1')).toBe(true);
		expect(result.refs.get('btn1')).toBe('[data-testid="submit-btn"]');
	});

	it('assigns role+name refs when no stable attrs', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2', '3'] }),
			axNode('2', 'button', { name: 'A', childIds: [], backendDOMNodeId: 10 }),
			axNode('3', 'button', { name: 'B', childIds: [], backendDOMNodeId: 11 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });

		expect(result.refs.has('btn1')).toBe(true);
		expect(result.refs.has('btn2')).toBe(true);
	});

	it('assigns role+name ref for button with no stable attr', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', { name: 'Submit', childIds: [], backendDOMNodeId: 10 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });

		expect(result.refs.has('btn1')).toBe(true);
		expect(result.refs.get('btn1')).toBe('role=button[name="Submit"]');
	});

	it('appends -2 suffix on ref collision', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2', '3'] }),
			axNode('2', 'button', { name: 'OK', childIds: [], backendDOMNodeId: 10 }),
			axNode('3', 'button', { name: 'OK', childIds: [], backendDOMNodeId: 11 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });

		expect(result.refs.has('btn1')).toBe(true);
		expect(result.refs.has('btn2')).toBe(true);
	});

	it('uses compact numeric refs for long names', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', {
				name: 'This is a very long button label',
				childIds: [],
				backendDOMNodeId: 10,
			}),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });

		expect(result.refs.has('btn1')).toBe(true);
	});

	it('produces expected inline snapshot', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'navigation', { childIds: ['3'], backendDOMNodeId: 10 }),
			axNode('3', 'link', { name: 'Home', childIds: [], backendDOMNodeId: 11 }),
		];

		const fetch = attrsMock({ 11: ['data-testid', 'home-link'] });
		const result = await buildSnapshot({ axNodes, fetchAttributes: fetch });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('truncates structural nodes beyond maxDepth', async () => {
		// currentDepth: main=0, section=1, list=2, listitem=2(check triggers at list level)
		// list hits maxDepth=2, so list+listitem are dropped; button is interactive so it surfaces
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'main', { childIds: ['3'], backendDOMNodeId: 10 }),
			axNode('3', 'section', { childIds: ['4'], backendDOMNodeId: 11 }),
			axNode('4', 'list', { childIds: ['5'], backendDOMNodeId: 12 }),
			axNode('5', 'listitem', { childIds: ['6'], backendDOMNodeId: 13 }),
			axNode('6', 'button', { name: 'Deep Button', childIds: [], backendDOMNodeId: 14 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs, maxDepth: 2 });
		const text = renderSnapshot(result.nodes);

		// list and listitem are at/beyond maxDepth so they are dropped
		expect(text).not.toContain('list');
		// but the interactive button inside them still appears
		expect(text).toContain('Deep Button');
	});

	it('always includes interactive elements regardless of depth', async () => {
		// A deeply nested button should always appear even at maxDepth=1
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'main', { childIds: ['3'], backendDOMNodeId: 10 }),
			axNode('3', 'section', { childIds: ['4'], backendDOMNodeId: 11 }),
			axNode('4', 'navigation', { childIds: ['5'], backendDOMNodeId: 12 }),
			axNode('5', 'button', { name: 'Nested Button', childIds: [], backendDOMNodeId: 13 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs, maxDepth: 1 });
		const text = renderSnapshot(result.nodes);

		expect(text).toContain('Nested Button');
	});

	// -----------------------------------------------------------------------
	// ARIA state attribute tests
	// -----------------------------------------------------------------------

	it('includes [checked] on checkbox', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'checkbox', {
				name: 'Accept terms',
				backendDOMNodeId: 10,
				properties: [boolProp('checked', true)],
			}),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- checkbox "Accept terms" [checked] [ref=chk1]');
	});

	it('includes [checked=mixed] on checkbox', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'checkbox', {
				name: 'Select all',
				backendDOMNodeId: 10,
				properties: [boolProp('checked', 'mixed')],
			}),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- checkbox "Select all" [checked=mixed] [ref=chk1]');
	});

	it('includes [disabled] on button', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', {
				name: 'Submit',
				backendDOMNodeId: 10,
				properties: [boolProp('disabled')],
			}),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- button "Submit" [disabled] [ref=btn1]');
	});

	it('includes [expanded] on combobox', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'combobox', {
				name: 'Country',
				backendDOMNodeId: 10,
				properties: [boolProp('expanded', true)],
			}),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- combobox "Country" [expanded] [ref=cmb1]');
	});

	it('includes [level=N] on heading in full mode', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'heading', {
				name: 'Welcome',
				properties: [intProp('level', 2)],
			}),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs, type: 'full' });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- heading "Welcome" [level=2]');
	});

	it('includes [pressed] on toggle button', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', {
				name: 'Bold',
				backendDOMNodeId: 10,
				properties: [boolProp('pressed', true)],
			}),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- button "Bold" [pressed] [ref=btn1]');
	});

	it('includes [pressed=mixed] on toggle button', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', {
				name: 'Format',
				backendDOMNodeId: 10,
				properties: [boolProp('pressed', 'mixed')],
			}),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- button "Format" [pressed=mixed] [ref=btn1]');
	});

	it('includes [selected] on tab', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'tab', {
				name: 'Settings',
				backendDOMNodeId: 10,
				properties: [boolProp('selected', true)],
			}),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- tab "Settings" [selected] [ref=tab1]');
	});

	it('renders multiple attributes in correct order', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'checkbox', {
				name: 'Remember me',
				backendDOMNodeId: 10,
				properties: [boolProp('checked', true), boolProp('disabled')],
			}),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- checkbox "Remember me" [checked] [disabled] [ref=chk1]');
	});

	it('omits disabled=false and selected=false', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', {
				name: 'Go',
				backendDOMNodeId: 10,
				properties: [boolProp('disabled', false), boolProp('selected', false)],
			}),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- button "Go" [ref=btn1]');
	});

	// -----------------------------------------------------------------------
	// Complex DOM tree tests
	// -----------------------------------------------------------------------

	it('renders form with mixed interactive elements and attributes', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'form', {
				name: 'Sign up',
				childIds: ['3', '4', '5', '6'],
				backendDOMNodeId: 10,
			}),
			axNode('3', 'textbox', { name: 'Email', backendDOMNodeId: 11 }),
			axNode('4', 'checkbox', {
				name: 'Terms',
				backendDOMNodeId: 12,
				properties: [boolProp('checked', true)],
			}),
			axNode('5', 'radio', {
				name: 'Plan: Free',
				backendDOMNodeId: 13,
				properties: [boolProp('checked', true)],
			}),
			axNode('6', 'button', {
				name: 'Register',
				backendDOMNodeId: 14,
				properties: [boolProp('disabled')],
			}),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		expect(text).toMatchSnapshot();
	});

	it('renders navigation with expanded/collapsed menus and selected tab', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'navigation', { name: 'Main', childIds: ['3', '4', '5'], backendDOMNodeId: 10 }),
			axNode('3', 'tab', {
				name: 'Dashboard',
				backendDOMNodeId: 11,
				properties: [boolProp('selected', true)],
			}),
			axNode('4', 'tab', { name: 'Settings', backendDOMNodeId: 12 }),
			axNode('5', 'menuitem', {
				name: 'File',
				backendDOMNodeId: 13,
				childIds: ['6'],
				properties: [boolProp('expanded', true)],
			}),
			axNode('6', 'menuitem', { name: 'New', backendDOMNodeId: 14 }),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		expect(text).toMatchSnapshot();
	});

	it('renders full page with headings, levels, and nested content', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2', '3'] }),
			axNode('2', 'banner', { childIds: ['4'], backendDOMNodeId: 10 }),
			axNode('3', 'main', { childIds: ['5', '6', '7'], backendDOMNodeId: 11 }),
			axNode('4', 'link', { name: 'Logo', backendDOMNodeId: 12 }),
			axNode('5', 'heading', { name: 'Dashboard', properties: [intProp('level', 1)] }),
			axNode('6', 'region', { name: 'Stats', childIds: ['8', '9'], backendDOMNodeId: 13 }),
			axNode('7', 'heading', { name: 'Recent', properties: [intProp('level', 2)] }),
			axNode('8', 'heading', { name: 'Users', properties: [intProp('level', 3)] }),
			axNode('9', 'button', { name: 'Refresh', backendDOMNodeId: 14 }),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs, type: 'full' });
		const text = renderSnapshot(result.nodes);
		expect(text).toMatchSnapshot();
	});

	// -----------------------------------------------------------------------
	// Props and value tests
	// -----------------------------------------------------------------------

	it('includes href attribute on links', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'link', { name: 'About', backendDOMNodeId: 10 }),
		];
		const fetch = attrsMock({ 10: ['href', '/about'] });
		const result = await buildSnapshot({ axNodes, fetchAttributes: fetch });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- link "About" [href=/about] [ref=lnk1]');
	});

	it('includes placeholder attribute on textbox when different from name', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'textbox', { name: 'Search', backendDOMNodeId: 10 }),
		];
		const fetch = attrsMock({ 10: ['placeholder', 'Type to search...'] });
		const result = await buildSnapshot({ axNodes, fetchAttributes: fetch });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- textbox "Search" [placeholder=Type to search...] [ref=txt1]');
	});

	it('omits placeholder when it matches the name', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'textbox', { name: 'Search', backendDOMNodeId: 10 }),
		];
		const fetch = attrsMock({ 10: ['placeholder', 'Search'] });
		const result = await buildSnapshot({ axNodes, fetchAttributes: fetch });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- textbox "Search" [ref=txt1]');
	});

	it('includes input value for textbox', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'textbox', {
				name: 'Email',
				backendDOMNodeId: 10,
			}),
		];
		// Manually set the value on the AX node
		axNodes[1].value = { type: 'string', value: 'user@test.com' };

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- textbox "Email" [ref=txt1]: user@test.com');
	});

	it('omits value when it matches the name', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'textbox', { name: 'Search', backendDOMNodeId: 10 }),
		];
		axNodes[1].value = { type: 'string', value: 'Search' };

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		// Value matches name so it's omitted to avoid redundancy
		expect(text).not.toContain(': Search');
	});

	it('renders link with href attribute and nested content', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'navigation', { childIds: ['3', '4'], backendDOMNodeId: 10 }),
			axNode('3', 'link', { name: 'Home', backendDOMNodeId: 11 }),
			axNode('4', 'link', { name: 'Settings', backendDOMNodeId: 12 }),
		];
		const fetch = attrsMock({
			11: ['href', '/'],
			12: ['href', '/settings'],
		});
		const result = await buildSnapshot({ axNodes, fetchAttributes: fetch });
		const text = renderSnapshot(result.nodes);
		expect(text).toMatchSnapshot();
	});

	it('does not truncate when nesting is within maxDepth', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'main', { childIds: ['3'], backendDOMNodeId: 10 }),
			axNode('3', 'section', { childIds: ['4'], backendDOMNodeId: 11 }),
			axNode('4', 'button', { name: 'Shallow Button', childIds: [], backendDOMNodeId: 12 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs, maxDepth: 6 });
		const text = renderSnapshot(result.nodes);

		// All nodes within depth should appear
		expect(text).toContain('main');
		expect(text).toContain('section');
		expect(text).toContain('Shallow Button');
	});
});

// ---------------------------------------------------------------------------
// computeSnapshotDiff tests
// ---------------------------------------------------------------------------

describe('computeSnapshotDiff', () => {
	function makeTree(nodes: Array<{ role: string; name: string; ref?: string }>): TreeNode[] {
		return nodes.map(({ role, name, ref }) => ({ role, name, ref, children: [] }));
	}

	/** Build a large tree where diff will be shorter than full content */
	function makeLargeTree(count: number, prefix = 'Item'): TreeNode[] {
		return Array.from({ length: count }, (_, i) => ({
			role: 'button',
			name: `${prefix} ${i + 1}`,
			ref: `btn-${prefix.toLowerCase()}-${i + 1}`,
			children: [],
		}));
	}

	it('returns full on empty previous (first call)', () => {
		const next = makeTree([{ role: 'button', name: 'Save', ref: 'btn-save' }]);
		const result = computeSnapshotDiff([], next);
		expect(result.diffType).toBe('full');
		expect(result.content).toBe('- button "Save" [ref=btn-save]');
	});

	it('returns no-change for identical trees', () => {
		const nodes = makeTree([{ role: 'button', name: 'Save', ref: 'btn-save' }]);
		const result = computeSnapshotDiff(nodes, [...nodes.map((n) => ({ ...n }))]);
		expect(result.diffType).toBe('no-change');
		expect(result.content).toBe('');
	});

	it('returns full when all content changed', () => {
		const prev = makeTree([
			{ role: 'button', name: 'A', ref: 'btn-a' },
			{ role: 'button', name: 'B', ref: 'btn-b' },
			{ role: 'button', name: 'C', ref: 'btn-c' },
		]);
		const next = makeTree([
			{ role: 'button', name: 'X', ref: 'btn-x' },
			{ role: 'button', name: 'Y', ref: 'btn-y' },
			{ role: 'button', name: 'Z', ref: 'btn-z' },
		]);
		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('full');
	});

	it('returns unified diff with +/- lines for small change in large tree', () => {
		const prev = makeLargeTree(30);
		const next = makeLargeTree(30);
		next[15] = { role: 'button', name: 'MODIFIED', ref: 'btn-modified', children: [] };

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toContain('--- snapshot (previous)');
		expect(result.content).toContain('+++ snapshot (current)');
		expect(result.content).toContain('@@');
		expect(result.content).toContain('-- button "Item 16" [ref=btn-item-16]');
		expect(result.content).toContain('+- button "MODIFIED" [ref=btn-modified]');
	});

	it('includes context lines around changes', () => {
		const prev = makeLargeTree(30);
		const next = makeLargeTree(30);
		next[15] = { role: 'button', name: 'CHANGED', ref: 'btn-changed', children: [] };

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		// Context lines (3 lines before/after the change)
		expect(result.content).toContain(' - button "Item 14"');
		expect(result.content).toContain(' - button "Item 15"');
		expect(result.content).toContain(' - button "Item 17"');
		expect(result.content).toContain(' - button "Item 18"');
	});

	it('shows added node as + line', () => {
		const prev = makeLargeTree(20);
		const next = [
			...makeLargeTree(20),
			{ role: 'button', name: 'New', ref: 'btn-new', children: [] as TreeNode[] },
		];

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toContain('+- button "New" [ref=btn-new]');
	});

	it('shows removed node as - line', () => {
		const prev = [
			...makeLargeTree(20),
			{ role: 'button', name: 'Old', ref: 'btn-old', children: [] as TreeNode[] },
		];
		const next = makeLargeTree(20);

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toContain('-- button "Old" [ref=btn-old]');
	});

	it('shows nested change with tree context', () => {
		const prev: TreeNode[] = [
			{
				role: 'navigation',
				name: 'Main',
				children: [
					{ role: 'link', name: 'Home', ref: 'lnk-home', children: [] },
					{ role: 'link', name: 'About', ref: 'lnk-about', children: [] },
				],
			},
			...makeLargeTree(20),
		];
		const next: TreeNode[] = [
			{
				role: 'navigation',
				name: 'Main',
				children: [
					{ role: 'link', name: 'Home', ref: 'lnk-home', children: [] },
					{ role: 'link', name: 'About us', ref: 'lnk-about-us', children: [] },
				],
			},
			...makeLargeTree(20),
		];

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toContain('-  - link "About" [ref=lnk-about]');
		expect(result.content).toContain('+  - link "About us" [ref=lnk-about-us]');
		// Parent context preserved
		expect(result.content).toContain(' - navigation "Main"');
	});
});

// ---------------------------------------------------------------------------
// renderSnapshot tests
// ---------------------------------------------------------------------------

describe('renderSnapshot', () => {
	it('renders nested tree with correct indentation', () => {
		const nodes: TreeNode[] = [
			{
				role: 'navigation',
				name: '',
				children: [
					{
						role: 'link',
						name: 'Home',
						children: [],
					},
				],
			},
		];

		expect(renderSnapshot(nodes)).toMatchSnapshot();
	});

	it('renders attributes in correct order before ref', () => {
		const nodes: TreeNode[] = [
			{
				role: 'checkbox',
				name: 'Accept',
				checked: true,
				disabled: true,
				ref: 'chk-accept',
				children: [],
			},
		];
		expect(renderSnapshot(nodes)).toBe('- checkbox "Accept" [checked] [disabled] [ref=chk-accept]');
	});

	it('renders all attribute types', () => {
		const nodes: TreeNode[] = [
			{
				role: 'form',
				name: 'Settings',
				children: [
					{ role: 'checkbox', name: 'Enable', checked: 'mixed', ref: 'chk-enable', children: [] },
					{ role: 'button', name: 'Save', disabled: true, ref: 'btn-save', children: [] },
					{ role: 'combobox', name: 'Theme', expanded: true, ref: 'cmb-theme', children: [] },
					{ role: 'heading', name: 'Options', level: 3, children: [] },
					{ role: 'button', name: 'Bold', pressed: true, ref: 'btn-bold', children: [] },
					{ role: 'button', name: 'Italic', pressed: 'mixed', ref: 'btn-italic', children: [] },
					{ role: 'tab', name: 'General', selected: true, ref: 'tab-general', children: [] },
				],
			},
		];
		expect(renderSnapshot(nodes)).toMatchSnapshot();
	});

	it('renders value as inline text after colon', () => {
		const nodes: TreeNode[] = [
			{
				role: 'textbox',
				name: 'Email',
				ref: 'txt-email',
				value: 'user@test.com',
				children: [],
			},
		];
		expect(renderSnapshot(nodes)).toBe('- textbox "Email" [ref=txt-email]: user@test.com');
	});

	it('renders props as attributes', () => {
		const nodes: TreeNode[] = [
			{
				role: 'link',
				name: 'About',
				ref: 'lnk-about',
				props: { href: '/about' },
				children: [],
			},
		];
		expect(renderSnapshot(nodes)).toBe('- link "About" [href=/about] [ref=lnk-about]');
	});

	it('renders props and children together', () => {
		const nodes: TreeNode[] = [
			{
				role: 'combobox',
				name: 'Country',
				ref: 'cmb-country',
				expanded: true,
				props: { placeholder: 'Select...' },
				children: [
					{ role: 'option', name: 'USA', selected: true, ref: 'opt-usa', children: [] },
					{ role: 'option', name: 'UK', ref: 'opt-uk', children: [] },
				],
			},
		];
		expect(renderSnapshot(nodes)).toMatchSnapshot();
	});
});

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function flattenNodes(nodes: TreeNode[]): TreeNode[] {
	return nodes.flatMap((n) => [n, ...flattenNodes(n.children)]);
}
