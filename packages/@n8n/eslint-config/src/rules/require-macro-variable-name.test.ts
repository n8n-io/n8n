import { RuleTester } from '@typescript-eslint/rule-tester';
import { RequireMacroVariableNameRule } from './require-macro-variable-name.js';

const ruleTester = new RuleTester();

const filename = '/repo/src/Component.vue';

const error = (macroName: string, variableName: string) => ({
	messageId: 'requireName' as const,
	data: { macroName, variableName },
});

ruleTester.run('require-macro-variable-name', RequireMacroVariableNameRule, {
	valid: [
		{ code: 'const props = defineProps();', filename },
		{ code: 'const props = withDefaults(defineProps(), {});', filename },
		{ code: 'const emit = defineEmits();', filename },
		{ code: 'const slots = defineSlots();', filename },
		{ code: 'const slots = useSlots();', filename },
		{ code: 'const attrs = useAttrs();', filename },
		{ name: 'a call without assignment', code: 'defineProps();', filename },
		{ name: 'a destructured result', code: 'const { a } = defineProps();', filename },
		{ name: 'an unrelated call', code: 'const value = compute();', filename },
		{ name: 'a non-SFC file', code: 'const p = defineProps();', filename: '/repo/src/util.ts' },
	],
	invalid: [
		{ code: 'const p = defineProps();', filename, errors: [error('defineProps', 'props')] },
		{
			code: 'const p = withDefaults(defineProps(), {});',
			filename,
			errors: [error('defineProps', 'props')],
		},
		{ code: 'const emits = defineEmits();', filename, errors: [error('defineEmits', 'emit')] },
		{ code: 'const s = defineSlots();', filename, errors: [error('defineSlots', 'slots')] },
		{ code: 'const $slots = useSlots();', filename, errors: [error('useSlots', 'slots')] },
		{ code: 'const a = useAttrs();', filename, errors: [error('useAttrs', 'attrs')] },
	],
});
