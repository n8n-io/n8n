import type { Component } from 'vue';

export interface CommandBarItem {
	id: string;
	title: string;
	icon?: { html: string } | { component: Component; props?: Record<string, unknown> };
	section?: string;
	keywords?: string[];
	handler?: () => void | Promise<void>;
	href?: string;
	children?: CommandBarItem[];
	placeholder?: string;
	hasMoreChildren?: boolean;
}
