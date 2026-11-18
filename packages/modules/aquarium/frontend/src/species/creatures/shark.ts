import { defineSpecies } from '../species.types';

export const shark = defineSpecies({
	id: 'shark',
	kinds: ['workflow'],
	sizeTiers: ['large'],
	motion: 'swim',
	frameRate: 3,
	mouthRow: 6,
	sprite: {
		palette: { o: '#2e3a46', b: '#7d8fa1', l: '#e6ecf1', e: '#0b0f14' },
		frames: [
			[
				'..........o...........',
				'.........oo...........',
				'o.......obo...........',
				'oo....ooobbooooooo....',
				'.oo.oobbbbbbbbbbbbboo.',
				'..oobbbbbbbbbbbbbbbbeo',
				'.oo.ollllllllllllllloo',
				'oo....oolllloooooooo..',
				'o.......o.o...........',
			],
			[
				'..........o...........',
				'.........oo...........',
				'........obo...........',
				'.o....ooobbooooooo....',
				'.oo.oobbbbbbbbbbbbboo.',
				'..oobbbbbbbbbbbbbbbbeo',
				'.oo.ollllllllllllllloo',
				'.o....oolllloooooooo..',
				'........o.o...........',
			],
		],
	},
});
