import { render } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import N8nInputNumber from '../InputNumber.vue';

describe('N8nInputNumber', () => {
	const stubs = ['el-input-number'];

	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nInputNumber, {
				global: {
					stubs,
				},
			});

			const input = container.querySelector('el-input-number-stub');
			expect(input).toBeInTheDocument();
		});

		it('should render with custom value', () => {
			const { container } = render(N8nInputNumber, {
				attrs: {
					'model-value': 42,
				},
				global: {
					stubs,
				},
			});

			const input = container.querySelector('el-input-number-stub');
			expect(input).toBeInTheDocument();
			// modelValue is passed through $attrs to underlying ElInputNumber
		});
	});

	describe('Props Configuration', () => {
		it('should render with different sizes', () => {
			const sizes = ['mini', 'small', 'medium', 'large', 'xlarge'] as const;
			const expectedElementSizes = ['small', 'small', 'default', 'large', 'large'];

			sizes.forEach((size, index) => {
				const { container } = render(N8nInputNumber, {
					props: { size },
					global: {
						stubs,
					},
				});

				const input = container.querySelector('el-input-number-stub');
				expect(input).toHaveAttribute('size', expectedElementSizes[index]);
			});
		});

		it('should handle min and max values', () => {
			const { container } = render(N8nInputNumber, {
				props: {
					min: 0,
					max: 100,
				},
				global: {
					stubs,
				},
			});

			const input = container.querySelector('el-input-number-stub');
			expect(input).toHaveAttribute('min', '0');
			expect(input).toHaveAttribute('max', '100');
		});

		it('should handle step value', () => {
			const { container } = render(N8nInputNumber, {
				props: {
					step: 5,
				},
				global: {
					stubs,
				},
			});

			const input = container.querySelector('el-input-number-stub');
			expect(input).toHaveAttribute('step', '5');
		});

		it('should handle precision value', () => {
			const { container } = render(N8nInputNumber, {
				props: {
					precision: 2,
				},
				global: {
					stubs,
				},
			});

			const input = container.querySelector('el-input-number-stub');
			expect(input).toHaveAttribute('precision', '2');
		});
	});

	describe('Default Values', () => {
		it('should use default values when props are not provided', () => {
			const { container } = render(N8nInputNumber, {
				global: {
					stubs,
				},
			});

			const input = container.querySelector('el-input-number-stub');
			expect(input).toHaveAttribute('step', '1'); // default step
			expect(input).toHaveAttribute('min', '-Infinity'); // default min
			expect(input).toHaveAttribute('max', 'Infinity'); // default max
			// size should be undefined by default, so no size attribute
			expect(input).not.toHaveAttribute('size');
		});
	});

	describe('Size Mapping', () => {
		it('should correctly map n8n sizes to ElementPlus sizes', () => {
			const sizeMapping = [
				{ n8n: 'mini', expected: 'small' },
				{ n8n: 'small', expected: 'small' },
				{ n8n: 'medium', expected: 'default' },
				{ n8n: 'large', expected: 'large' },
				{ n8n: 'xlarge', expected: 'large' },
			];

			sizeMapping.forEach(({ n8n, expected }) => {
				const { container } = render(N8nInputNumber, {
					props: { size: n8n as any },
					global: {
						stubs,
					},
				});

				const input = container.querySelector('el-input-number-stub');
				expect(input).toHaveAttribute('size', expected);
			});
		});
	});

	describe('Attribute Passing', () => {
		it('should pass through additional attributes', () => {
			const { container } = render(N8nInputNumber, {
				props: {
					'data-testid': 'custom-input-number',
					placeholder: 'Enter number',
					disabled: true,
				},
				global: {
					stubs,
				},
			});

			const input = container.querySelector('el-input-number-stub');
			expect(input).toHaveAttribute('data-testid', 'custom-input-number');
			expect(input).toHaveAttribute('placeholder', 'Enter number');
			expect(input).toHaveAttribute('disabled', 'true');
		});
	});

	describe('Combined Props', () => {
		it('should handle multiple props together', () => {
			const { container } = render(N8nInputNumber, {
				props: {
					size: 'large',
					min: 10,
					max: 90,
					step: 5,
					precision: 1,
				},
				attrs: {
					'model-value': 25,
					placeholder: 'Enter value',
				},
				global: {
					stubs,
				},
			});

			const input = container.querySelector('el-input-number-stub');
			expect(input).toHaveAttribute('size', 'large');
			expect(input).toHaveAttribute('min', '10');
			expect(input).toHaveAttribute('max', '90');
			expect(input).toHaveAttribute('step', '5');
			expect(input).toHaveAttribute('precision', '1');
			// modelValue is passed through $attrs to underlying ElInputNumber
			expect(input).toHaveAttribute('placeholder', 'Enter value');
		});
	});

	describe('Edge Cases', () => {
		it('should handle negative infinity min value', () => {
			const { container } = render(N8nInputNumber, {
				props: {
					min: -Infinity,
				},
				global: {
					stubs,
				},
			});

			const input = container.querySelector('el-input-number-stub');
			expect(input).toHaveAttribute('min', '-Infinity');
		});

		it('should handle positive infinity max value', () => {
			const { container } = render(N8nInputNumber, {
				props: {
					max: Infinity,
				},
				global: {
					stubs,
				},
			});

			const input = container.querySelector('el-input-number-stub');
			expect(input).toHaveAttribute('max', 'Infinity');
		});

		it('should handle zero precision', () => {
			const { container } = render(N8nInputNumber, {
				props: {
					precision: 0,
				},
				global: {
					stubs,
				},
			});

			const input = container.querySelector('el-input-number-stub');
			expect(input).toHaveAttribute('precision', '0');
		});
	});
});
