import { defineSpecies } from '../species.types';

export const angelfish = defineSpecies({
	id: 'angelfish',
	kinds: ['workflow'],
	sizeTiers: ['medium'],
	motion: 'swim',
	frameRate: 4,
	mouthRow: 5,
	sprite: {
		palette: {
			o: '#3d3410',
			b: '#ffd84a',
			d: '#2f6fd6',
			w: '#ffffff',
			e: '#111111',
			f: '#f2a93b',
		},
		frames: [
			[
				'.......f.....',
				'......ff.....',
				'.....offoo...',
				'f...obdbbbo..',
				'ff.obbdbbbbo.',
				'fffobbdbbbweo',
				'ff.obbdbbbbbo',
				'f...obdbbbbo.',
				'.....offoo...',
				'......ff.....',
				'.......f.....',
			],
			[
				'......f......',
				'......ff.....',
				'.....offoo...',
				'....obdbbbo..',
				'.f.obbdbbbbo.',
				'.ffobbdbbbweo',
				'.f.obbdbbbbbo',
				'....obdbbbbo.',
				'.....offoo...',
				'......ff.....',
				'......f......',
			],
		],
	},
});
