import { usePreferredReducedMotion } from '@vueuse/core';
import { computed, onScopeDispose, ref, toValue, type MaybeRefOrGetter } from 'vue';
import { sampleSpring } from '@/app/utils/spring';

export type SwipeDirection = -1 | 1;

export interface UseSwipeToDismissOptions {
	/** The element that follows the gesture. */
	target: MaybeRefOrGetter<HTMLElement | null | undefined>;
	/** Runs once the element has flown out. The caller removes it. */
	onDismiss: (direction: SwipeDirection) => void;
}

/** Pointer travel before a press turns into a drag, so a sloppy click stays a click. */
const DRAG_START_PX = 6;
/** Share of the element width the gesture must cover to dismiss without a flick. */
const DISMISS_DISTANCE_RATIO = 0.4;
/** px per ms. A fast release dismisses even from a short distance. */
const FLICK_VELOCITY = 0.5;
/** A flick still has to travel this far, so a twitch does not count. */
const MIN_FLICK_DISTANCE_PX = 24;
/** Pointer samples older than this do not count toward the release velocity. */
const VELOCITY_WINDOW_MS = 80;
/** Samples closer together than a frame give a meaningless velocity. */
const MIN_VELOCITY_SPAN_MS = 16;
/** A trackpad swipe has ended once wheel events stop for this long. */
const WHEEL_IDLE_MS = 120;
const ROTATION_PER_PX = 0.05;
const MAX_ROTATION_DEG = 8;
/** The element grows this much as it is picked up, over the first LIFT_RAMP_PX of travel. */
const LIFT_SCALE = 0.02;
const LIFT_RAMP_PX = 24;
/** px per ms. A release slower than this still flies out at this speed. */
const MIN_EXIT_VELOCITY = 1.2;
const EXIT_MIN_MS = 140;
const EXIT_MAX_MS = 260;
/** The element loses focus as it speeds out, which reads as motion blur. */
const EXIT_BLUR_PX = 2;
/** The settle spring sits a little under critical damping, so a release rebounds once before it rests. */
const SETTLE_RESPONSE_S = 0.38;
const SETTLE_DAMPING = 0.68;
/** px per second. Caps what a wild flick can feed into the settle spring. */
const MAX_SETTLE_VELOCITY = 3000;
// --easing--ease-out; WAAPI needs the literal curve.
const EASE_OUT = 'cubic-bezier(0.215, 0.61, 0.355, 1)';

interface SettleAnimation {
	animation: Animation;
	values: number[];
	frameMs: number;
}

/**
 * Lets an element be swiped sideways to dismiss it, the way a notification
 * leaves a stack. A pointer drag (mouse, touch) or a horizontal trackpad swipe
 * (wheel `deltaX`) moves the element with the gesture; past the threshold or
 * on a quick flick it flies out at the speed of the release and `onDismiss`
 * fires, otherwise it springs back, carrying the release velocity into the
 * rebound. A settling element can be caught again mid-flight. Elements
 * marked `data-swipe-ignore` do not start a drag.
 */
