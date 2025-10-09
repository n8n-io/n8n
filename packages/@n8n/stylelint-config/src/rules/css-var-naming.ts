import stylelint from 'stylelint';
import type { Rule } from 'stylelint';

const ruleName = '@n8n/css-var-naming';

const messages = stylelint.utils.ruleMessages(ruleName, {
	rejected: (variable: string, reason: string) => `Invalid CSS variable "${variable}": ${reason}`,
});

const meta = {
	url: 'https://github.com/n8n-io/n8n',
};

// Reserved vocabulary from proposal.md
const PROPERTY_VOCABULARY = new Set([
	'color',
	'text-color',
	'background',
	'border-color',
	'border-width',
	'border-style',
	'border',
	'icon-color',
	'radius',
	'shadow',
	'spacing',
	'font-size',
	'font-weight',
	'font-family',
	'line-height',
	'z',
	'duration',
	'easing',
	'outline-color',
	'outline-width',
]);

// Properties that can be used as standalone single-group variables (without a value)
const STANDALONE_PROPERTIES = new Set([
	'shadow',
	'radius',
	'border-color',
	'border-style',
	'border-width',
	'border',
	'font-family',
]);

const STATES = new Set([
	'hover',
	'active',
	'focus',
	'focus-visible',
	'visited',
	'disabled',
	'selected',
	'checked',
	'invalid',
	'opened',
	'closed',
	'loading',
]);

const VARIANTS = new Set(['solid', 'outline', 'ghost', 'link', 'soft', 'subtle']);

const MODES = new Set(['light', 'dark', 'hc', 'rtl', 'print']);

const MEDIA = new Set(['sm', 'md', 'lg', 'xl', '2xl']);

// Allowed namespaces
const NAMESPACES = new Set(['n8n', 'chat', 'p']);

// Semantic values and scales
const SEMANTIC_VALUES = new Set([
	'primary',
	'secondary',
	'success',
	'warning',
	'danger',
	'info',
	'muted',
	'surface',
	'on-primary',
	'on-surface',
]);

const SCALE_VALUES = new Set([
	'5xs',
	'4xs',
	'3xs',
	'2xs',
	'xs',
	'sm',
	'md',
	'lg',
	'xl',
	'2xl',
	'3xl',
	'4xl',
	'5xl',
]);

// Font weight specific values (only valid with font-weight property)
const FONT_WEIGHT_VALUES = new Set(['regular', 'medium', 'semibold', 'bold']);

// Regex for basic validation
const BASIC_PATTERN = /^--[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z0-9]+(?:-[a-z0-9]+)*){1,7}$/;

interface ValidationResult {
	valid: boolean;
	reason?: string;
}

