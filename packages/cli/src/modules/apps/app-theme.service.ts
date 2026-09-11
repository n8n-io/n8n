import type { Workspace } from '@n8n/agents';
import type { AppTheme } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { AppDraftService, type DraftWriteResult } from './app-draft.service';

const OVERRIDES_FILE = 'src/theme-overrides.css';
const MODE_FILE = 'src/theme-mode.ts';

export type ThemeSaveResult = DraftWriteResult;

function themeOverridesCss(vars: Record<string, string>): string {
	const entries = Object.entries(vars);
	if (entries.length === 0) return '';
	const declarations = entries.map(([key, value]) => `\t${key}: ${value};`).join('\n');
	return `:root {\n${declarations}\n}\n`;
}

/**
 * Reads back whatever CSS custom properties are already in theme-overrides.css —
 * Instance AI can edit that file directly with its own variables, and a Theme-tab
 * save must not erase them. Simple regex, not a CSS parser: this file is only ever
 * hand-edited (by the agent) or written by `themeOverridesCss` above, both of which
 * stick to flat `--name: value;` declarations.
 */
function parseThemeOverridesCss(content: string): Record<string, string> {
	const vars: Record<string, string> = {};
	for (const match of content.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
		vars[match[1]] = match[2].trim();
	}
	return vars;
}

function themeModeTs(theme: AppTheme): string {
	return `export const THEME_MODE: 'light' | 'dark' | 'system' = '${theme.mode}';\n`;
}

const themeFiles = (existingOverrides: string, theme: AppTheme) => ({
	[OVERRIDES_FILE]: themeOverridesCss({
		...parseThemeOverridesCss(existingOverrides),
		...theme.vars,
	}),
	[MODE_FILE]: themeModeTs(theme),
});

/**
 * Writes a saved theme into the app's draft source (see `AppDraftService`):
 * nothing is built or published, the user publishes explicitly afterwards.
 */
@Service()
export class AppThemeService {
	constructor(private readonly draftService: AppDraftService) {}

	async applyTheme(
		appId: string,
		theme: AppTheme,
		user: User,
		options: { draft?: Workspace } = {},
	): Promise<ThemeSaveResult> {
		return await this.draftService.write(
			appId,
			user,
			async (read) => themeFiles((await read(OVERRIDES_FILE)) ?? '', theme),
			options.draft,
		);
	}
}
