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
// NOTE: color--text, color--background, color--foreground use double dashes
// to separate "color" from the subtype (text/background/foreground)
const PROPERTY_VOCABULARY = new Set([
	'color',
	'color--text',
	'color--background',
	'color--foreground',
	'border-color',
	'border-width',
	'border-top-color',
	'border-bottom-color',
	'border-right-color',
	'border-left-width',
	'border-style',
	'border',
	'height',
	'icon-color',
	'radius',
	'size',
	'stroke-width',
	'shadow',
	'spacing',
	'padding',
	'font-size',
	'font-weight',
	'font-family',
	'line-height',
	'margin',
	'margin-right',
	'margin-left',
	'margin-top',
	'margin-bottom',
	'max-height',
	'max-width',
	'z',
	'duration',
	'easing',
	'outline-color',
	'outline-width',
	'width',
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

// Ignore issues related to these namespaces
const DISABLE_CHECK_FOR_NAMESPACES = new Set(['reka']);

// Allowed namespaces
const NAMESPACES = new Set(['n8n', 'p', ...DISABLE_CHECK_FOR_NAMESPACES]);

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
// Allows 2-10 groups to accommodate double-dash properties like color--text
const BASIC_PATTERN = /^--[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z0-9]+(?:-[a-z0-9]+)*){1,9}$/;

interface ValidationResult {
	valid: boolean;
	reason?: string;
}

function shouldSkip(variable: string) {
	// Split into groups first (drop first empty element from leading --)
	const parts = variable.slice(2).split('-');
	if (DISABLE_CHECK_FOR_NAMESPACES.has(parts[0])) {
		return true;
	}

	return false;
}

function validateCssVariable(variable: string): ValidationResult {
	if (shouldSkip(variable)) {
		return { valid: true };
	}

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

	// Check group count (2-10 groups to accommodate double-dash properties like color--text)
	if (groups.length < 2) {
		return {
			valid: false,
			reason: 'Must have at least 2 groups separated by double dashes (--property--value minimum)',
		};
	}

	if (groups.length > 10) {
		return {
			valid: false,
			reason: 'Must have at most 10 groups (too many segments)',
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

	// Check if any semantic or scale values appear before the property
	const groupsBeforeProperty = groups.slice(startIndex, absolutePropertyIndex);
	for (const group of groupsBeforeProperty) {
		// Check if this group is a semantic value, scale value, or font-weight value
		if (SEMANTIC_VALUES.has(group) || SCALE_VALUES.has(group) || FONT_WEIGHT_VALUES.has(group)) {
			return {
				valid: false,
				reason: `Value "${group}" appears before the property. Values must come after the property (e.g., --color--${group}, not --${group}--color)`,
			};
		}
	}

	// Get the property name to validate specific property-value combinations
	const propertyName = groups[absolutePropertyIndex];

	// Check if HSL components (h, s, l) appear in non-final positions or as suffixes
	const hslComponents = new Set(['h', 's', 'l']);

	// Check all groups after property for HSL-related issues
	for (let i = absolutePropertyIndex + 1; i < groups.length; i++) {
		const group = groups[i];
		const isLastGroup = i === groups.length - 1;

		// Check if group is exactly h, s, or l (allowed only at the end)
		if (hslComponents.has(group)) {
			if (!isLastGroup) {
				return {
					valid: false,
					reason: `HSL component "${group}" must be at the end of the variable name (e.g., --color--primary--${group}, not --color--${group}--primary)`,
				};
			}
			// If it's the last group and exactly h/s/l, it's valid
			continue;
		}

		// Check if group ends with -h, -s, or -l (never allowed)
		if (group.endsWith('-h') || group.endsWith('-s') || group.endsWith('-l')) {
			return {
				valid: false,
				reason: `HSL component suffix in "${group}" is not allowed. Use standalone HSL components instead (e.g., --color--primary--h, not --color--primary-h)`,
			};
		}
	}

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
				// Allow descriptive names (3+ chars) - these are likely intentional semantic names
				valueGroup.length >= 3 ||
				// Support hsl css variables (only allowed at the end, checked above)
				hslComponents.has(valueGroup);

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
