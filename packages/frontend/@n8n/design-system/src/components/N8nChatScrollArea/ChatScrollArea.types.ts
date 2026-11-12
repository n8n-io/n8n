export interface ChatScrollAreaProps {
	/**
	 * Keeps the newest content in view while the user is at the bottom.
	 * When `false`, the view never moves on its own.
	 * @default true
	 */
	follow?: boolean;
	/**
	 * Set to `true` while the parent loads older messages. Stops repeated
	 * `load-older` events. When it changes from `true` to `false`, the
	 * component keeps the visible message in the same position.
	 * @default false
	 */
	loadingOlder?: boolean;
}

export interface ChatScrollAreaEmits {
	/**
	 * Emitted when the top of the list becomes visible. The parent loads the
	 * next page of older messages and sets `loadingOlder` during the load.
	 * Emitted again after the load when the top is still visible. The parent
	 * must stop when there are no more pages or when a load fails.
	 */
	'load-older': [];
	/** Emitted when the user arrives at the bottom or leaves it. */
	'update:atBottom': [value: boolean];
}

export interface ChatScrollAreaSlots {
	/** The message list. */
	default(): unknown;
	/**
	 * The content of the bottom overlay, usually the chat input. Put panels
	 * that show above the input in the same container.
	 */
	input(): unknown;
}

export interface ChatScrollAreaExposed {
	/** Jumps to the bottom without animation and starts following again. */
	scrollToBottom: () => void;
}

/** Scroll position used to keep the visible message in place after a top load. */
export interface ScrollAnchorSnapshot {
	scrollHeight: number;
	scrollTop: number;
	/** The content element at the top of the view. */
	anchor?: Element;
	/** The viewport position of `anchor` when the snapshot was taken. */
	anchorTop?: number;
}
