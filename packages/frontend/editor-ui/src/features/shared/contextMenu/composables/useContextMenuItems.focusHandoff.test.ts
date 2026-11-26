import { isFocusHandoffAction, shouldSuppressContextMenuFocusRestore } from './useContextMenuItems';

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
		// Extraction does not always open a dialog, so it is not an unconditional handoff.
		expect(isFocusHandoffAction('extract_sub_workflow')).toBe(false);
	});
});

describe('shouldSuppressContextMenuFocusRestore', () => {
	it('suppresses extraction only after the name dialog opens', () => {
		expect(shouldSuppressContextMenuFocusRestore('extract_sub_workflow', true)).toBe(true);
		expect(shouldSuppressContextMenuFocusRestore('extract_sub_workflow', false)).toBe(false);
	});

	it('keeps unconditional handoffs suppressed', () => {
		expect(shouldSuppressContextMenuFocusRestore('change_color', false)).toBe(true);
		expect(shouldSuppressContextMenuFocusRestore('delete', false)).toBe(false);
	});
});
