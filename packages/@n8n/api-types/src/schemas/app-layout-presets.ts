import type { AppLayout } from './app-content.schema';
import type { AppTheme } from './app.schema';

/** A ready-made layout plus theme an author or the AI starts an App from. */
export type AppLayoutPreset = {
	id: string;
	name: string;
	description: string;
	blocks: AppLayout;
	theme: AppTheme;
};

export const APP_LAYOUT_PRESETS: readonly AppLayoutPreset[] = [];
