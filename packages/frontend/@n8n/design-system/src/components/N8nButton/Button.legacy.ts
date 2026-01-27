/**
 * Legacy Button Compatibility Layer
 *
 * This file contains deprecated prop mappings and utilities for backwards compatibility.
 * These will be removed in a future major version.
 *
 * @deprecated Use the current Button API with `variant` prop instead of `type`.
 */

import type { ButtonProps } from '../../types/button';

/**
 * Maps legacy `type` prop values to current `variant` values.
 * @deprecated Use variant prop directly
 */
const LEGACY_TYPE_TO_VARIANT: Record<string, string> = {
	primary: 'solid',
	secondary: 'subtle',
	tertiary: 'ghost',
	danger: 'destructive',
};

/**
 * Maps legacy size values to current size values.
 * @deprecated Use current size values (xsmall, small, medium, large)
 */
export const LEGACY_SIZE_MAP: Record<string, string> = {
	xmini: 'xsmall',
	mini: 'xsmall',
};

/**
 * Legacy type values that require the legacy styling system.
 * These types don't map to current variants and need the old SCSS.
 * @deprecated These types will be removed in a future version
 */
export const LEGACY_ONLY_TYPES = ['success', 'warning', 'highlight', 'highlightFill'] as const;

/**
 * Current variant values (the new API).
 */
export const CURRENT_VARIANTS = ['solid', 'subtle', 'ghost', 'outline', 'destructive'] as const;

/**
 * Determines if a variant value is a current (non-legacy) variant.
 */
export function isCurrentVariant(variant: string): boolean {
	return (CURRENT_VARIANTS as readonly string[]).includes(variant);
}

/**
 * Computes the effective variant from legacy props.
 * @deprecated This logic exists for backwards compatibility
 */
export function computeEffectiveVariant(props: ButtonProps): string {
	// Current API: variant prop takes precedence
	if (props.variant) return props.variant;

	// Legacy compat: outline modifier
	if (props.outline) return 'outline';

	// Legacy compat: text modifier
	if (props.text) return 'ghost';

	// Legacy compat: Map type to variant
	// primary → solid, secondary → subtle, tertiary → ghost, danger → destructive
	const type = props.type ?? 'primary';
	return LEGACY_TYPE_TO_VARIANT[type] ?? type;
}

/**
 * Computes the effective size from legacy props.
 * @deprecated xmini and mini sizes are deprecated
 */
export function computeEffectiveSize(size: string | undefined): string {
	const normalizedSize = size ?? 'medium';
	return LEGACY_SIZE_MAP[normalizedSize] ?? normalizedSize;
}

/**
 * Logs deprecation warnings for legacy props (dev mode only).
 * @deprecated These props will be removed in a future version
 */
export function logLegacyPropWarnings(props: ButtonProps, attrs: Record<string, unknown>): void {
	if (props.type) {
		console.warn(
			'[N8nButton] type prop is deprecated. Use variant instead. ' +
				'Mapping: primary→solid, secondary→subtle, tertiary→ghost, danger→destructive',
		);
	}
	if (props.outline) {
		console.warn('[N8nButton] outline prop is deprecated. Use variant="outline".');
	}
	if (props.text) {
		console.warn('[N8nButton] text prop is deprecated. Use variant="ghost".');
	}
	if (props.icon) {
		console.warn('[N8nButton] icon prop is deprecated. Pass <N8nIcon> in slot instead.');
	}
	if (props.label) {
		console.warn('[N8nButton] label prop is deprecated. Pass text as slot content.');
	}
	if (props.square) {
		console.warn('[N8nButton] square prop is deprecated. Use iconOnly prop.');
	}
	if (props.element) {
		console.warn('[N8nButton] element prop is deprecated. Use href to render as link.');
	}
	if (props.block) {
		console.warn('[N8nButton] block prop is deprecated. Use CSS class with width: 100%.');
	}
	if (props.nativeType) {
		console.warn('[N8nButton] nativeType prop is deprecated. Use type attribute directly.');
	}

	// Icon-only button accessibility warning (not a deprecation, but related)
	const isIconOnlyButton = props.iconOnly || props.square;
	if (isIconOnlyButton) {
		const hasAccessibleLabel = attrs['aria-label'] || attrs['aria-labelledby'] || attrs['title'];
		if (!hasAccessibleLabel) {
			console.warn(
				'[N8nButton] Icon-only buttons should have an accessible label. ' +
					'Add aria-label, aria-labelledby, or title attribute.',
			);
		}
	}
}
