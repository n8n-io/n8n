/**
 * Damped spring motion. One spring config drives several animations, so they share
 * the same feel. JavaScript animations use `animateSpring`. CSS transitions use the
 * `linear()` easing from `springToCssEasing`.
 */

export type SpringConfig = {
	stiffness: number;
	damping: number;
	mass: number;
};

/** Slightly underdamped (damping ratio 0.9): quick, with a very small settle */
export const LIST_SPRING: SpringConfig = { stiffness: 400, damping: 36, mass: 1 };

// Physics substep. Small steps keep the integration stable for stiff springs.
const STEP_SECONDS = 1 / 240;
// Large frame gaps (for example a background tab) do not make the spring jump
const MAX_FRAME_SECONDS = 1 / 30;
const MAX_SIMULATION_SECONDS = 2;

type SpringState = { position: number; velocity: number };

function stepSpring(state: SpringState, target: number, config: SpringConfig, dt: number) {
	const springForce = -config.stiffness * (state.position - target);
	const dampingForce = -config.damping * state.velocity;
	const acceleration = (springForce + dampingForce) / config.mass;
	// Semi-implicit Euler: update velocity first, then position
	state.velocity += acceleration * dt;
	state.position += state.velocity * dt;
}

function isSettled(state: SpringState, target: number, precision: number) {
	return Math.abs(state.position - target) < precision && Math.abs(state.velocity) < precision * 10;
}

export type SpringAnimation = {
	/** Current position and velocity, to continue from when the target changes */
	getState: () => SpringState;
	/** Stops the animation without calling onComplete */
	cancel: () => void;
};

export function animateSpring({
	from,
	to,
	velocity = 0,
	config = LIST_SPRING,
	precision = 0.5,
	onUpdate,
	onComplete,
}: {
	from: number;
	to: number;
	velocity?: number;
	config?: SpringConfig;
	/** Distance from the target, in the same unit as the values, that counts as settled */
	precision?: number;
	onUpdate: (position: number) => void;
	onComplete?: () => void;
}): SpringAnimation {
	const state: SpringState = { position: from, velocity };
	let frame: number | undefined;
	let lastTime: number | undefined;

	const tick = (time: number) => {
		const elapsed = lastTime === undefined ? 0 : (time - lastTime) / 1000;
		lastTime = time;

		let remaining = Math.min(elapsed, MAX_FRAME_SECONDS);
		while (remaining > 0) {
			const dt = Math.min(STEP_SECONDS, remaining);
			stepSpring(state, to, config, dt);
			remaining -= dt;
		}

		if (isSettled(state, to, precision)) {
			state.position = to;
			state.velocity = 0;
			onUpdate(to);
			frame = undefined;
			onComplete?.();
			return;
		}

		onUpdate(state.position);
		frame = requestAnimationFrame(tick);
	};

	onUpdate(from);
	frame = requestAnimationFrame(tick);

	return {
		getState: () => ({ ...state }),
		cancel: () => {
			if (frame !== undefined) cancelAnimationFrame(frame);
			frame = undefined;
		},
	};
}

/**
 * Samples the spring from 0 to 1 as a CSS `linear()` easing, with the time the spring
 * takes to settle. Use both values together in a CSS transition.
 */
export function springToCssEasing(config: SpringConfig = LIST_SPRING) {
	const SAMPLE_SECONDS = 1 / 60;
	const state: SpringState = { position: 0, velocity: 0 };
	const samples = [0];
	let time = 0;

	while (time < MAX_SIMULATION_SECONDS) {
		let remaining = SAMPLE_SECONDS;
		while (remaining > 0) {
			const dt = Math.min(STEP_SECONDS, remaining);
			stepSpring(state, 1, config, dt);
			remaining -= dt;
		}
		time += SAMPLE_SECONDS;
		samples.push(state.position);
		if (isSettled(state, 1, 0.001)) break;
	}
	samples[samples.length - 1] = 1;

	return {
		easing: `linear(${samples.map((sample) => Number(sample.toFixed(4))).join(', ')})`,
		durationMs: Math.round(time * 1000),
	};
}
