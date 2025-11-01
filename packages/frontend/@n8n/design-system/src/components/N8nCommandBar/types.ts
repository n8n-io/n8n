import type { Component } from 'vue';

export interface CommandBarItem {
	id: string;
	title: string | { component: Component; props?: Record<string, unknown> };
	icon?: { html: string } | { component: Component; props?: Record<string, unknown> };
	section?: string;
	keywords?: string[];
	handler?: () => void | Promise<void>;
	children?: CommandBarItem[];
	placeholder?: string;
	hasMoreChildren?: boolean;
}
