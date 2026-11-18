import type { PixelSprite } from '../species/species.types';

/** Background scenery. The renderer paints it into the cached water, so it costs nothing each frame. */
export interface ScenerySprite {
	sprite: PixelSprite;
	/** Palette keys that glow: the water does not fade them. */
	glow?: readonly string[];
}

/** Branching coral, sea fan, brain coral and tube sponges, in the creature style. */
export const CORALS: ScenerySprite[] = [
	{
		sprite: {
			palette: {
				h: '#ffb3c1',
				b: '#f06e8c',
				d: '#b8436a',
				m: '#011113',
			},
			frames: [
				[
					'..m......m...m..',
					'.mhm..m.mhm.mhm.',
					'.mbm.mhmmbm.mbm.',
					'.mbm.mbmmbdmbdm.',
					'.mbbmmbmhbmmbm..',
					'..mbmmbhbdmbdm..',
					'..mbdmbbdmmbm...',
					'...mbhbdmmbdm...',
					'...mbbbmmbdm....',
					'....mbbbbdm.....',
					'.....mbbdm......',
					'.....mbbdm......',
					'....mbbbddm.....',
					'.....mmmmm......',
				],
			],
		},
	},
	{
		sprite: {
			palette: {
				h: '#e3a8ff',
				b: '#b06ad9',
				d: '#7a3fa6',
				m: '#011113',
			},
			frames: [
				[
					'.....mmmmm.....',
					'...mmhhbbbmm...',
					'..mhbmbmbmbdm..',
					'.mhbmbbmbbmbdm.',
					'.mbmbmbmbmbmdm.',
					'.mbbbbbbbbbbdm.',
					'..mbmbmbmbmdm..',
					'..mbbbbbbbbdm..',
					'...mbmbmbmdm...',
					'....mbbbbdm....',
					'.....mmbmm.....',
					'......mbm......',
					'.....mbbdm.....',
					'......mmm......',
				],
			],
		},
	},
	{
		sprite: {
			palette: {
				h: '#e6f08a',
				b: '#b7cf4f',
				d: '#7f9a2e',
				m: '#011113',
			},
			frames: [
				[
					'.....mmmmm......',
					'...mmhhhbbmm....',
					'..mhhbdddbbbm...',
					'.mhbdbbbdbdbbm..',
					'mhbbdbdddbbdbdm.',
					'mbdbbbdbbbdbbbdm',
					'mbbdddbbdddbdbdm',
					'mdbbbddbbbbdddm.',
					'.mmmmmmmmmmmmm..',
				],
			],
		},
	},
	{
		sprite: {
			palette: {
				h: '#ffc27a',
				b: '#f08a3c',
				d: '#b85a24',
				o: '#5a2a14',
				m: '#011113',
			},
			frames: [
				[
					'..mmm........',
					'.mhohm.mmm...',
					'.mbbdmmhohm..',
					'.mbbdmmbbdm..',
					'.mbbdhobbdm..',
					'.mbbdbbdbdm..',
					'.mbbdbbdbdm..',
					'.mbbdbbdbbdm.',
					'mbbbddbddbbdm',
					'.mmmmmmmmmmm.',
				],
			],
		},
	},
];

