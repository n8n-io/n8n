import { DocsContainer } from '@storybook/addon-docs/blocks';
import { createElement, useEffect, useLayoutEffect, useState, type ComponentProps } from 'react';
import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import { create } from 'storybook/theming';

import { applyN8nTheme, resolveN8nTheme, type N8nTheme } from './applyN8nTheme';

type DocsContainerProps = ComponentProps<typeof DocsContainer>;

/**
 * The Storybook themes, with the n8n fonts. The default themes use Nunito Sans. The preview
 * loads Geist with the design system styles, so the docs can use the font tokens.
 */
const fonts = {
	fontBase: 'var(--font-family)',
	fontCode: 'var(--font-family--monospace)',
};

const docsThemes = {
	light: create({ base: 'light', ...fonts }),
	dark: create({ base: 'dark', ...fonts }),
};

function themeFromGlobals(globals: unknown): N8nTheme | undefined {
	if (typeof globals !== 'object' || globals === null || !('theme' in globals)) {
		return undefined;
	}

	return resolveN8nTheme(globals.theme);
}

function lastGlobalsTheme(channel: DocsContainerProps['context']['channel']): N8nTheme | undefined {
	for (const event of [GLOBALS_UPDATED, SET_GLOBALS]) {
		const args: unknown = channel.last(event);
		if (!Array.isArray(args) || args.length === 0) {
			continue;
		}

		const payload: unknown = args[0];
		if (typeof payload !== 'object' || payload === null || !('globals' in payload)) {
			continue;
		}

		const fromPayload = themeFromGlobals(payload.globals);
		if (fromPayload) {
			return fromPayload;
		}
	}

	return undefined;
}

function themeFromDom(): N8nTheme | undefined {
	const current = document.body.dataset.theme;
	if (current === 'dark' || current === 'light') {
		return current;
	}

	return undefined;
}

function initialDocsTheme(context: DocsContainerProps['context']): N8nTheme {
	return lastGlobalsTheme(context.channel) ?? themeFromDom() ?? 'light';
}

export const ThemedDocsContainer = (props: DocsContainerProps) => {
	const [themeName, setThemeName] = useState<N8nTheme>(() => initialDocsTheme(props.context));

	useLayoutEffect(() => {
		applyN8nTheme(themeName);
	}, [themeName]);

	useEffect(() => {
		const onGlobals = ({ globals }: { globals?: unknown }) => {
			const next = themeFromGlobals(globals);
			if (!next) {
				return;
			}

			setThemeName(next);
			applyN8nTheme(next);
		};

		props.context.channel.on(GLOBALS_UPDATED, onGlobals);
		return () => {
			props.context.channel.off(GLOBALS_UPDATED, onGlobals);
		};
	}, [props.context.channel]);

	return createElement(DocsContainer, {
		...props,
		theme: docsThemes[themeName],
	});
};
