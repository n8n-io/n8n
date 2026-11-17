import { createApp } from 'vue';

import AgentChat from './AgentChat.vue';

export interface MountOptions {
	/** The agent's chat base URL, e.g. https://n8n.example.com/agent-webhook/<agentId>/chat */
	url: string;
	mode?: 'fullscreen' | 'bubble';
	/** Where to mount. Defaults to a new element at the end of <body>. */
	target?: HTMLElement;
	title?: string;
	welcomeMessage?: string;
	/** 'n8n': the hosted page's n8n look. Default: neutral, for the embedder's own brand. */
	theme?: 'n8n' | 'default';
	/** Shortcut for --agent-chat--color-primary. All other tokens are CSS variables on the host. */
	primaryColor?: string;
}

// Captured at load time: `document.currentScript` is null once the script has run.
const script = document.currentScript as HTMLScriptElement | null;
const cssUrl = script?.src.replace(/\.js(\?.*)?$/, '.css');

/** Renders the chat in a shadow root, so host page styles and ours do not mix. */
export function mount(options: MountOptions) {
	const host = options.target ?? document.body.appendChild(document.createElement('div'));
	if (options.primaryColor)
		host.style.setProperty('--agent-chat--color-primary', options.primaryColor);
	const shadow = host.attachShadow({ mode: 'open' });
	if (cssUrl) {
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = cssUrl;
		shadow.appendChild(link);
	}
	const root = shadow.appendChild(document.createElement('div'));
	const app = createApp(AgentChat, {
		base: options.url.replace(/\/$/, ''),
		mode: options.mode ?? 'bubble',
		title: options.title,
		welcomeMessage: options.welcomeMessage,
		theme: options.theme ?? 'default',
	});
	app.mount(root);
	return { unmount: () => app.unmount() };
}

// <script src=".../agent-chat.js" data-agent-url="..." [data-mode="fullscreen"]> mounts itself.
if (script?.dataset.agentUrl) {
	const options: MountOptions = {
		url: script.dataset.agentUrl,
		mode: script.dataset.mode === 'fullscreen' ? 'fullscreen' : 'bubble',
		title: script.dataset.title,
		welcomeMessage: script.dataset.welcomeMessage,
		theme: script.dataset.theme === 'n8n' ? 'n8n' : 'default',
		primaryColor: script.dataset.primaryColor,
	};
	if (document.body) mount(options);
	else document.addEventListener('DOMContentLoaded', () => mount(options));
}
