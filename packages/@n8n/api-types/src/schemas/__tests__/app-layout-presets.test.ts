import { appLayoutSchema } from '../app-content.schema';
import { APP_LAYOUT_PRESET_IDS, APP_LAYOUT_PRESETS } from '../app-layout-presets';
import { appThemeSchema } from '../app.schema';

const FIXED_BLOCK_IDS = ['header', 'nav', 'slot', 'footer'];

describe('APP_LAYOUT_PRESETS', () => {
	test('has one preset per id, in the same order', () => {
		expect(APP_LAYOUT_PRESETS.map((preset) => preset.id)).toEqual([...APP_LAYOUT_PRESET_IDS]);
	});

	test.each(APP_LAYOUT_PRESETS.map((preset) => [preset.id, preset] as const))(
		'%s is a valid layout with a valid theme',
		(_id, preset) => {
			expect(appLayoutSchema.safeParse(preset.blocks)).toMatchObject({ success: true });
			expect(appThemeSchema.safeParse(preset.theme)).toMatchObject({ success: true });
			expect(preset.name).not.toBe('');
			expect(preset.description).not.toBe('');
		},
	);

	test.each(APP_LAYOUT_PRESETS.map((preset) => [preset.id, preset] as const))(
		'%s uses only the fixed block ids',
		(_id, preset) => {
			for (const block of preset.blocks) expect(FIXED_BLOCK_IDS).toContain(block.id);
		},
	);
});
