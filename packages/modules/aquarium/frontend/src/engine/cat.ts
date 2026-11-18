import { CAT_OBSERVER } from '../aquarium.constants';
import type { PixelSprite } from '../species/species.types';

/**
 * An orange tabby with a collar and a bell. It lies on the top of a tank frame, and its front
 * paws hang over the edge. It faces right, like the species sprites.
 */
export const catSprite: PixelSprite = {
	palette: {
		k: '#011113', // outline
		o: '#f49836', // fur
		d: '#bc6022', // stripes
		c: '#f7edca', // cream
		s: '#c9c2a4', // cream shadow
		p: '#f2a7a0', // inner ear
		r: '#c8283c', // collar
		b: '#f2cd61', // bell
		e: '#09090e', // eye
		w: '#ffffff', // eye light
		n: '#e0707a', // nose
	},
	frames: [
		// Resting, tail curled back.
		[
			'kk............k.............k...',
			'kodk.........kok...........kok..',
			'kook.........kpok.........kopk..',
			'.kodk........kppookkkkkkkkoppk..',
			'..kook.......kppoooodooodooppk..',
			'..kdok.......koooooodooodooook..',
			'...kookkkkkk.koooooooooooooook..',
			'....koododoookoooooooooooooook..',
			'....koodoodookooweoooooooweook..',
			'...kodoodoodokooeeoooooooeeook..',
			'..kodoodoodookoceeccccccceecck..',
			'..koooodoooookcccccccnccccccsk..',
			'..kooooodooookcccccckckcccccck..',
			'..kooooooooookscccccccccccccsk..',
			'..koooooccccokkrrrrrrbrrrrrrkk..',
			'..koooocckkkkkkcccckkbkkcccckk..',
			'...kscccck....kcccck...kcccck...',
			'....kkcssk....kcscck...kcscck...',
			'......kkk......kkkk.....kkkk....',
		],
		// Tail flicked forward.
		[
			'...kk.........k.............k...',
			'..kodk.......kok...........kok..',
			'.kook........kpok.........kopk..',
			'.kodk........kppookkkkkkkkoppk..',
			'..kook.......kppoooodooodooppk..',
			'..kdok.......koooooodooodooook..',
			'...kookkkkkk.koooooooooooooook..',
			'....koododoookoooooooooooooook..',
			'....koodoodookooweoooooooweook..',
			'...kodoodoodokooeeoooooooeeook..',
			'..kodoodoodookoceeccccccceecck..',
			'..koooodoooookcccccccnccccccsk..',
			'..kooooodooookcccccckckcccccck..',
			'..kooooooooookscccccccccccccsk..',
			'..koooooccccokkrrrrrrbrrrrrrkk..',
			'..koooocckkkkkkcccckkbkkcccckk..',
			'...kscccck....kcccck...kcccck...',
			'....kkcssk....kcscck...kcscck...',
			'......kkk......kkkk.....kkkk....',
		],
		// Blinking.
		[
			'kk............k.............k...',
			'kodk.........kok...........kok..',
			'kook.........kpok.........kopk..',
			'.kodk........kppookkkkkkkkoppk..',
			'..kook.......kppoooodooodooppk..',
			'..kdok.......koooooodooodooook..',
			'...kookkkkkk.koooooooooooooook..',
			'....koododoookoooooooooooooook..',
			'....koodoodookoooooooooooooook..',
			'...kodoodoodokoooooooooooooook..',
			'..kodoodoodookockkccccccckkcck..',
			'..koooodoooookcccccccnccccccsk..',
			'..kooooodooookcccccckckcccccck..',
			'..kooooooooookscccccccccccccsk..',
			'..koooooccccokkrrrrrrbrrrrrrkk..',
			'..koooocckkkkkkcccckkbkkcccckk..',
			'...kscccck....kcccck...kcccck...',
			'....kkcssk....kcscck...kcscck...',
			'......kkk......kkkk.....kkkk....',
		],
		// Tapping the glass with a front paw, tail up.
		[
			'...kk.........k.............k...',
			'..kodk.......kok...........kok..',
			'.kook........kpok.........kopk..',
			'.kodk........kppookkkkkkkkoppk..',
			'..kook.......kppoooodooodooppk..',
			'..kdok.......koooooodooodooook..',
			'...kookkkkkk.koooooooooooooook..',
			'....koododoookoooooooooooooook..',
			'....koodoodookooweoooooooweook..',
			'...kodoodoodokooeeoooooooeeook..',
			'..kodoodoodookoceeccccccceecck..',
			'..koooodoooookcccccccnccccccsk..',
			'..kooooodooookcccccckckcccccck..',
			'..kooooooooookscccccccccccccsk..',
			'..koooooccccokkrrrrrrbrkcccckk..',
			'..koooocckkkkkkcccckkbkkcscckk..',
			'...kscccck....kcccck....kkkk....',
			'....kkcssk....kcscck............',
			'......kkk......kkkk.............',
		],
	],
};

export const CAT_FRAMES = { rest: 0, twitch: 1, blink: 2, pawTap: 3 } as const;

export const CAT_WIDTH = catSprite.frames[0]?.[0]?.length ?? 0;
export const CAT_HEIGHT = catSprite.frames[0]?.length ?? 0;

/** Alert marks next to the head, for the right-facing cat. */
export const catAlertSprite: PixelSprite = {
	palette: { y: '#ffd84a' },
	frames: [['.y....', '.y..y.', '...y..', '......', '....yy']],
};

/** Where the alert marks start, in pixels of the right-facing cat: right of the ears. */
export const CAT_ALERT_OFFSET = { x: 30, y: 0 };

/**
 * The frame of a cat at `age`. While its creature is below it, the cat taps the glass and holds
 * its tail up. Else it blinks now and then and its tail twitches twice in each cycle.
 */
export function catFrameAt(age: number, creatureBelow: boolean): number {
	if (creatureBelow) {
		return Math.floor(age / CAT_OBSERVER.pawTapSeconds) % 2 ? CAT_FRAMES.pawTap : CAT_FRAMES.twitch;
	}
	if (age % CAT_OBSERVER.blinkEverySeconds < CAT_OBSERVER.blinkSeconds) return CAT_FRAMES.blink;
	const twitch = CAT_OBSERVER.twitchSeconds;
	const t = age % CAT_OBSERVER.twitchEverySeconds;
	return t < twitch || (t >= 2 * twitch && t < 3 * twitch) ? CAT_FRAMES.twitch : CAT_FRAMES.rest;
}

/** How many cats fit side by side on the frame of a tank. One always fits. */
export function catsThatFit(tankWidth: number): number {
	return Math.max(1, Math.floor(tankWidth / (CAT_WIDTH + CAT_OBSERVER.gap)));
}

/** Left edge of cat `index` of `count`, local to the tank. The cats spread evenly on the frame. */
export function catPerchX(index: number, count: number, tankWidth: number): number {
	return Math.round((tankWidth * (index + 1)) / (count + 1) - CAT_WIDTH / 2);
}

/** True when the middle of a creature is under the cat, local to the tank. */
export function isBelowCat(creature: { x: number; width: number }, catX: number): boolean {
	return Math.abs(creature.x + creature.width / 2 - (catX + CAT_WIDTH / 2)) < CAT_WIDTH / 2;
}
