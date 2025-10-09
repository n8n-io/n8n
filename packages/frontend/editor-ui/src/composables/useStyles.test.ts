import { useStyles } from './useStyles';

describe('useStyles', () => {
	it('sets z-index as css variables', () => {
		vi.spyOn(global.document.documentElement.style, 'setProperty');

		const { setAppZIndexes } = useStyles();

		setAppZIndexes();

		expect(global.document.documentElement.style.setProperty).toHaveBeenNthCalledWith(
			2,
			'--z-index-app-header',
			'99',
		);
		expect(global.document.documentElement.style.setProperty).toHaveBeenCalledWith(
			'--z-index-canvas-add-button',
			'101',
		);

		expect(global.document.documentElement.style.setProperty).toHaveBeenCalledWith(
			'--z-index-workflow-preview-ndv',
			'9999999',
		);

		expect(global.document.documentElement.style.setProperty).toHaveBeenLastCalledWith(
			'--z-index-nps-survey-modal',
			'3001',
		);
	});
});
