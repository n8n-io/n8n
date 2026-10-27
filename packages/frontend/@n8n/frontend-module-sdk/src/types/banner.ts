import type { Component } from 'vue';

/**
 * A banner a module contributes to the shell's banner stack. `priority` follows
 * the existing stack semantics (higher wins when several banners are queued).
 */
export interface ModuleBanner {
	name: string;
	priority: number;
	component: Component | (() => Promise<Component>);
	dismissible?: boolean;
}
