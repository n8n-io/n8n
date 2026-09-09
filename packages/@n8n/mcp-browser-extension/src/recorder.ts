interface RecorderState {
	active: boolean;
	inputTimers: Map<Element, ReturnType<typeof setTimeout>>;
	copyContext?: { target: Element; value?: string; timestamp: number };
	heartbeatTimer?: ReturnType<typeof setInterval>;
}

declare global {
	interface Window {
		__n8nBrowserRecorder?: RecorderState;
	}
}

function startHeartbeat(state: RecorderState): void {
	if (window !== window.top || state.heartbeatTimer) return;
	state.heartbeatTimer = setInterval(() => {
		void chrome.runtime
			.sendMessage({ type: 'recordingHeartbeat' })
			.then((response: unknown) => {
				if (
					response &&
					typeof response === 'object' &&
					'keepAlive' in response &&
					response.keepAlive === false &&
					state.heartbeatTimer
				) {
					clearInterval(state.heartbeatTimer);
					state.heartbeatTimer = undefined;
				}
			})
			.catch(() => {});
	}, 20_000);
}

const existing = window.__n8nBrowserRecorder;
if (existing) {
	existing.active = true;
	startHeartbeat(existing);
} else {
	const state: RecorderState = { active: true, inputTimers: new Map() };
	window.__n8nBrowserRecorder = state;
	const inFlightMessages = new Set<Promise<unknown>>();
	startHeartbeat(state);

	const normalized = (value: string | null | undefined, limit = 160) => {
		const result = value?.replace(/\s+/g, ' ').trim().slice(0, limit);
		return result === '' ? undefined : result;
	};
	const conciseText = (value: string | null | undefined) => {
		const result = value?.replace(/\s+/g, ' ').trim();
		return result && result.length <= 120 ? result : undefined;
	};

	const targetFor = (element: Element) => {
		const input = element instanceof HTMLInputElement ? element : undefined;
		const labelledBy = element.getAttribute('aria-labelledby');
		const labelledByText = labelledBy
			?.split(/\s+/)
			.map((id) => document.getElementById(id)?.textContent)
			.filter(Boolean)
			.join(' ');
		const explicitLabel =
			element instanceof HTMLInputElement ||
			element instanceof HTMLTextAreaElement ||
			element instanceof HTMLSelectElement
				? element.labels?.[0]?.textContent
				: undefined;
		const directText = [...element.childNodes]
			.filter((node) => node.nodeType === Node.TEXT_NODE)
			.map((node) => node.textContent)
			.join(' ');
		const imageAlt = element instanceof HTMLImageElement ? element.alt : undefined;
		const semanticDescendant = element.querySelector(
			'h1, h2, h3, h4, h5, h6, [role="heading"], img[alt]',
		);
		const semanticDescendantText =
			semanticDescendant instanceof HTMLImageElement
				? semanticDescendant.alt
				: semanticDescendant?.textContent;
		const placeholder =
			element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
				? element.placeholder
				: undefined;
		const stableId = /^[A-Za-z][A-Za-z_-]{1,79}$/.test(element.id) ? element.id : undefined;

		return {
			tag: element.tagName.toLowerCase(),
			role: normalized(element.getAttribute('role'), 40),
			label: normalized(
				element.getAttribute('aria-label') ??
					explicitLabel ??
					labelledByText ??
					element.getAttribute('title') ??
					imageAlt ??
					placeholder ??
					conciseText(directText) ??
					conciseText(semanticDescendantText) ??
					conciseText(element.textContent),
			),
			name: normalized(element.getAttribute('name') ?? stableId, 80),
			inputType: normalized(input?.type, 40),
		};
	};

	const eventTarget = (event: Event): Element | undefined => {
		const elements = event
			.composedPath()
			.filter((item): item is Element => item instanceof Element);
		return (
			elements.find((element) =>
				element.matches(
					'button, a, input, textarea, select, summary, label, [contenteditable="true"], [aria-label], [aria-labelledby], [title], [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="option"]',
				),
			) ?? elements[0]
		);
	};

	const send = async (
		type: 'click' | 'context_menu' | 'copy' | 'input' | 'key' | 'select' | 'submit',
		element: Element,
		value?: string,
	): Promise<void> => {
		if (!state.active) return;
		const message = chrome.runtime.sendMessage({
			type: 'recordingAction',
			action: {
				type,
				timestamp: Date.now(),
				url: window.location.href,
				target: targetFor(element),
				...(value === undefined ? {} : { value }),
			},
		});
		inFlightMessages.add(message);
		try {
			await message;
		} catch {
			// The extension can stop while an action is in flight.
		} finally {
			inFlightMessages.delete(message);
		}
	};

	const valueFor = (element: Element): string | undefined => {
		if (element instanceof HTMLInputElement) {
			if (element.type === 'checkbox' || element.type === 'radio') {
				return element.checked ? 'checked' : 'unchecked';
			}
			return element.value;
		}
		if (element instanceof HTMLTextAreaElement) return element.value;
		if (element instanceof HTMLSelectElement) {
			return [...element.selectedOptions].map((option) => option.text).join(', ');
		}
		if (element instanceof HTMLElement && element.isContentEditable) return element.innerText;
		return undefined;
	};

	const flushPendingInputs = async (): Promise<void> => {
		const pendingMessages: Array<Promise<void>> = [];
		for (const [element, timer] of state.inputTimers) {
			clearTimeout(timer);
			pendingMessages.push(send('input', element, valueFor(element)));
		}
		state.inputTimers.clear();
		await Promise.allSettled([...pendingMessages, ...inFlightMessages]);
	};

	const copiedText = (event: ClipboardEvent): string | undefined => {
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			const { selectionStart, selectionEnd, value } = event.target;
			if (selectionStart !== null && selectionEnd !== null) {
				return value.slice(selectionStart, Math.min(selectionEnd, selectionStart + 200));
			}
		}
		const selection = document.getSelection()?.toString().slice(0, 200);
		return selection === '' ? undefined : selection;
	};

	const recentCopyContext = () => {
		const context = state.copyContext;
		return context && Date.now() - context.timestamp < 30_000 ? context : undefined;
	};

	const copySource = (event: ClipboardEvent): Element | undefined => {
		const anchor = document.getSelection()?.anchorNode;
		const selectionElement = anchor instanceof Element ? anchor : anchor?.parentElement;
		return selectionElement ?? recentCopyContext()?.target ?? eventTarget(event);
	};

	document.addEventListener(
		'click',
		(event) => {
			if (!event.isTrusted) return;
			void flushPendingInputs();
			const target = eventTarget(event);
			if (target) void send('click', target);
		},
		true,
	);

	document.addEventListener(
		'contextmenu',
		(event) => {
			if (!event.isTrusted) return;
			void flushPendingInputs();
			const target = eventTarget(event);
			if (!target) return;
			const selection = document.getSelection()?.toString().slice(0, 200);
			state.copyContext = {
				target,
				value: selection === '' ? undefined : selection,
				timestamp: Date.now(),
			};
			const link = target instanceof HTMLAnchorElement ? target : target.closest('a[href]');
			void send('context_menu', target, link instanceof HTMLAnchorElement ? link.href : undefined);
		},
		true,
	);

	document.addEventListener(
		'keydown',
		(event) => {
			if (!event.isTrusted || event.repeat) return;
			if (
				!['Enter', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
					event.key,
				)
			) {
				return;
			}
			void flushPendingInputs();
			const target = eventTarget(event);
			const key = [
				event.ctrlKey ? 'Control' : '',
				event.metaKey ? 'Meta' : '',
				event.altKey ? 'Alt' : '',
				event.shiftKey ? 'Shift' : '',
				event.key,
			]
				.filter(Boolean)
				.join('+');
			if (target) void send('key', target, key);
		},
		true,
	);

	document.addEventListener(
		'copy',
		(event) => {
			if (!event.isTrusted) return;
			const target = copySource(event);
			if (target) void send('copy', target, copiedText(event) ?? recentCopyContext()?.value);
			state.copyContext = undefined;
		},
		true,
	);

	document.addEventListener(
		'input',
		(event) => {
			if (!event.isTrusted) return;
			const target = eventTarget(event);
			if (!target) return;
			const timer = state.inputTimers.get(target);
			if (timer) clearTimeout(timer);
			state.inputTimers.set(
				target,
				setTimeout(() => {
					state.inputTimers.delete(target);
					void send('input', target, valueFor(target));
				}, 400),
			);
		},
		true,
	);

	document.addEventListener(
		'change',
		(event) => {
			if (!event.isTrusted) return;
			const target = eventTarget(event);
			if (!target) return;
			const timer = state.inputTimers.get(target);
			if (timer) clearTimeout(timer);
			state.inputTimers.delete(target);
			void send(target instanceof HTMLSelectElement ? 'select' : 'input', target, valueFor(target));
		},
		true,
	);

	document.addEventListener(
		'submit',
		(event) => {
			if (!event.isTrusted) return;
			void flushPendingInputs();
			const target = eventTarget(event);
			if (target) void send('submit', target);
		},
		true,
	);

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') void flushPendingInputs();
	});
	window.addEventListener('pagehide', () => {
		void flushPendingInputs();
	});

	chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
		if (
			message !== null &&
			typeof message === 'object' &&
			(message as { type?: unknown }).type === 'stopBrowserRecording'
		) {
			const pendingFlush = flushPendingInputs();
			state.active = false;
			void pendingFlush
				.finally(() => {
					sendResponse();
				})
				.catch(() => {});
			return true;
		}
		return undefined;
	});
}

export {};
