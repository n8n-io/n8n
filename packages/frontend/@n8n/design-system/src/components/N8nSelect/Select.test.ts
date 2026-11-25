import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import userEvent from '@testing-library/user-event';
import { render, waitFor, within } from '@testing-library/vue';
import { preprocessCSS, resolveConfig } from 'vite';
import { defineComponent, ref } from 'vue';

import N8nSelect from './Select.vue';
import { removeDynamicAttributes } from '../../utils';
import { insideDialogBodyKey } from '../N8nDialog/dialogContext';
import N8nOption from '../N8nOption/Option.vue';

describe('components', () => {
	describe('N8nSelect', () => {
		it('should render correctly', () => {
			const wrapper = render(N8nSelect, {
				global: {
					components: {
						'n8n-option': N8nOption,
					},
				},
				slots: {
					default: [
						'<n8n-option value="1">1</n8n-option>',
						'<n8n-option value="2">2</n8n-option>',
						'<n8n-option value="3">3</n8n-option>',
					],
				},
			});
			removeDynamicAttributes(wrapper.container);
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should update and remove ARIA attributes on the native combobox', async () => {
			const host = defineComponent({
				components: { N8nSelect },
				props: { controlAttrs: Object },
				template: '<N8nSelect id="project" filterable :teleported="false" v-bind="controlAttrs" />',
			});
			const { getByRole, rerender } = render(host, {
				props: {
					controlAttrs: {
						'aria-invalid': true,
						'aria-describedby': 'project-error',
						'aria-busy': true,
					},
				},
			});
			const input = getByRole('combobox');
			expect(input.tagName).toBe('INPUT');
			await waitFor(() => expect(input).toHaveAttribute('id', 'project'));
			expect(input).toHaveAttribute('aria-invalid', 'true');
			expect(input).toHaveAttribute('aria-describedby', 'project-error');
			expect(input).toHaveAttribute('aria-busy', 'true');

			await rerender({
				controlAttrs: {
					'aria-invalid': false,
					'aria-describedby': 'project-help',
					'aria-busy': false,
				},
			});
			expect(input).toHaveAttribute('aria-invalid', 'false');
			expect(input).toHaveAttribute('aria-describedby', 'project-help');
			expect(input).toHaveAttribute('aria-busy', 'false');

			await rerender({ controlAttrs: { 'aria-invalid': undefined, 'aria-describedby': null } });
			expect(input).not.toHaveAttribute('aria-invalid');
			expect(input).not.toHaveAttribute('aria-describedby');
			expect(input).not.toHaveAttribute('aria-busy');
		});

		it('should select an option', async () => {
			const n8nSelectTestComponent = defineComponent({
				props: {
					teleported: Boolean,
				},
				setup() {
					const options = ref(['1', '2', '3']);
					const selected = ref('');

					return {
						options,
						selected,
					};
				},
				template: `
					<n8n-select v-model="selected" :teleported="teleported">
						<n8n-option v-for="o in options" :key="o" :value="o" :label="o" />
					</n8n-select>
				`,
			});

			const { container } = render(n8nSelectTestComponent, {
				props: {
					teleported: false,
				},
				global: {
					components: {
						'n8n-select': N8nSelect,
						'n8n-option': N8nOption,
					},
				},
			});
			const getOption = (value: string) => within(container as HTMLElement).getByText(value);

			const textbox = container.querySelector('input')!;
			await userEvent.click(textbox);
			await waitFor(() => expect(getOption('1')).toBeVisible());
			await userEvent.click(getOption('1'));

			expect(textbox).toHaveValue('1');
		});

		it.each([
			{ insideDialogBody: true, teleported: false, popperOptions: undefined, position: 'fixed' },
			{
				insideDialogBody: false,
				teleported: false,
				popperOptions: undefined,
				position: 'absolute',
			},
			{ insideDialogBody: true, teleported: true, popperOptions: undefined, position: 'absolute' },
			{
				insideDialogBody: true,
				teleported: false,
				popperOptions: { strategy: 'absolute' as const },
				position: 'absolute',
			},
		])(
			'should position the dropdown as $position when inside dialog body is $insideDialogBody, teleported is $teleported and popperOptions is $popperOptions',
			async ({ insideDialogBody, teleported, popperOptions, position }) => {
				const { container } = render(N8nSelect, {
					props: { teleported, popperOptions },
					global: {
						components: { 'n8n-option': N8nOption },
						provide: { [insideDialogBodyKey]: insideDialogBody },
					},
					slots: { default: '<n8n-option value="1" label="1" />' },
				});

				await userEvent.click(container.querySelector('input')!);

				await waitFor(() =>
					expect(document.querySelector<HTMLElement>('.el-select__popper')?.style.position).toBe(
						position,
					),
				);
			},
		);

		describe('dropdown scrollbar', () => {
			// Regression tests for DS-745: N8nSelect renders its option list in ElScrollbar.
			// ElScrollbar draws a custom overlay scrollbar and adds `el-scrollbar__wrap--hidden-default`.
			// The theme stylesheet must hide the native scrollbar on that wrapper.
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

			async function renderOpenLongSelect() {
				const options = Array.from({ length: 12 }, (_, index) => ({
					value: `option-${index + 1}`,
					label: `Option ${index + 1}`,
				}));

				const host = defineComponent({
					components: { N8nSelect, N8nOption },
					setup() {
						const selected = ref('');
						return { options, selected };
					},
					template: `
						<N8nSelect v-model="selected" :teleported="false">
							<N8nOption
								v-for="option in options"
								:key="option.value"
								:value="option.value"
								:label="option.label"
							/>
						</N8nSelect>
					`,
				});

				const { container } = render(host);
				await userEvent.click(container.querySelector('input')!);

				const popper = await waitFor(() => {
					const el = container.querySelector<HTMLElement>('.el-select__popper');
					expect(el).not.toBeNull();
					return el!;
				});

				const wrap = popper.querySelector<HTMLElement>('.el-scrollbar__wrap');
				const verticalBar = popper.querySelector<HTMLElement>('.el-scrollbar__bar.is-vertical');
				expect(wrap).not.toBeNull();
				expect(verticalBar).not.toBeNull();

				return { wrap: wrap!, verticalBar: verticalBar! };
			}

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

			it('styles the dropdown scroll area with the Element Plus custom scrollbar', async () => {
				const { wrap, verticalBar } = await renderOpenLongSelect();

				expect(wrap).toHaveClass('el-scrollbar__wrap--hidden-default');
				expect(getComputedStyle(wrap).overflow).toBe('auto');
				expect(getComputedStyle(verticalBar).position).toBe('absolute');
			});

			it('hides the native scrollbar via scrollbar-width on the dropdown list wrapper', async () => {
				const { wrap } = await renderOpenLongSelect();

				expect(
					getComputedStyle(wrap).getPropertyValue('scrollbar-width').trim(),
					'el-scrollbar__wrap--hidden-default must set scrollbar-width: none so the native scrollbar does not appear next to the Element Plus scrollbar',
				).toBe('none');
			});

			it('hides the native WebKit scrollbar on the dropdown list wrapper', async () => {
				const { wrap } = await renderOpenLongSelect();

				expect(themeStyle?.sheet).not.toBeNull();
				expect(
					getWebkitScrollbarDisplay(wrap, themeStyle!.sheet!),
					'el-scrollbar__wrap--hidden-default::-webkit-scrollbar must set display: none so WebKit browsers do not render a second scrollbar',
				).toBe('none');
			});
		});
	});
});
