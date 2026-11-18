import { GLITCH_STAGES, glitchStageAt, shimmerProgressAt } from './glitch';

describe('glitchStageAt', () => {
	it('shows the four glitch stages at the start of each cycle, then nothing', () => {
		expect([0, 0.1, 0.19, 0.28].map((age) => glitchStageAt(age, 1.6))).toEqual([
			GLITCH_STAGES.jump,
			GLITCH_STAGES.scrambled,
			GLITCH_STAGES.scrambledAgain,
			GLITCH_STAGES.tinted,
		]);
		expect(glitchStageAt(0.8, 1.6)).toBe(-1);
	});

	it('shows the normal sprite most of the time', () => {
		const ages = Array.from({ length: 1_000 }, (_, i) => i * 0.03);
		const glitching = ages.filter((age) => glitchStageAt(age, 1.6) >= 0).length;

		expect(glitching / ages.length).toBeLessThan(0.4);
	});
});

describe('shimmerProgressAt', () => {
	it('sweeps from 0 to 1, then waits for the next wave', () => {
		const seed = 0;
		expect(shimmerProgressAt(0, seed)).toBe(0);
		expect(shimmerProgressAt(0.35, seed)).toBeCloseTo(0.5);
		expect(shimmerProgressAt(1, seed)).toBe(-1);
	});

	it('gives each creature its own timing', () => {
		expect(shimmerProgressAt(0, 0)).not.toBe(shimmerProgressAt(0, 37));
	});
});
