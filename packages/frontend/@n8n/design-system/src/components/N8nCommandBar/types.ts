import type { Component } from 'vue';

export type CommandBarIcon =
	| { html: string }
	| { component: Component; props?: Record<string, unknown> };

export interface CommandBarItem {
	id: string;
	title: string | { component: Component; props?: Record<string, unknown> };
	icon?: CommandBarIcon;
	/** Optional icon shown next to the section header (taken from the first item that sets it). */
	sectionIcon?: CommandBarIcon;
	section?: string;
	/** Optional nested group under `section` (e.g. project name under "Nodes"). */
	subsection?: string;
	/** Optional icon shown next to the subsection header (taken from the first item that sets it). */
	subsectionIcon?: CommandBarIcon;
	keywords?: string[];
	handler?: () => void | Promise<void>;
	children?: CommandBarItem[];
	placeholder?: string;
	hasMoreChildren?: boolean;
	matchAnySearchTerm?: boolean;
}
