import { DocsContainer } from '@storybook/addon-docs/blocks';
import { useDarkMode } from '@vueless/storybook-dark-mode';
import { createElement, type ComponentProps } from 'react';

import { applyN8nTheme } from './applyN8nTheme';
import { n8nDarkTheme, n8nLightTheme } from './n8nThemes';

/**
 * Docs pages are React (addon-docs) and stay on the light emotion theme unless
 * this container passes the dark theme. CSS cannot replace that — emotion sets
 * heading/body/code colors on the elements themselves.
 */
export function ThemedDocsContainer(props: ComponentProps<typeof DocsContainer>) {
	const isDark = useDarkMode();
	applyN8nTheme(isDark);

	return createElement(DocsContainer, {
		...props,
		theme: isDark ? n8nDarkTheme : n8nLightTheme,
	});
}
