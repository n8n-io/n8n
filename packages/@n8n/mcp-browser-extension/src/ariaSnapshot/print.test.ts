import { renderSnapshot } from './print';
import type { TreeNode } from './types';

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