function validateCssVariable(variable: string): ValidationResult {
	// Split into groups first (drop first empty element from leading --)
	const groups = variable.slice(2).split('--');

	// Check if this is a single-group variable (e.g., --shadow, --radius, --border-color)
	if (groups.length === 1) {
		const singleGroup = groups[0];
		// Allow standalone properties that are in the STANDALONE_PROPERTIES set
		if (STANDALONE_PROPERTIES.has(singleGroup)) {
			return { valid: true };
		}
		return {
			valid: false,
			reason: 'Must have at least 2 groups separated by double dashes (--property--value minimum)',
		};
	}

	// Basic pattern check for multi-group variables
	if (!BASIC_PATTERN.test(variable)) {
		return {
			valid: false,
			reason:
				'Must follow pattern: --[group]--[group]--... with lowercase alphanumerics and single dash within groups',
		};
	}

	// Check group count (2-8 groups)
	if (groups.length < 2) {
		return {
			valid: false,
			reason: 'Must have at least 2 groups separated by double dashes (--property--value minimum)',
		};
	}

	if (groups.length > 8) {
		return {
			valid: false,
			reason: 'Must have at most 8 groups (too many segments)',
		};
	}

	// Check each group for invalid characters
	for (const group of groups) {
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(group)) {
			return {
				valid: false,
				reason: `Group "${group}" contains invalid characters. Use only lowercase letters, numbers, and single dash within groups`,
			};
		}
	}

	// Check if first group is a namespace, and if so, validate it
	const firstGroup = groups[0];
	let startIndex = 0;

	// If first group is a valid namespace, skip it for property validation
	if (NAMESPACES.has(firstGroup)) {
		startIndex = 1;
	}

	// Validate property vocabulary (should be in the variable somewhere after namespace)
	const hasValidProperty = groups.slice(startIndex).some((group) => PROPERTY_VOCABULARY.has(group));
	if (!hasValidProperty) {
		return {
			valid: false,
			reason: `Must include a valid property from vocabulary: ${Array.from(PROPERTY_VOCABULARY).join(', ')}`,
		};
	}

	// Find the property index to validate what comes after it
	const propertyIndex = groups
		.slice(startIndex)
		.findIndex((group) => PROPERTY_VOCABULARY.has(group));
	const absolutePropertyIndex = startIndex + propertyIndex;

	// Get the property name to validate specific property-value combinations
	const propertyName = groups[absolutePropertyIndex];

	// The group after property should be a value (semantic or scale)
	if (absolutePropertyIndex + 1 < groups.length) {
		const valueGroup = groups[absolutePropertyIndex + 1];

		// Check if this is a font-weight specific value
		if (FONT_WEIGHT_VALUES.has(valueGroup)) {
			// Font weight values are only valid with font-weight property
			if (propertyName !== 'font-weight') {
				return {
					valid: false,
					reason: `Value "${valueGroup}" can only be used with font-weight property (e.g., --font-weight--${valueGroup})`,
				};
			}
		}

		// Check if this is a known modifier (variant, state, mode, media)
		const isModifier =
			VARIANTS.has(valueGroup) ||
			STATES.has(valueGroup) ||
			MODES.has(valueGroup) ||
			MEDIA.has(valueGroup);

		// If it's not a modifier, validate it's a semantic or scale value
		// We use a permissive approach: reject only clearly invalid patterns
		if (!isModifier) {
			const isValidValue =
				SEMANTIC_VALUES.has(valueGroup) ||
				SCALE_VALUES.has(valueGroup) ||
				FONT_WEIGHT_VALUES.has(valueGroup) ||
				// Allow color shades like "primary-500", "shade-50", "tint-50"
				/^[a-z]+-\d+$/.test(valueGroup) ||
				// Allow descriptive names (4+ chars) - these are likely intentional semantic names
				valueGroup.length >= 4;

			if (!isValidValue) {
				return {
					valid: false,
					reason: `Value "${valueGroup}" is too short. Use semantic values (${Array.from(SEMANTIC_VALUES).slice(0, 5).join(', ')}...) or scale values (${Array.from(SCALE_VALUES).slice(0, 5).join(', ')}...). See proposal for full list.`,
				};
			}
		}
	}

	// Check for states/variants/modes in appropriate positions (optional validation)
	const lastGroup = groups[groups.length - 1];

	// If last group is a state/mode/media, that's valid
	if (STATES.has(lastGroup) || MODES.has(lastGroup) || MEDIA.has(lastGroup)) {
		// Valid pattern
		return { valid: true };
	}

	// Check if we have variants in reasonable positions
	const hasVariant = groups.some((group) => VARIANTS.has(group));
	const hasState = groups.some((group) => STATES.has(group));

	// If we have both variant and state, variant should come before state
	if (hasVariant && hasState) {
		const variantIndex = groups.findIndex((group) => VARIANTS.has(group));
		const stateIndex = groups.findIndex((group) => STATES.has(group));
		if (variantIndex > stateIndex) {
			return {
				valid: false,
				reason:
					'Variant should come before state (e.g., --button--background--primary--solid--hover)',
			};
		}
	}

	return { valid: true };
}

const ruleFunction: Rule = (primary, secondaryOptions, context) => {
	return (root, result) => {
		const validOptions = stylelint.utils.validateOptions(result, ruleName, {
			actual: primary,
		});

		if (!validOptions) {
			return;
		}

		root.walkDecls((decl) => {
			const prop = decl.prop;

			// Only check CSS custom properties (variables)
			if (!prop.startsWith('--')) {
				return;
			}

			const validation = validateCssVariable(prop);

			if (!validation.valid) {
				stylelint.utils.report({
					message: messages.rejected(prop, validation.reason!),
					node: decl,
					result,
					ruleName,
				});
			}
		});

		// Also check variable usage in var() functions
		root.walkDecls((decl) => {
			const value = decl.value;

			// Find all var() references
			const varPattern = /var\((--[a-z0-9-]+)/g;
			let match;

			while ((match = varPattern.exec(value)) !== null) {
				const variable = match[1];
				const validation = validateCssVariable(variable);

				if (!validation.valid) {
					stylelint.utils.report({
						message: messages.rejected(variable, validation.reason!),
						node: decl,
						result,
						ruleName,
					});
				}
			}
		});
	};
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export default stylelint.createPlugin(ruleName, ruleFunction);
