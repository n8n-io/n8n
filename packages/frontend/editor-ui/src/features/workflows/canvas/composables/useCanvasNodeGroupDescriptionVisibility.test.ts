import { describe, expect, it } from 'vitest';

import { useCanvasNodeGroupDescriptionVisibility } from './useCanvasNodeGroupDescriptionVisibility';

describe('useCanvasNodeGroupDescriptionVisibility', () => {
	it('reports groups as not visible by default', () => {
		const visibility = useCanvasNodeGroupDescriptionVisibility();
		expect(visibility.isVisible('g1')).toBe(false);
	});

	it('sets and toggles visibility', () => {
		const visibility = useCanvasNodeGroupDescriptionVisibility();

		visibility.setVisible('g1', true);
		expect(visibility.isVisible('g1')).toBe(true);

		visibility.toggleVisible('g1');
		expect(visibility.isVisible('g1')).toBe(false);
	});

	it('removes a deleted group from the visible set', () => {
		const visibility = useCanvasNodeGroupDescriptionVisibility();
		visibility.setVisible('g1', true);

		visibility.removeDeleted('g1');
		expect(visibility.isVisible('g1')).toBe(false);
	});

	it('prunes ids whose group no longer exists on restore', () => {
		const visibility = useCanvasNodeGroupDescriptionVisibility();
		visibility.setVisible('g1', true);
		visibility.setVisible('g2', true);

		visibility.restore(new Set(['g1']));

		expect(visibility.isVisible('g1')).toBe(true);
		expect(visibility.isVisible('g2')).toBe(false);
	});
});
