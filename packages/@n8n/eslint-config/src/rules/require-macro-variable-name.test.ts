import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll } from 'vitest';
import { isScriptSetupBlock, RequireMacroVariableNameRule } from './require-macro-variable-name.js';

const ruleTester = new RuleTester();

// The rule reads the SFC from disk, as Oxlint gives it only one script block.
const dir = mkdtempSync(join(tmpdir(), 'require-macro-variable-name-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let count = 0;
/** Writes an SFC whose `<script setup>` holds `code`, and returns a test case for that block. */
const setup = (code: string) => {
	const filename = join(dir, `Component${count++}.vue`);
	writeFileSync(
		filename,
		`<script setup lang="ts">\n${code}\n</script>\n<template><div /></template>\n`,
	);
	return { code, filename };
};

/** Writes an SFC whose plain `<script>` holds `code`, and returns a test case for that block. */
const plain = (code: string) => {
	const filename = join(dir, `Component${count++}.vue`);
	writeFileSync(
		filename,
		`<script lang="ts">\n${code}\n</script>\n<script setup lang="ts">\nconst props = defineProps();\n</script>\n`,
	);
	return { code, filename };
};

const error = (macroName: string, variableName: string) => ({
	messageId: 'requireName' as const,
	data: { macroName, variableName },
});

ruleTester.run('require-macro-variable-name', RequireMacroVariableNameRule, {
	valid: [
		setup('const props = defineProps();'),
		setup('const props = withDefaults(defineProps(), {});'),
		setup('const emit = defineEmits();'),
		setup('const slots = defineSlots();'),
		setup('const slots = useSlots();'),
		setup('const attrs = useAttrs();'),
		{ name: 'a call without assignment', ...setup('defineProps();') },
		{ name: 'a destructured result', ...setup('const { a } = defineProps();') },
		{ name: 'an unrelated call', ...setup('const value = compute();') },
		{ name: 'a plain script block', ...plain('const s = useSlots();') },
		{ name: 'a non-SFC file', code: 'const p = defineProps();', filename: 'util.ts' },
	],
	invalid: [
		{ ...setup('const p = defineProps();'), errors: [error('defineProps', 'props')] },
		{
			...setup('const p = withDefaults(defineProps(), {});'),
			errors: [error('defineProps', 'props')],
		},
		{ ...setup('const emits = defineEmits();'), errors: [error('defineEmits', 'emit')] },
		{ ...setup('const s = defineSlots();'), errors: [error('defineSlots', 'slots')] },
		{ ...setup('const $slots = useSlots();'), errors: [error('useSlots', 'slots')] },
		{ ...setup('const a = useAttrs();'), errors: [error('useAttrs', 'attrs')] },
	],
});

describe('isScriptSetupBlock', () => {
	const sfc =
		'<script lang="ts">\nexport default {};\n</script>\n<script setup>\nconst a = 1;\n</script>';

	it('finds the setup block by its text', () => {
		expect(isScriptSetupBlock(sfc, 'const a = 1;\n')).toBe(true);
	});

	it('rejects a plain script block', () => {
		expect(isScriptSetupBlock(sfc, 'export default {};')).toBe(false);
	});
});
