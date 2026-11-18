import { defineSpecies } from '../species.types';

export const jellyfish = defineSpecies({
	id: 'jellyfish',
	kinds: ['agent'],
	sizeTiers: ['tiny', 'small', 'medium'],
	motion: 'drift',
	frameRate: 2,
	sprite: {
		palette: { o: '#8a3d8f', b: '#f2a7e8', l: '#fde3f8', t: '#d77fd0' },
		frames: [
			[
				'..ooooo..',
				'.obbbbbo.',
				'oblbbbbbo',
				'obbbbbbbo',
				'ooooooooo',
				'.t.t.t.t.',
				'.t.t.t.t.',
				't..t.t..t',
				't.t...t.t',
				'..t...t..',
			],
			[
				'.........',
				'...ooo...',
				'.oobbboo.',
				'oblbbbbbo',
				'ooooooooo',
				'.t.t.t.t.',
				'..t.t.t..',
				'.t.t.t.t.',
				'.t..t..t.',
				'..t...t..',
			],
		],
	},
});
