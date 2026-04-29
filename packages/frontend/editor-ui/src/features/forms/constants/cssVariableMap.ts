import type { BaseTextKey } from '@n8n/i18n';

export type CssVarType = 'color' | 'px' | 'text' | 'opacity';
export type CssVarGroup = 'background' | 'colors' | 'typography' | 'spacing' | 'borders';

export interface CssVarControl {
	variable: string;
	labelKey: BaseTextKey;
	type: CssVarType;
	group: CssVarGroup;
	default: string;
}

export const CSS_VARIABLE_GROUPS: Array<{ key: CssVarGroup; labelKey: BaseTextKey }> = [
	{ key: 'background', labelKey: 'formStep.appearance.group.background' },
	{ key: 'colors', labelKey: 'formStep.appearance.group.colors' },
	{ key: 'typography', labelKey: 'formStep.appearance.group.typography' },
	{ key: 'spacing', labelKey: 'formStep.appearance.group.spacing' },
	{ key: 'borders', labelKey: 'formStep.appearance.group.borders' },
];

export const CSS_VARIABLE_CONTROLS: CssVarControl[] = [
	// Background
	{
		variable: '--color-background',
		labelKey: 'formStep.appearance.control.colorBackground',
		type: 'color',
		group: 'background',
		default: '#fbfcfe',
	},

	// Colors
	{
		variable: '--color-card-bg',
		labelKey: 'formStep.appearance.control.colorCardBg',
		type: 'color',
		group: 'colors',
		default: '#ffffff',
	},
	{
		variable: '--color-card-border',
		labelKey: 'formStep.appearance.control.colorCardBorder',
		type: 'color',
		group: 'colors',
		default: '#dbdfe7',
	},
	{
		variable: '--color-header',
		labelKey: 'formStep.appearance.control.colorHeader',
		type: 'color',
		group: 'colors',
		default: '#525356',
	},
	{
		variable: '--color-header-subtext',
		labelKey: 'formStep.appearance.control.colorHeaderSubtext',
		type: 'color',
		group: 'colors',
		default: '#7e8186',
	},
	{
		variable: '--color-label',
		labelKey: 'formStep.appearance.control.colorLabel',
		type: 'color',
		group: 'colors',
		default: '#555555',
	},
	{
		variable: '--color-input-border',
		labelKey: 'formStep.appearance.control.colorInputBorder',
		type: 'color',
		group: 'colors',
		default: '#dbdfe7',
	},
	{
		variable: '--color-input-text',
		labelKey: 'formStep.appearance.control.colorInputText',
		type: 'color',
		group: 'colors',
		default: '#71747a',
	},
	{
		variable: '--color-focus-border',
		labelKey: 'formStep.appearance.control.colorFocusBorder',
		type: 'color',
		group: 'colors',
		default: '#5a4cc2',
	},
	{
		variable: '--color-submit-btn-bg',
		labelKey: 'formStep.appearance.control.colorSubmitBtnBg',
		type: 'color',
		group: 'colors',
		default: '#ff6d5a',
	},
	{
		variable: '--color-submit-btn-text',
		labelKey: 'formStep.appearance.control.colorSubmitBtnText',
		type: 'color',
		group: 'colors',
		default: '#ffffff',
	},
	{
		variable: '--color-link',
		labelKey: 'formStep.appearance.control.colorLink',
		type: 'color',
		group: 'colors',
		default: '#7e8186',
	},
	{
		variable: '--color-error',
		labelKey: 'formStep.appearance.control.colorError',
		type: 'color',
		group: 'colors',
		default: '#ea1f30',
	},
	{
		variable: '--color-required',
		labelKey: 'formStep.appearance.control.colorRequired',
		type: 'color',
		group: 'colors',
		default: '#ff6d5a',
	},
	{
		variable: '--opacity-placeholder',
		labelKey: 'formStep.appearance.control.opacityPlaceholder',
		type: 'opacity',
		group: 'colors',
		default: '0.5',
	},

	// Typography
	{
		variable: '--font-family',
		labelKey: 'formStep.appearance.control.fontFamily',
		type: 'text',
		group: 'typography',
		default: "'Open Sans', sans-serif",
	},
	{
		variable: '--font-size-header',
		labelKey: 'formStep.appearance.control.fontSizeHeader',
		type: 'px',
		group: 'typography',
		default: '20px',
	},
	{
		variable: '--font-size-subheader',
		labelKey: 'formStep.appearance.control.fontSizeSubheader',
		type: 'px',
		group: 'typography',
		default: '14px',
	},
	{
		variable: '--font-size-label',
		labelKey: 'formStep.appearance.control.fontSizeLabel',
		type: 'px',
		group: 'typography',
		default: '14px',
	},
	{
		variable: '--font-size-input',
		labelKey: 'formStep.appearance.control.fontSizeInput',
		type: 'px',
		group: 'typography',
		default: '14px',
	},
	{
		variable: '--font-size-body',
		labelKey: 'formStep.appearance.control.fontSizeBody',
		type: 'px',
		group: 'typography',
		default: '12px',
	},
	{
		variable: '--font-size-paragraph',
		labelKey: 'formStep.appearance.control.fontSizeParagraph',
		type: 'px',
		group: 'typography',
		default: '14px',
	},
	{
		variable: '--font-size-link',
		labelKey: 'formStep.appearance.control.fontSizeLink',
		type: 'px',
		group: 'typography',
		default: '12px',
	},
	{
		variable: '--font-size-error',
		labelKey: 'formStep.appearance.control.fontSizeError',
		type: 'px',
		group: 'typography',
		default: '12px',
	},

	// Spacing
	{
		variable: '--container-width',
		labelKey: 'formStep.appearance.control.containerWidth',
		type: 'px',
		group: 'spacing',
		default: '448px',
	},
	{
		variable: '--padding-container-top',
		labelKey: 'formStep.appearance.control.paddingContainerTop',
		type: 'px',
		group: 'spacing',
		default: '24px',
	},
	{
		variable: '--padding-card',
		labelKey: 'formStep.appearance.control.paddingCard',
		type: 'px',
		group: 'spacing',
		default: '24px',
	},
	{
		variable: '--padding-form-input',
		labelKey: 'formStep.appearance.control.paddingFormInput',
		type: 'px',
		group: 'spacing',
		default: '12px',
	},
	{
		variable: '--margin-bottom-card',
		labelKey: 'formStep.appearance.control.marginBottomCard',
		type: 'px',
		group: 'spacing',
		default: '16px',
	},
	{
		variable: '--submit-btn-height',
		labelKey: 'formStep.appearance.control.submitBtnHeight',
		type: 'px',
		group: 'spacing',
		default: '48px',
	},

	// Borders
	{
		variable: '--border-radius-card',
		labelKey: 'formStep.appearance.control.borderRadiusCard',
		type: 'px',
		group: 'borders',
		default: '8px',
	},
	{
		variable: '--border-radius-input',
		labelKey: 'formStep.appearance.control.borderRadiusInput',
		type: 'px',
		group: 'borders',
		default: '6px',
	},
];

export const CSS_VARIABLE_DEFAULTS: Record<string, string> = Object.fromEntries(
	CSS_VARIABLE_CONTROLS.map((c) => [c.variable, c.default]),
);
