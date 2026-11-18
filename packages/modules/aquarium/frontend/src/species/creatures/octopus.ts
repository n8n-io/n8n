import { defineSpecies } from '../species.types';

export const octopus = defineSpecies({
	id: 'octopus',
	kinds: ['agent'],
	sizeTiers: ['large', 'huge'],
	motion: 'drift',
	frameRate: 2,
	sprite: {
		palette: { o: '#3b1f5c', b: '#9b6bd6', l: '#c9a8f0', w: '#ffffff', e: '#140a20' },
		frames: [
			[
				'....oooooo....',
				'...oblbbbbo...',
				'..oblbbbbbbo..',
				'..obbbbbbbbo..',
				'..obwebbwebo..',
				'..obbbbbbbbo..',
				'...obbbbbbo...',
				'..obbbbbbbbo..',
				'.ob.ob..bo.bo.',
				'.ob.ob..bo.bo.',
				'ob..ob..bo..bo',
				'ob.ob....bo.bo',
				'.o.o......o.o.',
			],
			[
				'..............',
				'....oooooo....',
				'...oblbbbbo...',
				'..oblbbbbbbo..',
				'..obwebbwebo..',
				'..obbbbbbbbo..',
				'...obbbbbbo...',
				'..obbbbbbbbo..',
				'..obobo.obobo.',
				'.ob.ob..bo.bo.',
				'.ob..ob.bo.bo.',
				'..ob.ob..bo.ob',
				'...o..o...o..o',
			],
		],
	},
});
