import { effectScope, ref } from 'vue';
import {
	PEEK_CARRY_OVER_WINDOW,
	PEEK_CLOSE_DELAY,
	PEEK_OPEN_DELAY,
	useNavigationPeek,
} from './useNavigationPeek';

function setup(enabled = ref(true)) {
	const scope = effectScope();
	const peek = scope.run(() => useNavigationPeek({ enabled }))!;
	return { peek, scope, enabled };
}

describe('useNavigationPeek', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('opens the hovered item only after the open delay', () => {
		const { peek } = setup();

		peek.onItemEnter('overview');
		vi.advanceTimersByTime(PEEK_OPEN_DELAY - 1);
		expect(peek.peekItemId.value).toBeNull();

		vi.advanceTimersByTime(1);
		expect(peek.peekItemId.value).toBe('overview');
	});

	it('opens nothing when the pointer only crosses the rail', () => {
		const { peek } = setup();

		peek.onItemEnter('overview');
		vi.advanceTimersByTime(PEEK_OPEN_DELAY / 2);
		peek.onLeave();
		vi.advanceTimersByTime(PEEK_OPEN_DELAY * 2);

		expect(peek.peekItemId.value).toBeNull();
	});

	it('restarts the delay when the pointer moves to another item before the panel opens', () => {
		const { peek } = setup();

		peek.onItemEnter('overview');
		vi.advanceTimersByTime(PEEK_OPEN_DELAY - 50);
		peek.onItemEnter('inbox');
		vi.advanceTimersByTime(PEEK_OPEN_DELAY - 50);
		expect(peek.peekItemId.value).toBeNull();

		vi.advanceTimersByTime(50);
		expect(peek.peekItemId.value).toBe('inbox');
	});

	it('switches an open panel to the next hovered item at once', () => {
		const { peek } = setup();
		peek.onItemEnter('overview');
		vi.advanceTimersByTime(PEEK_OPEN_DELAY);

		peek.onItemEnter('inbox');

		expect(peek.peekItemId.value).toBe('inbox');
	});

	it('closes after the close delay once the pointer leaves', () => {
		const { peek } = setup();
		peek.onItemEnter('overview');
		vi.advanceTimersByTime(PEEK_OPEN_DELAY);

		peek.onLeave();
		vi.advanceTimersByTime(PEEK_CLOSE_DELAY - 1);
		expect(peek.peekItemId.value).toBe('overview');

		vi.advanceTimersByTime(1);
		expect(peek.peekItemId.value).toBeNull();
	});

	it('stays open when the pointer moves from the rail into the panel', () => {
		const { peek } = setup();
		peek.onItemEnter('overview');
		vi.advanceTimersByTime(PEEK_OPEN_DELAY);

		peek.onLeave();
		vi.advanceTimersByTime(PEEK_CLOSE_DELAY / 2);
		peek.onPanelEnter();
		vi.advanceTimersByTime(PEEK_CLOSE_DELAY * 2);

		expect(peek.peekItemId.value).toBe('overview');
	});

	it('does nothing while disabled, for example when the panel is expanded', () => {
		const { peek } = setup(ref(false));

		peek.onItemEnter('overview');
		vi.advanceTimersByTime(PEEK_OPEN_DELAY * 2);

		expect(peek.peekItemId.value).toBeNull();
	});

	it('closes at once on close()', () => {
		const { peek } = setup();
		peek.onItemEnter('overview');
		vi.advanceTimersByTime(PEEK_OPEN_DELAY);

		peek.close();

		expect(peek.peekItemId.value).toBeNull();
	});

	it('cancels a pending open when its scope is disposed', () => {
		const { peek, scope } = setup();

		peek.onItemEnter('overview');
		scope.stop();
		vi.advanceTimersByTime(PEEK_OPEN_DELAY * 2);

		expect(peek.peekItemId.value).toBeNull();
	});

	describe('carry over', () => {
		function mount() {
			const scope = effectScope();
			const peek = scope.run(() => useNavigationPeek({ carryOver: true }))!;
			return { peek, scope };
		}

		it('hands the open panel to a navigation that mounts right after', () => {
			const first = mount();
			first.peek.onItemEnter('assistant');
			vi.advanceTimersByTime(PEEK_OPEN_DELAY);
			first.scope.stop();

			const second = mount();

			expect(second.peek.peekItemId.value).toBe('assistant');
			second.scope.stop();
		});

		it('starts closed when the next navigation mounts later, or when no panel was open', () => {
			const first = mount();
			first.peek.onItemEnter('assistant');
			vi.advanceTimersByTime(PEEK_OPEN_DELAY);
			first.scope.stop();
			vi.advanceTimersByTime(PEEK_CARRY_OVER_WINDOW + 1);

			const late = mount();
			expect(late.peek.peekItemId.value).toBeNull();
			late.scope.stop();

			const next = mount();
			expect(next.peek.peekItemId.value).toBeNull();
			next.scope.stop();
		});

		it('shares the open panel with a navigation that mounts before the old one goes away', () => {
			const first = mount();
			first.peek.onItemEnter('assistant');
			vi.advanceTimersByTime(PEEK_OPEN_DELAY);

			const second = mount();
			first.scope.stop();

			expect(second.peek.peekItemId.value).toBe('assistant');
			second.scope.stop();
		});

		it('hands nothing over without the option', () => {
			const first = mount();
			first.peek.onItemEnter('assistant');
			vi.advanceTimersByTime(PEEK_OPEN_DELAY);
			first.scope.stop();

			const { peek, scope } = setup();
			expect(peek.peekItemId.value).toBeNull();
			scope.stop();
		});
	});
});
