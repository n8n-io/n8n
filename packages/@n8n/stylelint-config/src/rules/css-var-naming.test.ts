import { lint } from 'stylelint';
import plugin from './css-var-naming';

const config = {
	plugins: [plugin],
	rules: {
		'@n8n/css-var-naming': true,
	},
};

async function lintCSS(code: string) {
	const result = await lint({
		code,
		config,
	});
	return result.results[0];
}

describe('css-var-naming rule', () => {
	describe('namespace validation', () => {
		it('should accept valid n8n namespace', async () => {
			const namespacePattern = `
				:root {
					--n8n--color--primary: #0d6efd;
					--n8n--button--background--primary: #0d6efd;
					--n8n--button--background--primary--hover: #0b5ed7;
					--n8n--text-color--muted: #888;
				}
			`;
			const result = await lintCSS(namespacePattern);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept valid chat namespace', async () => {
			const namespacePattern = `
				:root {
					--chat--color--primary: #0d6efd;
					--chat--button--background--primary: #0d6efd;
					--chat--text-color--base: #333;
				}
			`;
			const result = await lintCSS(namespacePattern);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept valid p namespace for primitives', async () => {
			const namespacePattern = `
				:root {
					--p--color--primary: #0d6efd;
					--p--color--primary-500: #0d6efd;
					--p--spacing--md: 20px;
					--p--color--gray-740: #2e3440;
				}
			`;
			const result = await lintCSS(namespacePattern);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept variables without namespace', async () => {
			const noNamespace = `
				:root {
					--color--primary: #0d6efd;
					--button--background--primary: #0d6efd;
				}
			`;
			const result = await lintCSS(noNamespace);
			expect(result.warnings).toHaveLength(0);
		});

		it('should allow non-namespace first groups (components)', async () => {
			// Note: The rule doesn't strictly enforce namespace validation
			// It only recognizes 'n8n' and 'chat' as namespaces for property checking
			// Other first groups are treated as components, which is valid
			const componentFirst = `
				:root {
					--button--background--primary: #0d6efd;
					--tabs--tab--color--base: #333;
				}
			`;
			const result = await lintCSS(componentFirst);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept namespace with component and states', async () => {
			const complexNamespace = `
				:root {
					--n8n--button--background--primary--solid--hover: #0b5ed7;
					--chat--input--border-color--primary--focus: blue;
				}
			`;
			const result = await lintCSS(complexNamespace);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept namespace with all 8 groups', async () => {
			const maxGroups = `
				:root {
					--n8n--button--part--text-color--primary--solid--hover--dark: #000;
				}
			`;
			const result = await lintCSS(maxGroups);
			expect(result.warnings).toHaveLength(0);
		});
	});

	describe('basic pattern validation', () => {
		it('should accept valid patterns with double dashes between groups', async () => {
			const validPatterns = `
				:root {
					--color--primary: #0d6efd;
					--text-color--muted: #5b6270;
					--background--surface: #ffffff;
					--spacing--md: 20px;
					--font-size--lg: 18px;
				}
			`;
			const result = await lintCSS(validPatterns);
			expect(result.warnings).toHaveLength(0);
		});

		it('should reject patterns with single dash between groups', async () => {
			const invalidPattern = `
				:root {
					--color-primary: #0d6efd;
				}
			`;
			const result = await lintCSS(invalidPattern);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings[0]).toMatchObject({
				text: expect.stringContaining('Must have at least 2 groups'),
			});
		});

		it('should reject properties without values', async () => {
			const invalidPattern = `
				:root {
					--color: #0d6efd;
					--spacing: 4px;
				}
			`;
			const result = await lintCSS(invalidPattern);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings[0]).toMatchObject({
				text: expect.stringContaining('Must have at least 2 groups'),
			});
		});

		it('should reject spacing property without value', async () => {
			const invalidPattern = `
				:root {
					--spacing: 4px;
				}
			`;
			const result = await lintCSS(invalidPattern);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings[0]).toMatchObject({
				text: expect.stringContaining('Must have at least 2 groups'),
			});
		});

		it('should reject variable without proeprty', async () => {
			const invalidPattern = `
				:root {
					--button: 4px;
				}
			`;
			const result = await lintCSS(invalidPattern);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings[0]).toMatchObject({
				text: expect.stringContaining('Must have at least 2 groups'),
			});
		});

		it('should reject patterns with only one group', async () => {
			const invalidPattern = `
				:root {
					--primary: #0d6efd;
				}
			`;
			const result = await lintCSS(invalidPattern);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings[0]).toMatchObject({
				text: expect.stringContaining('Must have at least 2 groups'),
			});
		});

		it('should reject patterns with uppercase letters', async () => {
			const invalidPattern = `
				:root {
					--Color--Primary: #0d6efd;
				}
			`;
			const result = await lintCSS(invalidPattern);
			expect(result.warnings.length).toBeGreaterThan(0);
		});

		it('should reject patterns with underscores', async () => {
			const invalidPattern = `
				:root {
					--color_primary: #0d6efd;
				}
			`;
			const result = await lintCSS(invalidPattern);
			expect(result.warnings.length).toBeGreaterThan(0);
		});

		it('should reject patterns with more than 8 groups', async () => {
			const invalidPattern = `
				:root {
					--a--b--c--d--e--f--g--h--i: value;
				}
			`;
			const result = await lintCSS(invalidPattern);
			expect(result.warnings.length).toBeGreaterThan(0);
			// The pattern is rejected by the basic regex first
			expect(result.warnings[0]).toMatchObject({
				text: expect.stringContaining('Must follow pattern'),
			});
		});

		it('should reject because missing required property', async () => {
			const invalidPattern = `
				:root {
					--p--gray-740: #2e3440;
				}
			`;
			const result = await lintCSS(invalidPattern);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings[0]).toMatchObject({
				text: expect.stringContaining('Must include a valid property from vocabulary'),
			});
		});
	});

	describe('property vocabulary validation', () => {
		it('should accept variables with valid property names', async () => {
			const validProperties = `
				:root {
					--color--primary: #0d6efd;
					--text-color--base: #333;
					--background--light: #fff;
					--border-color--primary: #ddd;
					--border-width--thin: 1px;
					--icon-color--muted: #888;
					--radius--md: 4px;
					--shadow--sm: 0 1px 2px rgba(0,0,0,0.1);
					--spacing--lg: 24px;
					--font-size--md: 16px;
					--font-weight--bold: 600;
					--line-height--normal: 1.5;
					--z--modal: 1000;
					--duration--fast: 200ms;
					--easing--ease-out: ease-out;
					--outline-color--focus: blue;
					--outline-width--thick: 2px;
				}
			`;
			const result = await lintCSS(validProperties);
			expect(result.warnings).toHaveLength(0);
		});

		it('should reject variables without valid property names', async () => {
			const invalidProperty = `
				:root {
					--primary--value: #0d6efd;
				}
			`;
			const result = await lintCSS(invalidProperty);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings[0]).toMatchObject({
				text: expect.stringContaining('valid property from vocabulary'),
			});
		});

		it('should reject variables with synonym properties', async () => {
			const invalidProperty = `
				:root {
					--bg--primary: #fff;
				}
			`;
			const result = await lintCSS(invalidProperty);
			expect(result.warnings.length).toBeGreaterThan(0);
		});
	});

	describe('component tokens', () => {
		it('should accept component-level tokens', async () => {
			const componentTokens = `
				:root {
					--button--background--primary: #0d6efd;
					--button--text-color--on-primary: #fff;
					--button--border-color--outline: #ddd;
					--card--radius--md: 8px;
					--tabs--tab--text-color--muted: #888;
					--select--menu--background--dark: #000;
					--tooltip--arrow--color--primary: #333;
				}
			`;
			const result = await lintCSS(componentTokens);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept component with part tokens', async () => {
			const componentPartTokens = `
				:root {
					--tabs--tab--background--surface: #fff;
					--select--menu--shadow--lg: 0 4px 8px rgba(0,0,0,0.1);
					--tooltip--arrow--border-color--primary: #ddd;
				}
			`;
			const result = await lintCSS(componentPartTokens);
			expect(result.warnings).toHaveLength(0);
		});
	});

	describe('states validation', () => {
		it('should accept valid state modifiers', async () => {
			const stateModifiers = `
				:root {
					--button--background--primary--hover: #0b5ed7;
					--button--background--primary--active: #0a58ca;
					--button--background--primary--focus: #0d6efd;
					--button--background--primary--focus-visible: #0d6efd;
					--button--background--primary--disabled: #ccc;
					--input--border-color--primary--invalid: red;
					--checkbox--background--primary--checked: #0d6efd;
					--select--background--surface--opened: #fff;
					--accordion--background--surface--closed: #f5f5f5;
					--button--background--primary--loading: #999;
				}
			`;
			const result = await lintCSS(stateModifiers);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept link-specific states', async () => {
			const linkStates = `
				:root {
					--link--text-color--primary--visited: purple;
					--link--text-color--primary--hover: blue;
				}
			`;
			const result = await lintCSS(linkStates);
			expect(result.warnings).toHaveLength(0);
		});
	});

	describe('variants validation', () => {
		it('should accept valid variant modifiers', async () => {
			const variantModifiers = `
				:root {
					--button--background--primary--solid: #0d6efd;
					--button--background--primary--outline: transparent;
					--button--background--primary--ghost: transparent;
					--button--background--primary--link: transparent;
					--button--background--primary--soft: #e7f1ff;
					--button--background--primary--subtle: #f0f8ff;
				}
			`;
			const result = await lintCSS(variantModifiers);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept variants with states (variant before state)', async () => {
			const variantWithState = `
				:root {
					--button--background--primary--solid--hover: #0b5ed7;
					--button--background--primary--outline--active: #0a58ca;
					--button--background--primary--ghost--focus: rgba(13, 110, 253, 0.1);
				}
			`;
			const result = await lintCSS(variantWithState);
			expect(result.warnings).toHaveLength(0);
		});

		it('should reject when state comes before variant', async () => {
			const invalidOrder = `
				:root {
					--button--background--primary--hover--solid: #0b5ed7;
				}
			`;
			const result = await lintCSS(invalidOrder);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings[0]).toMatchObject({
				text: expect.stringContaining('Variant should come before state'),
			});
		});
	});

	describe('modes validation', () => {
		it('should accept valid mode modifiers', async () => {
			const modeModifiers = `
				:root {
					--color--primary--dark: #66a3ff;
					--color--primary--light: #0d6efd;
					--background--surface--dark: #000;
					--background--surface--light: #fff;
					--text-color--base--hc: #000;
					--spacing--md--rtl: 20px;
					--color--primary--print: #000;
				}
			`;
			const result = await lintCSS(modeModifiers);
			expect(result.warnings).toHaveLength(0);
		});
	});

	describe('media/breakpoint validation', () => {
		it('should accept valid media breakpoint modifiers', async () => {
			const mediaModifiers = `
				:root {
					--spacing--md--sm: 16px;
					--spacing--md--md: 20px;
					--spacing--md--lg: 24px;
					--spacing--md--xl: 32px;
					--spacing--md--2xl: 40px;
				}
			`;
			const result = await lintCSS(mediaModifiers);
			expect(result.warnings).toHaveLength(0);
		});
	});

	describe('semantic values', () => {
		it('should accept semantic color values', async () => {
			const semanticValues = `
				:root {
					--color--primary: #0d6efd;
					--color--secondary: #6c757d;
					--color--success: #28a745;
					--color--warning: #ffc107;
					--color--danger: #dc3545;
					--color--info: #17a2b8;
					--color--muted: #6c757d;
					--color--surface: #fff;
					--color--on-primary: #fff;
					--color--on-surface: #000;
				}
			`;
			const result = await lintCSS(semanticValues);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept scale values', async () => {
			const scaleValues = `
				:root {
					--spacing--5xs: 2px;
					--spacing--4xs: 4px;
					--spacing--3xs: 6px;
					--spacing--2xs: 8px;
					--spacing--xs: 12px;
					--spacing--sm: 16px;
					--spacing--md: 20px;
					--spacing--lg: 24px;
					--spacing--xl: 32px;
					--spacing--2xl: 48px;
					--spacing--3xl: 64px;
					--spacing--4xl: 128px;
					--spacing--5xl: 256px;
					--font-size--5xs: 8px;
					--font-size--4xs: 9px;
					--font-size--3xs: 10px;
					--font-size--2xs: 12px;
					--font-size--xs: 13px;
					--radius--none: 0;
					--radius--sm: 2px;
					--radius--md: 4px;
					--radius--lg: 8px;
					--radius--xl: 12px;
					--radius--pill: 9999px;
					--radius--full: 100%;
					--font-weight--regular: 400;
					--font-weight--medium: 500;
					--font-weight--semibold: 600;
					--font-weight--bold: 700;
				}
			`;
			const result = await lintCSS(scaleValues);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept descriptive value names (4+ chars)', async () => {
			const descriptiveValues = `
				:root {
					--color--purple: #800080;
					--text-color--base: #333;
					--border-width--thin: 1px;
					--z--modal: 1000;
					--duration--fast: 200ms;
				}
			`;
			const result = await lintCSS(descriptiveValues);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept font-weight specific values only with font-weight property', async () => {
			const fontWeightValues = `
				:root {
					--font-weight--regular: 400;
					--font-weight--medium: 500;
					--font-weight--semibold: 600;
					--font-weight--bold: 700;
					--button--font-weight--bold: 700;
				}
			`;
			const result = await lintCSS(fontWeightValues);
			expect(result.warnings).toHaveLength(0);
		});

		it('should reject font-weight specific values with non-font-weight properties', async () => {
			const invalidFontWeight = `
				:root {
					--spacing--bold: 20px;
				}
			`;
			const result = await lintCSS(invalidFontWeight);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings[0]).toMatchObject({
				text: expect.stringContaining('can only be used with font-weight property'),
			});
		});

		it('should reject very short value names (<4 chars)', async () => {
			const shortValue = `
				:root {
					--spacing--xxx: 20px;
				}
			`;
			const result = await lintCSS(shortValue);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings[0]).toMatchObject({
				text: expect.stringContaining('too short'),
			});
		});

		it('should accept color shades with numbers', async () => {
			const colorShades = `
				:root {
					--color--primary-500: #0d6efd;
					--color--primary-100: #e7f1ff;
					--color--danger-700: #a02622;
				}
			`;
			const result = await lintCSS(colorShades);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept component names as values', async () => {
			const componentValues = `
				:root {
					--button--background--surface: #fff;
					--tooltip--text-color--on-surface: #000;
				}
			`;
			const result = await lintCSS(componentValues);
			expect(result.warnings).toHaveLength(0);
		});
	});

	describe('var() references validation', () => {
		it('should validate CSS variables in var() references', async () => {
			const varReferences = `
				.button {
					background: var(--button--background--primary);
					color: var(--button--text-color--on-primary);
					border-color: var(--button--border-color--outline);
				}
			`;
			const result = await lintCSS(varReferences);
			expect(result.warnings).toHaveLength(0);
		});

		it('should reject invalid CSS variables in var() references', async () => {
			const invalidVarReferences = `
				.button {
					background: var(--button-background);
				}
			`;
			const result = await lintCSS(invalidVarReferences);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings[0]).toMatchObject({
				text: expect.stringContaining('Must have at least 2 groups'),
			});
		});

		it('should reject invalid CSS variables with unknown property in var() references', async () => {
			const invalidVarReferences = `
				.button {
					background: var(--button--unknown);
				}
			`;
			const result = await lintCSS(invalidVarReferences);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings[0]).toMatchObject({
				text: expect.stringContaining('Must include a valid property'),
			});
		});

		it('should reject invalid CSS variables with mixed order in var() references', async () => {
			const invalidVarReferences = `
				.button {
					background: var(--button--background--primary--hover--solid);
				}
			`;
			const result = await lintCSS(invalidVarReferences);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings[0]).toMatchObject({
				text: expect.stringContaining('Invalid CSS variable'),
			});
		});

		it('should accept var() with fallback values', async () => {
			const varWithFallback = `
				.button {
					background: var(--button--background--primary, var(--color--primary));
					border-radius: var(--button--radius--md, var(--radius--md));
				}
			`;
			const result = await lintCSS(varWithFallback);
			expect(result.warnings).toHaveLength(0);
		});
	});

	describe('complex real-world examples from proposal', () => {
		it('should accept all examples from proposal section 6', async () => {
			const proposalExamples = `
				.button {
					background: var(--button--background--primary);
					color: var(--button--text-color--on-primary);
					border-color: var(--button--border-color--ghost);
					border-radius: var(--button--radius--md, var(--radius--md));
					box-shadow: var(--button--shadow--sm, var(--shadow--sm));
				}

				.button:hover {
					background: var(--button--background--primary--hover);
				}

				.input:focus-visible {
					outline-color: var(--input--outline-color--focus-visible, var(--color--primary));
				}

				.card {
					background: var(--card--background--surface, var(--color--surface));
					box-shadow: var(--card--shadow--lg, var(--shadow--lg));
				}
			`;
			const result = await lintCSS(proposalExamples);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept theming example from proposal', async () => {
			const themingExample = `
				:root {
					--color--primary: #0d6efd;
					--color--surface: #ffffff;
					--text-color--muted: #5b6270;
					--button--background--primary: var(--color--primary);
					--button--text-color--on-primary: #ffffff;
				}

				:root[data-theme="dark"] {
					--color--primary: #66a3ff;
					--color--surface: #0f1115;
					--text-color--muted: #9aa3b2;
				}
			`;
			const result = await lintCSS(themingExample);
			expect(result.warnings).toHaveLength(0);
		});
	});

	describe('edge cases', () => {
		it('should accept single-property shorthand variables', async () => {
			const singleProperties = `
				:root {
					--shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
					--radius: 4px;
					--border-color: #ddd;
					--border-style: solid;
					--border-width: 1px;
					--border: 1px solid #ddd;
					--font-family: InterVariable, sans-serif;
				}
			`;
			const result = await lintCSS(singleProperties);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept shorthand properties in component patterns', async () => {
			const componentShorthand = `
				:root {
					--n8n--button--border-color: #ddd;
					--button--border: 1px solid #ddd;
					--chat--font--font-family: InterVariable, sans-serif;
					--menu--tab--radius: 4px;
					--card--shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
					--input--border-style: solid;
					--input--border-width: 1px;
				}
			`;
			const result = await lintCSS(componentShorthand);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept variables with numbers in groups', async () => {
			const numbersInGroups = `
				:root {
					--color--primary-500: #0d6efd;
					--color--primary-shade-50: #0b5ed7;
					--color--primary-tint-50: #6ea8fe;
					--spacing--2xs: 2px;
					--font-size--2xl: 28px;
				}
			`;
			const result = await lintCSS(numbersInGroups);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept kebab-case within groups', async () => {
			const kebabCase = `
				:root {
					--text-color--on-primary: #fff;
					--outline-color--focus-visible: blue;
					--font-weight--semi-bold: 600;
				}
			`;
			const result = await lintCSS(kebabCase);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept minimum valid pattern (2 groups)', async () => {
			const minimumPattern = `
				:root {
					--color--primary: #0d6efd;
					--spacing--md: 20px;
				}
			`;
			const result = await lintCSS(minimumPattern);
			expect(result.warnings).toHaveLength(0);
		});

		it('should accept maximum valid pattern (8 groups)', async () => {
			const maximumPattern = `
				:root {
					--namespace--component--part--text-color--primary--solid--hover--dark: #000;
				}
			`;
			const result = await lintCSS(maximumPattern);
			expect(result.warnings).toHaveLength(0);
		});
	});
});
