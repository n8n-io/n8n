import { CAT_OBSERVER } from '../aquarium.constants';
import {
	CAT_FRAMES,
	CAT_HEIGHT,
	CAT_WIDTH,
	catAlertSprite,
	catFrameAt,
	catPerchX,
	catSprite,
	catsThatFit,
	isBelowCat,
} from './cat';

describe('catSprite', () => {
	it.each([
		['cat', catSprite],
		['alert', catAlertSprite],
	])('%s uses only palette colours, and every frame has the same size', (_, sprite) => {
		const [first] = sprite.frames;
		for (const frame of sprite.frames) {
			expect(frame).toHaveLength(first?.length ?? 0);
			for (const row of frame) {
				expect(row).toHaveLength(first?.[0]?.length ?? 0);
				for (const char of row) if (char !== '.') expect(sprite.palette).toHaveProperty(char);
			}
		}
	});

	it('has a frame for each pose', () => {
		expect(catSprite.frames).toHaveLength(Object.keys(CAT_FRAMES).length);
	});
});

describe('catFrameAt', () => {
	it('blinks at the start of each blink cycle', () => {
		expect(catFrameAt(CAT_OBSERVER.blinkEverySeconds + 0.1, false)).toBe(CAT_FRAMES.blink);
	});

	it('twitches its tail now and then, and rests between twitches', () => {
		const ages = Array.from({ length: 200 }, (_, i) => 0.3 + i * 0.05);
		const poses = new Set(ages.map((age) => catFrameAt(age, false)));

		expect(poses).toContain(CAT_FRAMES.twitch);
		expect(poses).toContain(CAT_FRAMES.rest);
		expect(poses).not.toContain(CAT_FRAMES.pawTap);
	});

	it('taps the glass while its creature is below', () => {
		const poses = [0.1, 0.35].map((age) => catFrameAt(age, true));

		expect(poses).toEqual([CAT_FRAMES.twitch, CAT_FRAMES.pawTap]);
	});
});

describe('cat perches', () => {
	it('fits at least one cat on any tank', () => {
		expect(catsThatFit(10)).toBe(1);
		expect(catsThatFit(3 * (CAT_WIDTH + CAT_OBSERVER.gap))).toBe(3);
	});

	it('spreads the cats evenly and keeps them on the frame', () => {
		const width = 200;
		const perches = [0, 1, 2].map((index) => catPerchX(index, 3, width));

		expect(perches[0]).toBeGreaterThanOrEqual(0);
		expect((perches[2] ?? 0) + CAT_WIDTH).toBeLessThanOrEqual(width);
		expect((perches[1] ?? 0) - (perches[0] ?? 0)).toBe((perches[2] ?? 0) - (perches[1] ?? 0));
	});

	it('centres a single cat', () => {
		expect(catPerchX(0, 1, 100)).toBe(50 - CAT_WIDTH / 2);
	});

	it('knows when a creature is below the cat', () => {
		expect(isBelowCat({ x: 40, width: 10 }, 30)).toBe(true);
		expect(isBelowCat({ x: 100, width: 10 }, 30)).toBe(false);
		expect(CAT_HEIGHT).toBeGreaterThan(CAT_OBSERVER.overhang);
	});
});