/** A big volcano for tall tanks. Made with a script, then kept as pixels. */
export const BIG_VOLCANO: ScenerySprite = {
	sprite: {
		palette: {
			h: '#52979e',
			b: '#0e7086',
			d: '#0a4f60',
			c: '#062636',
			l: '#f9ecb0',
			j: '#f6b728',
			r: '#e0631d',
			m: '#011113',
		},
		frames: [
			[
				'............................mmm.........mmm...............................',
				'..........................mmhhhmmmmmmmmmdddm..............................',
				'.........................mhhhhhllllllllldcccm.............................',
				'.........................mhhhhrrjjjjjjjrrdccm.............................',
				'..........................mhhhhjrbjrbdjrdcccm.............................',
				'..........................mhhhjrbjrbbjrdddcccm............................',
				'.........................mhhhhjrbbjrbdjrdddccm............................',
				'.........................mhhhhjrbbjrdbjrddcccm............................',
				'.........................mhhhjrbbbjrbjrddddcccm...........................',
				'.........................mhhjrbhbrdbbjrdddddcccm..........................',
				'........................mhhhjrhbrdbbbbjrdddddcccm.........................',
				'.......................mhhhhjrbbrdbbbbdjrdddcdccm.........................',
				'......................mhhhhhdjrbbrdbbdbdjrdddccccm........................',
				'.....................mhhhhhhjrbbbbbbbbdjrcddddccccm.......................',
				'.....................mhhhhhjrbbbbbbbbdrddddddddcccm.......................',
				'.....................mhhhhjrbhhbbbbbbbdrddddddccccm.......................',
				'....................mhhhhjrbhbdcbbbbbdbdrddddddccccm......................',
				'....................mhhhhjrhbbbbbbbbbbdrddddddcdcccm......................',
				'....................mhhhhrdbhbbbbbbbbdbdrddddddccccm......................',
				'....................mhhhrdhhdcbbbbbbbbdbrdddddddccccmm....................',
				'..................mmhhhrdhhbhbbbbbbbbbbdbrdddddddcdcccm...................',
				'.................mhhhhhrdhbhbbbbbbbbbbdbddddddddddccccmm..................',
				'................mhhhhhrdhbhbbbbbbbbbbbbdbddddddddddcccccmm................',
				'...............mhhhhhhhrdhbhbbbbbbbbbbbbdbddddddbddbddccccm...............',
				'..............mmhhhhhhrdhbhbbbhbbbbbbbbbbdbddddddcddccdccccm..............',
				'.............mhhhhhhhrdhbhbbbbdcbbbbbbbbdbddddddddddcdcccccm..............',
				'............mhhhhhhhrdhbhbbbbbbbbbbbbbbdbddddddddddddcdcccccm.............',
				'...........mhhhhhhhrdhbhbbbbbbbbbbbbbbbbdbddddddddddddcdcccccm............',
				'............mhhhhhhhhhhbhbbbbbbbbbbbbbbdbdbddddddddddddcdccccm............',
				'............mhhhhhhhhhhhbhbbbbbbbbbbbbbbdbddddddddddddcdccccmm............',
				'..........mmhhhhhhhhhhhbhbbbbbbbbbbbbbbdbdbddddddddddddcdcccccm...........',
				'.........mhhhhhhhhhhhhbhbbbbbbbbbbbbbbbbdbddddddddddddddcdcccccm..........',
				'........mhhhhhhhhhhhhbhbbbbbbbbbbbbbbbbdbdbddddddddddddddcdcccccm.........',
				'.......mmhhhhhhhhhhhbhbhbbbbbbbbbbbbbbbbdbdbddddddddddddddcdcccccmmm......',
				'....mmmhhhhhhhhhhhhbhbhbbbbbbbbbbbbbbbbbbdbdbddddddddddddddcdcdcccccmmm...',
				'..mmhhhhhhhhhhhhhhbhbhbbbbbbbbbbbbbbbbbbbbdcddddddddddddddddddcdcccccccm..',
				'.mhhhhhhhhhhhhhhhbhbhbbbbbbbbbbbbbbbbbbbbdbdbddddddddddddddddcdcdccccccmm.',
				'.mhhhhhhhhhhhhhhbhbhbbbbbbbbbbbbbbbbbbbbbbdcdbddddddddddddddddddcdcccccccm',
				'.mhhhhhhhhhhhhhhhbhbhbbbbbbbbbbbbbbbbbbbbdbdbddddddddddddddddddcdcdccccccm',
				'.mhhhhhhhhhhhhhhbhbhbbbbbbbbbbbbbbbbbbbbbbdbdbddddddddddddddddddcdcccccccm',
				'mhhhhhhhhhhhhhhhhbhbhbbbbbbbbbbbbbbbbbbbbdbdbddddddddddddddddddcdcdccccccm',
				'.mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm.',
			],
		],
	},
	glow: ['l', 'j', 'r'],
};

/** The middle of the lava in the crater of `BIG_VOLCANO`, in sprite pixels. */
export const BIG_VOLCANO_CRATER = { x: 35, y: 2 } as const;
