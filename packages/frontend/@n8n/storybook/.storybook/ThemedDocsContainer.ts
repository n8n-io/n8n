import { DocsContainer } from '@storybook/addon-docs/blocks';
import { useDarkMode } from '@vueless/storybook-dark-mode';
import { createElement, type ComponentProps } from 'react';
import { themes } from 'storybook/theming';

import { applyN8nTheme } from './applyN8nTheme';

/**
 * Docs pages are React (addon-docs) and stay on the light emotion theme unless
 * this container passes `themes.dark`. CSS cannot replace that — emotion sets
 * heading/body/code colors on the elements themselves.
 */
export function ThemedDocsContainer(props: ComponentProps<typeof DocsContainer>) {
	const isDark = useDarkMode();
	applyN8nTheme(isDark);

	return createElement(DocsContainer, {
		...props,
		theme: isDark ? themes.dark : themes.light,
	});
}
