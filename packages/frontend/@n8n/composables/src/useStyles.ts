import { APP_Z_INDEXES } from '@n8n/frontend-constants/z-indexes';

const setAppZIndexes = () => {
	Object.keys(APP_Z_INDEXES).forEach((key) => {
		const variableName = `--${key.toLowerCase().replaceAll('_', '-')}--z`;
		const value = APP_Z_INDEXES[key as keyof typeof APP_Z_INDEXES];
		document.documentElement.style.setProperty(variableName, `${value}`);
	});
};

export const useStyles = () => ({
	APP_Z_INDEXES,
	setAppZIndexes,
});
