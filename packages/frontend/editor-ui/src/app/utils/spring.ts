export interface SpringOptions {
	/** Value at the start. */
	from: number;
	/** Value at rest. */
	to: number;
	/** Velocity at the start, in value units per second. Carries a gesture into the motion. */
	velocity?: number;
	/** Seconds the spring takes to reach the rest value. Lower is snappier. */
	response?: number;
	/** 1 settles without an overshoot. Below 1 the spring rebounds, more the lower it is. */
	dampingRatio?: number;
	/** The spring is at rest once both the distance and the speed are inside this. */
	restDelta?: number;
}

export interface SpringSamples {
	/** The value at each frame, starting at `from` and ending exactly at `to`. */
	values: number[];
	/** Milliseconds between two samples. */
	frameMs: number;
	/** Milliseconds from the first sample to the last. */
	duration: number;
}

const FRAME_MS = 1000 / 60;
const MAX_DURATION_MS = 1500;

/**
 * Samples a damped spring at 60fps, for use as linear WAAPI keyframes. The
 * parameters follow Apple's response / damping ratio model, which is easier
 * to tune than stiffness and mass: `response` sets how fast, `dampingRatio`
 * sets how bouncy.
 */
export function sampleSpring({
	from,
	to,
	velocity = 0,
	response = 0.4,
	dampingRatio = 1,
	restDelta = 0.1,
}: SpringOptions): SpringSamples {
	const zeta = Math.min(1, Math.max(0.05, dampingRatio));
	const omega = (2 * Math.PI) / Math.max(0.01, response);
	const x0 = from - to;
	const values = [from];

	if (x0 === 0 && velocity === 0) {
		return { values, frameMs: FRAME_MS, duration: 0 };
	}

	const restVelocity = restDelta * 60;

	for (let t = FRAME_MS; t <= MAX_DURATION_MS; t += FRAME_MS) {
		const s = t / 1000;
		let x: number;
		let v: number;
		if (zeta < 1) {
			const omegaD = omega * Math.sqrt(1 - zeta * zeta);
			const decay = Math.exp(-zeta * omega * s);
			const b = (velocity + zeta * omega * x0) / omegaD;
			const cos = Math.cos(omegaD * s);
			const sin = Math.sin(omegaD * s);
			x = decay * (x0 * cos + b * sin);
			v = decay * ((b * omegaD - x0 * zeta * omega) * cos - (x0 * omegaD + b * zeta * omega) * sin);
		} else {
			const decay = Math.exp(-omega * s);
			const c = velocity + omega * x0;
			x = decay * (x0 + c * s);
			v = decay * (c - omega * (x0 + c * s));
		}
		values.push(to + x);
		if (Math.abs(x) < restDelta && Math.abs(v) < restVelocity) break;
	}

	values[values.length - 1] = to;
	return { values, frameMs: FRAME_MS, duration: (values.length - 1) * FRAME_MS };
}
