import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { ElDatePicker, ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus';
import { preprocessCSS, resolveConfig } from 'vite';
import { defineComponent, ref } from 'vue';

/**
 * Read the last `display` declaration for `element::-webkit-scrollbar`.
 * jsdom does not implement `getComputedStyle(element, pseudoElement)`.
 */
function getWebkitScrollbarDisplay(element: HTMLElement, sheet: CSSStyleSheet): string {
	let display = '';

	const visitRules = (rules: CSSRuleList) => {
		for (const rule of rules) {
			if (rule instanceof CSSStyleRule) {
				const ruleDisplay = rule.style.getPropertyValue('display').trim();
				if (!ruleDisplay) continue;

				for (const rawSelector of rule.selectorText.split(',')) {
					const selector = rawSelector.trim();
					if (!selector.endsWith('::-webkit-scrollbar')) continue;
					const baseSelector = selector.slice(0, -'::-webkit-scrollbar'.length).trim();
					if (!baseSelector) continue;

					try {
						if (element.matches(baseSelector)) {
							display = ruleDisplay;
						}
					} catch {
						// Ignore selectors unsupported by jsdom's selector engine.
					}
				}
			} else if ('cssRules' in rule) {
				visitRules((rule as CSSGroupingRule).cssRules);
			}
		}
	};

	visitRules(sheet.cssRules);
	return display;
}

describe('Element Plus scrollbar styles', () => {
	const packageRoot = process.cwd();
	const themeFile = resolve(packageRoot, 'src/css/index.scss');
	let themeStyle: HTMLStyleElement | null = null;

	beforeAll(async () => {
		const config = await resolveConfig(
			{
				configFile: false,
				root: packageRoot,
				logLevel: 'silent',
			},
			'serve',
		);
		const { code } = await preprocessCSS(readFileSync(themeFile, 'utf8'), themeFile, config);
		themeStyle = document.createElement('style');
		themeStyle.textContent = code;
		document.head.append(themeStyle);
	}, 60_000);

	afterAll(() => {
		themeStyle?.remove();
		themeStyle = null;
	});

	it('hides the native scrollbar in ElDropdown scroll areas', async () => {
		const host = defineComponent({
			components: { ElDropdown, ElDropdownItem, ElDropdownMenu },
			template: `
				<ElDropdown trigger="click" :teleported="false">
					<button type="button">Open menu</button>
					<template #dropdown>
						<ElDropdownMenu>
							<ElDropdownItem v-for="index in 12" :key="index">
								Item {{ index }}
							</ElDropdownItem>
						</ElDropdownMenu>
					</template>
				</ElDropdown>
			`,
		});

		const { container, getByRole } = render(host);
		await userEvent.click(getByRole('button', { name: 'Open menu' }));

		const wrap = await waitFor(() => {
			const el = container.querySelector<HTMLElement>('.el-dropdown__popper .el-scrollbar__wrap');
			expect(el).not.toBeNull();
			return el!;
		});

		expect(wrap).toHaveClass('el-scrollbar__wrap--hidden-default');
		expect(getComputedStyle(wrap).getPropertyValue('scrollbar-width').trim()).toBe('none');
		expect(getWebkitScrollbarDisplay(wrap, themeStyle!.sheet!)).toBe('none');
	});

	it('hides the native scrollbar in ElDatePicker datetime spinners', async () => {
		const host = defineComponent({
			components: { ElDatePicker },
			setup() {
				const value = ref(new Date(2026, 0, 15, 10, 30, 0));
				return { value };
			},
			template: '<ElDatePicker v-model="value" type="datetime" :teleported="false" />',
		});

		const { container } = render(host);
		const pickerInput = container.querySelector<HTMLInputElement>('.el-date-editor input');
		expect(pickerInput).not.toBeNull();
		await userEvent.click(pickerInput!);

		const timeInput = await waitFor(() => {
			const inputs = container.querySelectorAll<HTMLInputElement>(
				'.el-date-picker__time-header input',
			);
			expect(inputs.length).toBeGreaterThanOrEqual(2);
			return inputs[1];
		});
		await userEvent.click(timeInput);

		const spinnerWraps = await waitFor(() => {
			const wraps = container.querySelectorAll<HTMLElement>(
				'.el-time-spinner__wrapper .el-scrollbar__wrap',
			);
			expect(wraps.length).toBeGreaterThanOrEqual(2);
			return wraps;
		});

		for (const wrap of spinnerWraps) {
			expect(wrap).toHaveClass('el-scrollbar__wrap--hidden-default');
			expect(getComputedStyle(wrap).getPropertyValue('scrollbar-width').trim()).toBe('none');
			expect(getWebkitScrollbarDisplay(wrap, themeStyle!.sheet!)).toBe('none');
		}
	});

	it('preserves the native scrollbar when the hidden-default modifier is absent', () => {
		const host = defineComponent({
			template: '<div class="el-scrollbar"><div class="el-scrollbar__wrap"></div></div>',
		});

		const { container } = render(host);
		const wrap = container.querySelector<HTMLElement>('.el-scrollbar__wrap');
		expect(wrap).not.toBeNull();
		expect(wrap).not.toHaveClass('el-scrollbar__wrap--hidden-default');
		expect(getComputedStyle(wrap!).getPropertyValue('scrollbar-width').trim()).not.toBe('none');
		expect(getWebkitScrollbarDisplay(wrap!, themeStyle!.sheet!)).not.toBe('none');
	});
});
