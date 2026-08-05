import { isFocusHandoffAction } from './useContextMenuItems';

describe('isFocusHandoffAction', () => {
	it('returns true for actions that open another focus-taking layer', () => {
		// `change_color` opens the sticky color popover; the context menu must not
		// restore focus on close or it would dismiss the just-opened popover.
		expect(isFocusHandoffAction('change_color')).toBe(true);
		// `rename_group` and `group_nodes` focus the group title inline editor
		// (the latter on the freshly created group).
		expect(isFocusHandoffAction('rename_group')).toBe(true);
		expect(isFocusHandoffAction('group_nodes')).toBe(true);
	});

	it('returns false for regular actions that do not hand off focus', () => {
		expect(isFocusHandoffAction('delete')).toBe(false);
		expect(isFocusHandoffAction('duplicate')).toBe(false);
		expect(isFocusHandoffAction('rename')).toBe(false);
		expect(isFocusHandoffAction('open')).toBe(false);
		expect(isFocusHandoffAction('ungroup_nodes')).toBe(false);
	});
});
