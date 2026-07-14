import { onBeforeUnmount } from 'vue';

import type { XY } from '../canvas-geometry';

const TWEEN_DURATION = 260;
/** Extra slack before the watchdog snaps a tween to its target. */
const WATCHDOG_SLACK = 120;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

interface Tween {
	id: string;
	from: XY;
	to: XY;
	t0: number;
	done?: () => void;
	watchdog: ReturnType<typeof setTimeout>;
}

/**
 * Position tween engine (~260ms cubic ease-out) over an external position map. Every
 * tween gets a completion watchdog: a timeout at duration + slack that snaps to the
 * target and fires the callback in case the rAF loop is throttled to a standstill
 * (background/embedded tabs), which would otherwise leave moves half-applied.
 */
export function useCanvasTweens(options: {
	getPos: (id: string) => XY | undefined;
	setPos: (id: string, pos: XY) => void;
	onFrame: () => void;
}) {
	const { getPos, setPos, onFrame } = options;

	let tweens: Tween[] = [];
	let rafId: number | null = null;
	const reducedMotion =
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function finishTween(tween: Tween) {
		clearTimeout(tween.watchdog);
		setPos(tween.id, { ...tween.to });
	}

	function step(now: number) {
		const finished: Tween[] = [];
		tweens = tweens.filter((tween) => {
			const t = Math.min(1, (now - tween.t0) / TWEEN_DURATION);
			const k = easeOut(t);
			setPos(tween.id, {
				x: tween.from.x + (tween.to.x - tween.from.x) * k,
				y: tween.from.y + (tween.to.y - tween.from.y) * k,
			});
			if (t >= 1) {
				finished.push(tween);
				return false;
			}
			return true;
		});
		onFrame();
		for (const tween of finished) {
			clearTimeout(tween.watchdog);
			tween.done?.();
		}
		rafId = tweens.length > 0 ? requestAnimationFrame(step) : null;
	}

	function tweenPos(id: string, to: XY, done?: () => void) {
		cancelTween(id);
		const from = getPos(id);
		if (!from || reducedMotion) {
			setPos(id, { ...to });
			onFrame();
			done?.();
			return;
		}
		const tween: Tween = {
			id,
			from: { ...from },
			to: { ...to },
			t0: performance.now(),
			done,
			watchdog: setTimeout(() => {
				if (!tweens.includes(tween)) return;
				tweens = tweens.filter((t) => t !== tween);
				finishTween(tween);
				onFrame();
				tween.done?.();
			}, TWEEN_DURATION + WATCHDOG_SLACK),
		};
		tweens.push(tween);
		if (rafId === null) rafId = requestAnimationFrame(step);
	}

	/** Where the entity will settle: tween target if animating, else current position. */
	function targetPos(id: string): XY | undefined {
		const tween = tweens.find((t) => t.id === id);
		return tween ? tween.to : getPos(id);
	}

	function cancelTween(id: string) {
		const existing = tweens.find((t) => t.id === id);
		if (existing) clearTimeout(existing.watchdog);
		tweens = tweens.filter((t) => t.id !== id);
	}

	onBeforeUnmount(() => {
		for (const tween of tweens) clearTimeout(tween.watchdog);
		tweens = [];
		if (rafId !== null) cancelAnimationFrame(rafId);
	});

	return { tweenPos, targetPos, cancelTween };
}
