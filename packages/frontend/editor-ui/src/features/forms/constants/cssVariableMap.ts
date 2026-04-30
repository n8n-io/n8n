import type { BaseTextKey } from '@n8n/i18n';

export type CssVarType = 'color' | 'px' | 'text' | 'opacity';
export type CssVarGroup = 'page' | 'form' | 'input' | 'button';

export interface CssVarControl {
	variable: string;
	labelKey: BaseTextKey;
	type: CssVarType;
	group: CssVarGroup;
	default: string;
}

export const CSS_VARIABLE_GROUPS: Array<{ key: CssVarGroup; labelKey: BaseTextKey }> = [
	{ key: 'page', labelKey: 'formStep.appearance.group.page' },
	{ key: 'form', labelKey: 'formStep.appearance.group.form' },
	{ key: 'input', labelKey: 'formStep.appearance.group.input' },
	{ key: 'button', labelKey: 'formStep.appearance.group.button' },
];

export const CSS_VARIABLE_CONTROLS: CssVarControl[] = [
	// ── Page ─────────────────────────────────────────────────────────────────
	{
		variable: '--font-family',
		labelKey: 'formStep.appearance.control.fontFamily',
		type: 'text',
		group: 'page',
		default: "'Open Sans', sans-serif",
	},
	{
		variable: '--color-background',
		labelKey: 'formStep.appearance.control.colorBackground',
		type: 'color',
		group: 'page',
		default: '#fbfcfe',
	},
	{
		variable: '--container-width',
		labelKey: 'formStep.appearance.control.containerWidth',
		type: 'px',
		group: 'page',
		default: '448px',
	},
	{
		variable: '--padding-container-top',
		labelKey: 'formStep.appearance.control.paddingContainerTop',
		type: 'px',
		group: 'page',
		default: '24px',
	},

	// ── Form card ─────────────────────────────────────────────────────────────
	// Colors
	{
		variable: '--color-card-bg',
		labelKey: 'formStep.appearance.control.colorCardBg',
		type: 'color',
		group: 'form',
		default: '#ffffff',
	},
	{
		variable: '--color-card-border',
		labelKey: 'formStep.appearance.control.colorCardBorder',
		type: 'color',
		group: 'form',
		default: '#dbdfe7',
	},
	{
		variable: '--color-header',
		labelKey: 'formStep.appearance.control.colorHeader',
		type: 'color',
		group: 'form',
		default: '#525356',
	},
	{
		variable: '--color-header-subtext',
		labelKey: 'formStep.appearance.control.colorHeaderSubtext',
		type: 'color',
		group: 'form',
		default: '#7e8186',
	},
	// Sizes / structure
	{
		variable: '--font-size-header',
		labelKey: 'formStep.appearance.control.fontSizeHeader',
		type: 'px',
		group: 'form',
		default: '20px',
	},
	{
		variable: '--font-size-subheader',
		labelKey: 'formStep.appearance.control.fontSizeSubheader',
		type: 'px',
		group: 'form',
		default: '14px',
	},
	{
		variable: '--border-radius-card',
		labelKey: 'formStep.appearance.control.borderRadiusCard',
		type: 'px',
		group: 'form',
		default: '8px',
	},
	{
		variable: '--padding-card',
		labelKey: 'formStep.appearance.control.paddingCard',
		type: 'px',
		group: 'form',
		default: '24px',
	},
	{
		variable: '--margin-bottom-card',
		labelKey: 'formStep.appearance.control.marginBottomCard',
		type: 'px',
		group: 'form',
		default: '16px',
	},

	// ── Input fields ──────────────────────────────────────────────────────────
	// Colors
	{
		variable: '--color-input-bg',
		labelKey: 'formStep.appearance.control.colorInputBg',
		type: 'color',
		group: 'input',
		default: '#ffffff',
	},
	{
		variable: '--color-label',
		labelKey: 'formStep.appearance.control.colorLabel',
		type: 'color',
		group: 'input',
		default: '#555555',
	},
	{
		variable: '--color-input-border',
		labelKey: 'formStep.appearance.control.colorInputBorder',
		type: 'color',
		group: 'input',
		default: '#dbdfe7',
	},
	{
		variable: '--color-input-text',
		labelKey: 'formStep.appearance.control.colorInputText',
		type: 'color',
		group: 'input',
		default: '#71747a',
	},
	{
		variable: '--color-focus-border',
		labelKey: 'formStep.appearance.control.colorFocusBorder',
		type: 'color',
		group: 'input',
		default: '#5a4cc2',
	},
	{
		variable: '--color-error',
		labelKey: 'formStep.appearance.control.colorError',
		type: 'color',
		group: 'input',
		default: '#ea1f30',
	},
	{
		variable: '--color-required',
		labelKey: 'formStep.appearance.control.colorRequired',
		type: 'color',
		group: 'input',
		default: '#ff6d5a',
	},
	// Sizes / values
	{
		variable: '--font-size-label',
		labelKey: 'formStep.appearance.control.fontSizeLabel',
		type: 'px',
		group: 'input',
		default: '14px',
	},
	{
		variable: '--font-size-input',
		labelKey: 'formStep.appearance.control.fontSizeInput',
		type: 'px',
		group: 'input',
		default: '14px',
	},
	{
		variable: '--border-radius-input',
		labelKey: 'formStep.appearance.control.borderRadiusInput',
		type: 'px',
		group: 'input',
		default: '6px',
	},
	{
		variable: '--padding-form-input',
		labelKey: 'formStep.appearance.control.paddingFormInput',
		type: 'px',
		group: 'input',
		default: '12px',
	},
	{
		variable: '--font-size-body',
		labelKey: 'formStep.appearance.control.fontSizeBody',
		type: 'px',
		group: 'input',
		default: '12px',
	},
	{
		variable: '--font-size-paragraph',
		labelKey: 'formStep.appearance.control.fontSizeParagraph',
		type: 'px',
		group: 'input',
		default: '14px',
	},
	{
		variable: '--font-size-error',
		labelKey: 'formStep.appearance.control.fontSizeError',
		type: 'px',
		group: 'input',
		default: '12px',
	},
	{
		variable: '--opacity-placeholder',
		labelKey: 'formStep.appearance.control.opacityPlaceholder',
		type: 'opacity',
		group: 'input',
		default: '0.5',
	},

	// ── Button & links ────────────────────────────────────────────────────────
	// Colors
	{
		variable: '--color-submit-btn-bg',
		labelKey: 'formStep.appearance.control.colorSubmitBtnBg',
		type: 'color',
		group: 'button',
		default: '#ff6d5a',
	},
	{
		variable: '--color-submit-btn-text',
		labelKey: 'formStep.appearance.control.colorSubmitBtnText',
		type: 'color',
		group: 'button',
		default: '#ffffff',
	},
	{
		variable: '--color-link',
		labelKey: 'formStep.appearance.control.colorLink',
		type: 'color',
		group: 'button',
		default: '#7e8186',
	},
	// Sizes
	{
		variable: '--submit-btn-height',
		labelKey: 'formStep.appearance.control.submitBtnHeight',
		type: 'px',
		group: 'button',
		default: '48px',
	},
	{
		variable: '--font-size-submit-btn',
		labelKey: 'formStep.appearance.control.fontSizeSubmitBtn',
		type: 'px',
		group: 'button',
		default: '14px',
	},
	{
		variable: '--font-size-link',
		labelKey: 'formStep.appearance.control.fontSizeLink',
		type: 'px',
		group: 'button',
		default: '12px',
	},
];

export const CSS_VARIABLE_DEFAULTS: Record<string, string> = Object.fromEntries(
	CSS_VARIABLE_CONTROLS.map((c) => [c.variable, c.default]),
);
