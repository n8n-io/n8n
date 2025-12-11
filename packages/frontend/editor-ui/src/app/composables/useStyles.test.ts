import { useStyles } from './useStyles';

describe('useStyles', () => {
	it('sets z-index as css variables', () => {
		vi.spyOn(global.document.documentElement.style, 'setProperty');

		const { setAppZIndexes } = useStyles();

		setAppZIndexes();

		expect(global.document.documentElement.style.setProperty).toHaveBeenNthCalledWith(
			2,
			'--app-header--z',
			'99',
		);
		expect(global.document.documentElement.style.setProperty).toHaveBeenCalledWith(
			'--canvas-add-button--z',
			'101',
		);

		expect(global.document.documentElement.style.setProperty).toHaveBeenCalledWith(
			'--workflow-preview-ndv--z',
			'9999999',
		);

		expect(global.document.documentElement.style.setProperty).toHaveBeenLastCalledWith(
			'--nps-survey-modal--z',
			'3001',
		);
	});
});
