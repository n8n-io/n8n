/* eslint-disable @typescript-eslint/naming-convention */
import type { Protocol } from 'devtools-protocol';

import { buildSnapshot } from './build';
import { renderSnapshot } from './print';
import { attrsMock, axNode, boolProp, flattenNodes, intProp, noAttrs } from './testHelpers';

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

	it('renders [checked=false] for unchecked checkbox (distinct from no checked attr)', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'checkbox', {
				name: 'Agree',
				backendDOMNodeId: 10,
				properties: [boolProp('checked', false)],
			}),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- checkbox "Agree" [checked=false] [ref=chk1]');
	});

	it('renders [expanded=false] for collapsed element (distinct from no expanded attr)', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'combobox', {
				name: 'Country',
				backendDOMNodeId: 10,
				properties: [boolProp('expanded', false)],
			}),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- combobox "Country" [expanded=false] [ref=cmb1]');
	});

	it('renders [pressed=false] for unpressed toggle button (distinct from no pressed attr)', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', {
				name: 'Bold',
				backendDOMNodeId: 10,
				properties: [boolProp('pressed', false)],
			}),
		];
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);
		expect(text).toBe('- button "Bold" [pressed=false] [ref=btn1]');
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
