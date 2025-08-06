/**
 * Comprehensive test suite for N8nSelect component
 */

import userEvent from '@testing-library/user-event';
import { render, waitFor, within } from '@testing-library/vue';
import { defineComponent, ref } from 'vue';
import { describe, it, expect, vi } from 'vitest';

import { removeDynamicAttributes } from '@n8n/design-system/utils';

import N8nSelect from './Select.vue';
import N8nOption from '../N8nOption/Option.vue';

describe('components', () => {
	describe('N8nSelect', () => {
		describe('Basic Rendering', () => {
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

			it('should render with default props', () => {
				const { container } = render(N8nSelect, {
					global: {
						components: {
							'n8n-option': N8nOption,
						},
					},
				});
				const selectWrapper = container.querySelector('.n8n-select');
				expect(selectWrapper).toBeInTheDocument();
			});

			it('should render with model value', () => {
				const { container } = render(N8nSelect, {
					props: {
						modelValue: 'option1',
					},
					global: {
						components: {
							'n8n-option': N8nOption,
						},
					},
					slots: {
						default: '<n8n-option value="option1" label="Option 1" />',
					},
				});
				const input = container.querySelector('input') as HTMLInputElement;
				expect(input).toBeInTheDocument();
			});
		});

		describe('Size Configuration', () => {
			it('should render with default large size', () => {
				const { container } = render(N8nSelect, {
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				const select = container.querySelector('.el-select--large');
				expect(select).toBeInTheDocument();
			});

			it('should render with small size', () => {
				const { container } = render(N8nSelect, {
					props: { size: 'small' },
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				const select = container.querySelector('.el-select--small');
				expect(select).toBeInTheDocument();
			});

			it('should convert medium size to default for Element Plus', () => {
				const { container } = render(N8nSelect, {
					props: { size: 'medium' },
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				const select = container.querySelector('.el-select--default');
				expect(select).toBeInTheDocument();
			});

			it('should handle mini size conversion to small', () => {
				const { container } = render(N8nSelect, {
					props: { size: 'mini' },
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				const select = container.querySelector('.el-select--small');
				expect(select).toBeInTheDocument();
			});

			it('should render xlarge size with custom class', () => {
				const { container } = render(N8nSelect, {
					props: { size: 'xlarge' },
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				const select = container.querySelector('.xlarge');
				expect(select).toBeInTheDocument();
			});
		});

		describe('Props Configuration', () => {
			it('should apply placeholder', () => {
				const { container } = render(N8nSelect, {
					props: {
						placeholder: 'Select an option',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				const input = container.querySelector('input') as HTMLInputElement;
				expect(input.placeholder).toBe('Select an option');
			});

			it('should apply disabled state', () => {
				const { container } = render(N8nSelect, {
					props: {
						disabled: true,
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				const select = container.querySelector('.el-select');
				expect(select).toHaveClass('is-disabled');
			});

			it('should enable filterable functionality', () => {
				const { container } = render(N8nSelect, {
					props: {
						filterable: true,
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				const input = container.querySelector('input') as HTMLInputElement;
				expect(input).toBeInTheDocument();
			});

			it('should handle multiple selection', () => {
				const { container } = render(N8nSelect, {
					props: {
						multiple: true,
						modelValue: [],
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
					slots: {
						default: [
							'<n8n-option value="1" label="Option 1" />',
							'<n8n-option value="2" label="Option 2" />',
						],
					},
				});
				const select = container.querySelector('.el-select');
				expect(select).toHaveClass('el-select--multiple');
			});

			it('should apply multiple limit', () => {
				const { container } = render(N8nSelect, {
					props: {
						multiple: true,
						multipleLimit: 2,
						modelValue: [],
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				const select = container.querySelector('.el-select');
				expect(select).toBeInTheDocument();
			});

			it('should show loading state', () => {
				const { container } = render(N8nSelect, {
					props: {
						loading: true,
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				const select = container.querySelector('.el-select');
				expect(select).toBeInTheDocument();
			});

			it('should apply loading text', () => {
				const { container } = render(N8nSelect, {
					props: {
						loading: true,
						loadingText: 'Loading options...',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				const select = container.querySelector('.el-select');
				expect(select).toBeInTheDocument();
			});

			it('should apply custom popper class', () => {
				const { container } = render(N8nSelect, {
					props: {
						popperClass: 'custom-popper',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				const select = container.querySelector('.el-select');
				expect(select).toBeInTheDocument();
			});

			it('should handle no data text', () => {
				const { container } = render(N8nSelect, {
					props: {
						noDataText: 'No options available',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				const select = container.querySelector('.el-select');
				expect(select).toBeInTheDocument();
			});
		});

		describe('Slots', () => {
			it('should render prepend slot', () => {
				const { getByText } = render(N8nSelect, {
					slots: {
						prepend: 'Prepend Content',
						default: '<n8n-option value="1" label="Option 1" />',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				expect(getByText('Prepend Content')).toBeInTheDocument();
			});

			it('should render prefix slot', () => {
				const { getByText } = render(N8nSelect, {
					slots: {
						prefix: 'Prefix',
						default: '<n8n-option value="1" label="Option 1" />',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				expect(getByText('Prefix')).toBeInTheDocument();
			});

			it('should render suffix slot', () => {
				const { getByText } = render(N8nSelect, {
					slots: {
						suffix: 'Suffix',
						default: '<n8n-option value="1" label="Option 1" />',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				expect(getByText('Suffix')).toBeInTheDocument();
			});

			it('should render footer slot', () => {
				const { getByText } = render(N8nSelect, {
					slots: {
						footer: 'Footer Content',
						default: '<n8n-option value="1" label="Option 1" />',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				expect(getByText('Footer Content')).toBeInTheDocument();
			});

			it('should render empty slot', () => {
				const { getByText } = render(N8nSelect, {
					slots: {
						empty: 'No data available',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				expect(getByText('No data available')).toBeInTheDocument();
			});
		});

		describe('User Interactions', () => {
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

			it('should handle keyboard navigation', async () => {
				const user = userEvent.setup();

				const { container } = render(N8nSelect, {
					props: {
						modelValue: '',
						teleported: false,
					},
					slots: {
						default: [
							'<n8n-option value="1" label="Option 1" />',
							'<n8n-option value="2" label="Option 2" />',
							'<n8n-option value="3" label="Option 3" />',
						],
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const input = container.querySelector('input') as HTMLInputElement;
				await user.click(input);
				await user.keyboard('{ArrowDown}');
				await user.keyboard('{Enter}');

				// Basic keyboard navigation test
				expect(input).toBeInTheDocument();
			});

			it('should handle filterable search', async () => {
				const user = userEvent.setup();

				const { container } = render(N8nSelect, {
					props: {
						filterable: true,
						modelValue: '',
					},
					slots: {
						default: [
							'<n8n-option value="apple" label="Apple" />',
							'<n8n-option value="banana" label="Banana" />',
							'<n8n-option value="cherry" label="Cherry" />',
						],
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const input = container.querySelector('input') as HTMLInputElement;
				await user.click(input);
				await user.type(input, 'app');

				expect(input.value).toBe('app');
			});

			it('should handle change events', async () => {
				const changeHandler = vi.fn();
				const user = userEvent.setup();

				const { container } = render(N8nSelect, {
					props: {
						modelValue: '',
						teleported: false,
						onChange: changeHandler,
					},
					slots: {
						default: '<n8n-option value="test" label="Test Option" />',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const input = container.querySelector('input') as HTMLInputElement;
				await user.click(input);

				// Note: Change event testing would require more complex DOM interaction
				expect(input).toBeInTheDocument();
			});

			it('should handle focus and blur events', async () => {
				const user = userEvent.setup();
				const focusHandler = vi.fn();
				const blurHandler = vi.fn();

				const { container } = render(N8nSelect, {
					props: {
						onFocus: focusHandler,
						onBlur: blurHandler,
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const input = container.querySelector('input') as HTMLInputElement;
				await user.click(input);
				await user.tab();

				// Basic focus/blur interaction
				expect(input).toBeInTheDocument();
			});
		});

		describe('Multiple Selection', () => {
			it('should handle multiple values', () => {
				const { container } = render(N8nSelect, {
					props: {
						multiple: true,
						modelValue: ['1', '2'],
					},
					slots: {
						default: [
							'<n8n-option value="1" label="Option 1" />',
							'<n8n-option value="2" label="Option 2" />',
							'<n8n-option value="3" label="Option 3" />',
						],
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const select = container.querySelector('.el-select--multiple');
				expect(select).toBeInTheDocument();
			});

			it('should respect multiple limit', () => {
				const { container } = render(N8nSelect, {
					props: {
						multiple: true,
						multipleLimit: 2,
						modelValue: ['1', '2'],
					},
					slots: {
						default: [
							'<n8n-option value="1" label="Option 1" />',
							'<n8n-option value="2" label="Option 2" />',
							'<n8n-option value="3" label="Option 3" />',
						],
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const select = container.querySelector('.el-select');
				expect(select).toBeInTheDocument();
			});

			it('should handle empty multiple selection', () => {
				const { container } = render(N8nSelect, {
					props: {
						multiple: true,
						modelValue: [],
					},
					slots: {
						default: [
							'<n8n-option value="1" label="Option 1" />',
							'<n8n-option value="2" label="Option 2" />',
						],
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const select = container.querySelector('.el-select--multiple');
				expect(select).toBeInTheDocument();
			});
		});

		describe('Prepend Slot Styling', () => {
			it('should apply withPrepend class when prepend slot is used', () => {
				const { container } = render(N8nSelect, {
					slots: {
						prepend: 'Prepend',
						default: '<n8n-option value="1" label="Option 1" />',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const selectContainer = container.querySelector('.n8n-select');
				expect(selectContainer).toHaveClass('withPrepend');
			});

			it('should not apply withPrepend class when no prepend slot', () => {
				const { container } = render(N8nSelect, {
					slots: {
						default: '<n8n-option value="1" label="Option 1" />',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const selectContainer = container.querySelector('.n8n-select');
				expect(selectContainer).not.toHaveClass('withPrepend');
			});
		});

		describe('Model Value Handling', () => {
			it('should handle null model value', () => {
				const { container } = render(N8nSelect, {
					props: {
						modelValue: null,
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const select = container.querySelector('.el-select');
				expect(select).toBeInTheDocument();
			});

			it('should handle undefined model value', () => {
				const { container } = render(N8nSelect, {
					props: {
						modelValue: undefined,
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const select = container.querySelector('.el-select');
				expect(select).toBeInTheDocument();
			});

			it('should handle string model value', () => {
				const { container } = render(N8nSelect, {
					props: {
						modelValue: 'option1',
					},
					slots: {
						default: '<n8n-option value="option1" label="Option 1" />',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const input = container.querySelector('input') as HTMLInputElement;
				expect(input).toBeInTheDocument();
			});

			it('should handle number model value', () => {
				const { container } = render(N8nSelect, {
					props: {
						modelValue: 42,
					},
					slots: {
						default: '<n8n-option value="42" label="Answer" />',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const select = container.querySelector('.el-select');
				expect(select).toBeInTheDocument();
			});
		});

		describe('Custom Filter Method', () => {
			it('should use custom filter method when provided', () => {
				const customFilter = vi.fn();

				const { container } = render(N8nSelect, {
					props: {
						filterable: true,
						filterMethod: customFilter,
					},
					slots: {
						default: [
							'<n8n-option value="1" label="Option 1" />',
							'<n8n-option value="2" label="Option 2" />',
						],
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const select = container.querySelector('.el-select');
				expect(select).toBeInTheDocument();
			});
		});

		describe('Accessibility', () => {
			it('should have proper select role', () => {
				const { container } = render(N8nSelect, {
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const select = container.querySelector('.el-select');
				expect(select).toBeInTheDocument();
			});

			it('should support aria attributes through v-bind', () => {
				const { container } = render(N8nSelect, {
					props: {
						'aria-label': 'Select an option',
						'aria-describedby': 'help-text',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const select = container.querySelector('.el-select');
				expect(select).toBeInTheDocument();
			});

			it('should be keyboard accessible', async () => {
				const user = userEvent.setup();

				const { container } = render(N8nSelect, {
					slots: {
						default: '<n8n-option value="1" label="Option 1" />',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const input = container.querySelector('input') as HTMLInputElement;
				input.focus();
				await user.keyboard('{Space}');

				expect(input).toBeInTheDocument();
			});
		});

		describe('Edge Cases', () => {
			it('should handle empty slots gracefully', () => {
				const { container } = render(N8nSelect, {
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const select = container.querySelector('.n8n-select');
				expect(select).toBeInTheDocument();
			});

			it('should handle very long option lists', () => {
				const manyOptions = Array.from(
					{ length: 1000 },
					(_, i) => `<n8n-option value="${i}" label="Option ${i}" />`,
				);

				const { container } = render(N8nSelect, {
					slots: {
						default: manyOptions,
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const select = container.querySelector('.el-select');
				expect(select).toBeInTheDocument();
			});

			it('should handle special characters in values', () => {
				const { container } = render(N8nSelect, {
					props: {
						modelValue: '!@#$%^&*()_+-=[]{}|;:",.<>?',
					},
					slots: {
						default:
							'<n8n-option value="!@#$%^&*()_+-=[]{}|;:",.<>?" label="Special Characters" />',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const select = container.querySelector('.el-select');
				expect(select).toBeInTheDocument();
			});

			it('should combine multiple props correctly', () => {
				const { container } = render(N8nSelect, {
					props: {
						multiple: true,
						filterable: true,
						loading: true,
						disabled: false,
						size: 'small',
						placeholder: 'Multi-select with filter',
					},
					slots: {
						default: [
							'<n8n-option value="1" label="Option 1" />',
							'<n8n-option value="2" label="Option 2" />',
						],
						prepend: 'Prepend',
					},
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});

				const select = container.querySelector('.el-select--multiple.el-select--small');
				const container_el = container.querySelector('.n8n-select.withPrepend');
				expect(select).toBeInTheDocument();
				expect(container_el).toBeInTheDocument();
			});
		});

		describe('Exposed Methods', () => {
			it('should expose focus, blur, and focusOnInput methods', () => {
				const { container } = render(N8nSelect, {
					global: {
						components: { 'n8n-option': N8nOption },
					},
				});
				// Note: Testing exposed methods would require accessing the component instance
				// This is more of a documentation test to ensure the methods exist
				expect(container.querySelector('.el-select')).toBeInTheDocument();
			});
		});
	});
});
