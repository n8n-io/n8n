import { defineSpecies } from '../species.types';

export const tetra = defineSpecies({
	id: 'tetra',
	kinds: ['workflow'],
	sizeTiers: ['small'],
	motion: 'swim',
	frameRate: 5,
	mouthRow: 3,
	sprite: {
		palette: { o: '#6b2a0e', b: '#ff8a3d', w: '#fff6ec', e: '#1a0d06', f: '#e2662a' },
		frames: [
			[
				'.....oooo...',
				'f...obwbbbo.',
				'ff.obbwbbweo',
				'fffobbwbbwbo',
				'ff.obbwbbwo.',
				'f...obwbbo..',
				'.....oooo...',
			],
			[
				'.....oooo...',
				'....obwbbbo.',
				'.f.obbwbbweo',
				'.ffobbwbbwbo',
				'.f.obbwbbwo.',
				'....obwbbo..',
				'.....oooo...',
			],
		],
	},
});
