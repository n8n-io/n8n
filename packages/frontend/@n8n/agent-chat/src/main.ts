import { createApp, reactive } from 'vue';

import type { ChatAppearance, PreviewState } from './api';
import AgentChat from './AgentChat.vue';

export interface MountOptions {
	/** The agent's chat base URL, e.g. https://n8n.example.com/agent-webhook/<agentId>/chat */
	url: string;
	mode?: 'fullscreen' | 'bubble';
	/** Where to mount. Defaults to a new element at the end of <body>. */
	target?: HTMLElement;
	/** 'n8n': the hosted page's n8n look. Default: neutral, for the embedder's own brand. */
	theme?: 'n8n' | 'default';
	/** Win over the owner's appearance from /config (the snippet's data-* attributes). */
	overrides?: ChatAppearance;
	/** No round launcher: open the chat with `window.n8nAgentChat.open()`. */
	hideLauncher?: boolean;
	/** Theme editor preview: sample messages, no network. Change it with `update()`. */
	preview?: PreviewState;
}

// Captured at load time: `document.currentScript` is null once the script has run.
const script = document.currentScript as HTMLScriptElement | null;
const cssUrl = script?.src.replace(/\.js(\?.*)?$/, '.css');

/** Renders the chat in a shadow root, so host page styles and ours do not mix. */
export function mount(options: MountOptions) {
	const host = options.target ?? document.body.appendChild(document.createElement('div'));
	const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
	shadow.replaceChildren();
	if (cssUrl) {
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = cssUrl;
		shadow.appendChild(link);
	}
	const root = shadow.appendChild(document.createElement('div'));
	// The editor's preview passes plain objects: this Vue tracks its own copy.
	const preview = options.preview ? reactive({ ...options.preview }) : undefined;
	const app = createApp(AgentChat, {
		base: options.url.replace(/\/$/, ''),
		mode: options.mode ?? 'bubble',
		theme: options.theme ?? 'default',
		overrides: options.overrides,
		hideLauncher: options.hideLauncher,
		preview,
	});
	const chat = app.mount(root) as unknown as { setOpen(open: boolean): void; toggle(): void };
	return {
		unmount: () => app.unmount(),
		open: () => chat.setOpen(true),
		close: () => chat.setOpen(false),
		toggle: () => chat.toggle(),
		/** Preview only: shows a new draft appearance at once. */
		update: (appearance: ChatAppearance) => {
			if (preview) preview.appearance = { ...appearance };
		},
	};
}

/** Reads the appearance overrides from data-* attributes (e.g. data-primary-color). */
function overridesFrom(data: DOMStringMap): ChatAppearance {
	const radius = data.radius === undefined ? undefined : Number.parseInt(data.radius, 10);
	return {
		title: data.title,
		welcomeMessage: data.welcomeMessage,
		placeholder: data.placeholder,
		primaryColor: data.primaryColor,
		backgroundColor: data.backgroundColor,
		textColor: data.textColor,
		agentBubbleColor: data.agentBubbleColor,
		font: data.font as ChatAppearance['font'],
		radius: Number.isFinite(radius) ? radius : undefined,
		logoUrl: data.logoUrl,
		colorScheme: data.colorScheme as ChatAppearance['colorScheme'],
		position: data.position as ChatAppearance['position'],
		launcherIcon: data.launcherIcon as ChatAppearance['launcherIcon'],
	};
}

// <script src=".../agent-chat.js" data-agent-url="..." [data-mode="fullscreen"]> mounts itself.
// The page can open and close it: window.n8nAgentChat.open() / .close() / .toggle().
if (script?.dataset.agentUrl) {
	const data = script.dataset;
	const options: MountOptions = {
		url: data.agentUrl!,
		mode: data.mode === 'fullscreen' ? 'fullscreen' : 'bubble',
		theme: data.theme === 'n8n' ? 'n8n' : 'default',
		overrides: overridesFrom(data),
		hideLauncher: data.launcher === 'none',
	};
	const start = () => {
		const chat = mount(options);
		Object.assign(window, {
			n8nAgentChat: { open: chat.open, close: chat.close, toggle: chat.toggle },
		});
	};
	if (document.body) start();
	else document.addEventListener('DOMContentLoaded', start);
}
