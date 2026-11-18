import { useQuickChat } from '../useQuickChat';

describe('useQuickChat', () => {
	afterEach(() => {
		useQuickChat().close();
	});

	it('opens next to its anchor and closes again', () => {
		const quickChat = useQuickChat();

		quickChat.open({ right: 52, top: 10 });
		expect(quickChat.state.open).toBe(true);
		expect(quickChat.state.anchor).toEqual({ right: 52, top: 10 });

		quickChat.toggle(null);
		expect(quickChat.state.open).toBe(false);
	});

	it('shares one chat across callers, so it survives a new navigation', () => {
		useQuickChat().open(null);

		expect(useQuickChat().state.open).toBe(true);
	});

	it('starts a new draft chat, and leaves the draft once the first message saved it', () => {
		const quickChat = useQuickChat();
		const first = quickChat.state.threadId;

		quickChat.markPersisted(first);
		expect(quickChat.state.isDraft).toBe(false);

		quickChat.startNewChat();
		expect(quickChat.state.threadId).not.toBe(first);
		expect(quickChat.state.isDraft).toBe(true);

		// A late save of the previous chat does not touch the new draft.
		quickChat.markPersisted(first);
		expect(quickChat.state.isDraft).toBe(true);
	});
});