export function useSwipeToDismiss({ target, onDismiss }: UseSwipeToDismissOptions) {
	const reducedMotion = usePreferredReducedMotion();

	const offset = ref(0);
	const isDragging = ref(false);
	const isSettling = ref(false);
	const isLeaving = ref(false);

	let pointerStart: { id: number; x: number; y: number } | null = null;
	// Where the element was caught, so the drag continues from there rather than jumping to the pointer.
	let dragBase = 0;
	let samples: Array<{ x: number; t: number }> = [];
	// A drag ends with a click on the same element; that click must not open anything.
	let suppressNextClick = false;
	let wheelIdleTimer: ReturnType<typeof setTimeout> | undefined;
	// Trackpad inertia keeps sending deltas after a dismiss; they must not move the next element.
	let wheelLockedUntilIdle = false;
	let settle: SettleAnimation | null = null;

	const element = () => toValue(target) ?? null;
	const width = () => element()?.offsetWidth || 200;
	const threshold = () => width() * DISMISS_DISTANCE_RATIO;

	function progressFor(x: number) {
		return Math.min(1, Math.abs(x) / threshold());
	}

	function transformFor(x: number) {
		const rotation = Math.max(-MAX_ROTATION_DEG, Math.min(MAX_ROTATION_DEG, x * ROTATION_PER_PX));
		const lift = 1 + LIFT_SCALE * Math.min(1, Math.abs(x) / LIFT_RAMP_PX);
		return `translateX(${x}px) rotate(${rotation}deg) scale(${lift})`;
	}

	/** How far the gesture is toward the dismiss threshold, 0 to 1, while the element is held. */
	const progress = computed(() =>
		isDragging.value && !isLeaving.value ? progressFor(offset.value) : 0,
	);

	// The held element stays opaque: a card in the hand does not go see-through.
	const style = computed(() => {
		if (!isDragging.value || isLeaving.value) return undefined;
		return { transform: transformFor(offset.value) };
	});

	function canAnimate(el: HTMLElement): boolean {
		return reducedMotion.value !== 'reduce' && typeof el.animate === 'function';
	}

	/** Stops a running settle and returns where the element was at that moment. */
	function catchSettling(): number {
		if (!settle) return 0;
		const { animation, values, frameMs } = settle;
		const time = typeof animation.currentTime === 'number' ? animation.currentTime : 0;
		const x = values[Math.min(values.length - 1, Math.round(time / frameMs))] ?? 0;
		settle = null;
		isSettling.value = false;
		animation.cancel();
		return x;
	}

	/** Springs the element back to rest, continuing at the release velocity (px per ms). */
	function settleBack(velocity = 0) {
		const el = element();
		const from = offset.value;
		isDragging.value = false;
		offset.value = 0;
		dragBase = 0;
		if (!el || !canAnimate(el) || from === 0) return;
		const { values, frameMs, duration } = sampleSpring({
			from,
			to: 0,
			velocity: Math.max(-MAX_SETTLE_VELOCITY, Math.min(MAX_SETTLE_VELOCITY, velocity * 1000)),
			response: SETTLE_RESPONSE_S,
			dampingRatio: SETTLE_DAMPING,
		});
		if (values.length < 2) return;
		const animation = el.animate(
			values.map((x) => ({ transform: transformFor(x) })),
			{ duration, easing: 'linear' },
		);
		settle = { animation, values, frameMs };
		isSettling.value = true;
		const done = () => {
			if (settle?.animation !== animation) return;
			settle = null;
			isSettling.value = false;
		};
		animation.finished.then(done).catch(done);
	}

	function finishDismiss(direction: SwipeDirection) {
		onDismiss(direction);
		isLeaving.value = false;
		isDragging.value = false;
		offset.value = 0;
		dragBase = 0;
	}

	/** Flies the element out sideways at the given speed (px per ms), then reports the dismissal. */
	function dismiss(direction: SwipeDirection, velocity = 0) {
		const el = element();
		if (isLeaving.value || !el) return;
		const startX = isDragging.value ? offset.value : catchSettling();
		isLeaving.value = true;
		if (!canAnimate(el)) {
			finishDismiss(direction);
			return;
		}
		const endX = direction * (width() + 48);
		// A flick keeps its own speed; a slow push or a button press leaves at a brisk default.
		const speed = Math.max(Math.abs(velocity), MIN_EXIT_VELOCITY);
		const duration = Math.min(EXIT_MAX_MS, Math.max(EXIT_MIN_MS, Math.abs(endX - startX) / speed));
		const animation = el.animate(
			[
				{ transform: transformFor(startX), opacity: '1', filter: 'blur(0)' },
				{ transform: transformFor(endX), opacity: '0', filter: `blur(${EXIT_BLUR_PX}px)` },
			],
			{ duration, easing: EASE_OUT, fill: 'forwards' },
		);
		animation.finished.then(() => finishDismiss(direction)).catch(() => finishDismiss(direction));
	}

	function releaseVelocity(): number {
		const last = samples.at(-1);
		const first = samples.find((sample) => last && last.t - sample.t <= VELOCITY_WINDOW_MS);
		if (!last || !first || last.t - first.t < MIN_VELOCITY_SPAN_MS) return 0;
		return (last.x - first.x) / (last.t - first.t);
	}

	function recordSample(x: number, t: number) {
		samples.push({ x, t });
		if (samples.length > 12) samples.shift();
	}

	function stopPointerTracking() {
		pointerStart = null;
		samples = [];
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerEnd);
		window.removeEventListener('pointercancel', onPointerEnd);
	}

	function onPointerDown(event: PointerEvent) {
		// A drag released off the element never produced its click; do not swallow this press's.
		suppressNextClick = false;
		if (event.button !== 0 || isLeaving.value || isDragging.value) return;
		if (event.target instanceof Element && event.target.closest('[data-swipe-ignore]')) return;
		pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
		samples = [{ x: event.clientX, t: event.timeStamp }];
		// A card still springing back is caught where it is; the press holds it there.
		dragBase = catchSettling();
		if (dragBase !== 0) {
			isDragging.value = true;
			suppressNextClick = true;
			offset.value = dragBase;
		}
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerEnd);
		window.addEventListener('pointercancel', onPointerEnd);
	}

	function onPointerMove(event: PointerEvent) {
		if (!pointerStart || event.pointerId !== pointerStart.id) return;
		const dx = event.clientX - pointerStart.x;
		const dy = event.clientY - pointerStart.y;
		if (!isDragging.value) {
			if (Math.abs(dx) < DRAG_START_PX) return;
			// Mostly vertical: the user is scrolling the sidebar, not swiping the card.
			if (Math.abs(dx) < Math.abs(dy)) {
				stopPointerTracking();
				return;
			}
			isDragging.value = true;
			suppressNextClick = true;
		}
		offset.value = dragBase + dx;
		recordSample(event.clientX, event.timeStamp);
	}

	function onPointerEnd(event: PointerEvent) {
		if (!pointerStart || event.pointerId !== pointerStart.id) return;
		const velocity = releaseVelocity();
		const wasDragging = isDragging.value;
		const x = offset.value;
		stopPointerTracking();
		if (!wasDragging) return;
		const flicked = Math.abs(velocity) > FLICK_VELOCITY && Math.abs(x) >= MIN_FLICK_DISTANCE_PX;
		if (Math.abs(x) > threshold() || flicked) {
			dismiss((velocity || x) < 0 ? -1 : 1, velocity);
		} else {
			settleBack(velocity);
		}
	}

	function onWheelIdle() {
		wheelLockedUntilIdle = false;
		samples = [];
		// The trackpad stream has died out, so there is no release velocity to carry.
		if (isDragging.value && !isLeaving.value) settleBack();
	}

	function onWheel(event: WheelEvent) {
		// Vertical deltas scroll the sidebar as usual.
		if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
		// Horizontal deltas belong to the card, and must not become browser history navigation.
		event.preventDefault();
		clearTimeout(wheelIdleTimer);
		wheelIdleTimer = setTimeout(onWheelIdle, WHEEL_IDLE_MS);
		if (isLeaving.value || wheelLockedUntilIdle) return;
		if (!isDragging.value) {
			offset.value = catchSettling();
			samples = [];
			isDragging.value = true;
		}
		// With natural scrolling, fingers moving right report a negative deltaX.
		offset.value -= event.deltaX;
		recordSample(offset.value, event.timeStamp);
		if (Math.abs(offset.value) > threshold()) {
			wheelLockedUntilIdle = true;
			dismiss(offset.value < 0 ? -1 : 1, releaseVelocity());
		}
	}

	function onClickCapture(event: MouseEvent) {
		if (!suppressNextClick) return;
		suppressNextClick = false;
		event.preventDefault();
		event.stopPropagation();
	}

	onScopeDispose(() => {
		stopPointerTracking();
		clearTimeout(wheelIdleTimer);
	});

	return {
		style,
		progress,
		isDragging,
		isSettling,
		isLeaving,
		dismiss,
		onPointerDown,
		onWheel,
		onClickCapture,
	};
}
