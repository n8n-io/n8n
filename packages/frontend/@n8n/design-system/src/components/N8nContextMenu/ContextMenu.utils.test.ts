import type { ContextMenuNode, ContextMenuRadioGroup } from './ContextMenu.types';
import {
	applyCheckboxToggle,
	applyRadioSelection,
	findRadioGroup,
	radioGroupValue,
} from './ContextMenu.utils';

const snapGroup: ContextMenuRadioGroup<string> = {
	type: 'radio-group',
	id: 'snap',
	children: [
		{ type: 'radio', id: 'snap-off', label: 'Off' },
		{ type: 'radio', id: 'snap-grid', label: 'Grid' },
	],
};

const themeGroup: ContextMenuRadioGroup<string> = {
	type: 'radio-group',
	id: 'theme',
	children: [
		{ type: 'radio', id: 'theme-light', label: 'Light' },
		{ type: 'radio', id: 'theme-dark', label: 'Dark' },
	],
};

describe('ContextMenu utils', () => {
	describe('findRadioGroup', () => {
		it('should find a radio group among other node types', () => {
			const nodes: Array<ContextMenuNode<string>> = [
				{ type: 'item', id: 'open', label: 'Open' },
				{ type: 'checkbox', id: 'show-grid', label: 'Show grid' },
				snapGroup,
				themeGroup,
			];

			expect(findRadioGroup(nodes, 'theme')).toEqual(themeGroup);
		});

		it('should find a radio group nested in a group', () => {
			const nodes: Array<ContextMenuNode<string>> = [
				{
					type: 'group',
					id: 'view',
					children: [snapGroup],
				},
			];

			expect(findRadioGroup(nodes, 'snap')).toEqual(snapGroup);
		});

		it('should find a radio group nested in a submenu', () => {
			const nodes: Array<ContextMenuNode<string>> = [
				{
					type: 'submenu',
					id: 'more',
					label: 'More',
					children: [themeGroup],
				},
			];

			expect(findRadioGroup(nodes, 'theme')).toEqual(themeGroup);
		});

		it('should not treat a group with the same id as a radio group', () => {
			const nodes: Array<ContextMenuNode<string>> = [{ type: 'group', id: 'snap', children: [] }];

			expect(findRadioGroup(nodes, 'snap')).toBeUndefined();
		});

		it('should return undefined when the group is missing', () => {
			expect(findRadioGroup([snapGroup], 'missing')).toBeUndefined();
			expect(findRadioGroup([], 'snap')).toBeUndefined();
		});
	});

	describe('applyRadioSelection', () => {
		const radioIds = ['snap-off', 'snap-grid'];

		it('should select a radio when nothing in the group is selected', () => {
			expect(applyRadioSelection(['show-grid'], radioIds, 'snap-grid')).toEqual([
				'show-grid',
				'snap-grid',
			]);
		});

		it('should replace the selected radio in the same group', () => {
			expect(applyRadioSelection(['snap-off', 'show-grid'], radioIds, 'snap-grid')).toEqual([
				'show-grid',
				'snap-grid',
			]);
		});

		it('should keep the same radio when it is already selected', () => {
			expect(applyRadioSelection(['snap-grid'], radioIds, 'snap-grid')).toEqual(['snap-grid']);
		});

		it('should not remove ids from another radio group', () => {
			expect(applyRadioSelection(['theme-light', 'snap-off'], radioIds, 'snap-grid')).toEqual([
				'theme-light',
				'snap-grid',
			]);
		});
	});

	describe('applyCheckboxToggle', () => {
		it('should add an id that is not selected', () => {
			expect(applyCheckboxToggle(['show-grid'], 'show-minimap')).toEqual([
				'show-grid',
				'show-minimap',
			]);
		});

		it('should remove an id that is already selected', () => {
			expect(applyCheckboxToggle(['show-grid', 'show-minimap'], 'show-grid')).toEqual([
				'show-minimap',
			]);
		});

		it('should toggle from an empty selection', () => {
			expect(applyCheckboxToggle([], 'show-grid')).toEqual(['show-grid']);
		});
	});

	describe('radioGroupValue', () => {
		it('should return the selected radio id in the group', () => {
			expect(radioGroupValue(snapGroup, ['show-grid', 'snap-grid'])).toBe('snap-grid');
		});

		it('should return undefined when no radio in the group is selected', () => {
			expect(radioGroupValue(snapGroup, ['show-grid'])).toBeUndefined();
			expect(radioGroupValue(snapGroup, [])).toBeUndefined();
		});

		it('should return the first matching radio when more than one is selected', () => {
			expect(radioGroupValue(snapGroup, ['snap-grid', 'snap-off'])).toBe('snap-off');
		});
	});
});
