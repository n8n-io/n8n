import { defineSpecies } from '../species.types';

export const minnow = defineSpecies({
	id: 'minnow',
	kinds: ['workflow'],
	sizeTiers: ['tiny'],
	motion: 'swim',
	frameRate: 6,
	mouthRow: 2,
	sprite: {
		palette: { o: '#2b4a6b', b: '#9ec9e8', l: '#e3f2fb', e: '#10202e', f: '#5b8fbf' },
		frames: [
			[
				'.....ooo..', //
				'f..obbbbo.',
				'ffobbbbbeo',
				'f..ollllo.',
				'.....ooo..',
			],
			[
				'.....ooo..', //
				'.f.obbbbo.',
				'.fobbbbbeo',
				'.f.ollllo.',
				'.....ooo..',
			],
		],
	},
});
