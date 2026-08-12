import type { BaseTextKey } from '@n8n/i18n';
import {
	FORM_CSS_VARIABLE_CONTROLS,
	FORM_CSS_VARIABLE_DEFAULTS,
	FORM_CSS_VARIABLE_GROUPS,
	type FormCssVarType,
	type FormCssVarGroup,
} from 'n8n-workflow';

// The editable CSS-variable catalog lives in `n8n-workflow` (`form-theme.ts`) so
// it can be shared with the backend / Instance AI. The frontend only adds the
// i18n label keys on top, keeping the shared catalog dependency-free.

export type CssVarType = FormCssVarType;
export type CssVarGroup = FormCssVarGroup;

export interface CssVarControl {
	variable: string;
	labelKey: BaseTextKey;
	type: CssVarType;
	group: CssVarGroup;
	default: string;
}

/** Maps each shared CSS variable to its i18n label key. */
const CONTROL_LABEL_KEYS: Record<string, BaseTextKey> = {
	'--font-family': 'formStep.appearance.control.fontFamily',
	'--color-background': 'formStep.appearance.control.colorBackground',
	'--container-width': 'formStep.appearance.control.containerWidth',
	'--padding-container-top': 'formStep.appearance.control.paddingContainerTop',
	'--color-card-bg': 'formStep.appearance.control.colorCardBg',
	'--color-card-border': 'formStep.appearance.control.colorCardBorder',
	'--color-header': 'formStep.appearance.control.colorHeader',
	'--color-header-subtext': 'formStep.appearance.control.colorHeaderSubtext',
	'--font-size-header': 'formStep.appearance.control.fontSizeHeader',
	'--font-size-subheader': 'formStep.appearance.control.fontSizeSubheader',
	'--border-radius-card': 'formStep.appearance.control.borderRadiusCard',
	'--padding-card': 'formStep.appearance.control.paddingCard',
	'--margin-bottom-card': 'formStep.appearance.control.marginBottomCard',
	'--color-input-bg': 'formStep.appearance.control.colorInputBg',
	'--color-label': 'formStep.appearance.control.colorLabel',
	'--color-input-border': 'formStep.appearance.control.colorInputBorder',
	'--color-input-text': 'formStep.appearance.control.colorInputText',
	'--color-focus-border': 'formStep.appearance.control.colorFocusBorder',
	'--color-error': 'formStep.appearance.control.colorError',
	'--color-required': 'formStep.appearance.control.colorRequired',
	'--font-size-label': 'formStep.appearance.control.fontSizeLabel',
	'--font-size-input': 'formStep.appearance.control.fontSizeInput',
	'--border-radius-input': 'formStep.appearance.control.borderRadiusInput',
	'--padding-form-input': 'formStep.appearance.control.paddingFormInput',
	'--font-size-body': 'formStep.appearance.control.fontSizeBody',
	'--font-size-paragraph': 'formStep.appearance.control.fontSizeParagraph',
	'--font-size-error': 'formStep.appearance.control.fontSizeError',
	'--opacity-placeholder': 'formStep.appearance.control.opacityPlaceholder',
	'--color-submit-btn-bg': 'formStep.appearance.control.colorSubmitBtnBg',
	'--color-submit-btn-text': 'formStep.appearance.control.colorSubmitBtnText',
	'--color-link': 'formStep.appearance.control.colorLink',
	'--submit-btn-height': 'formStep.appearance.control.submitBtnHeight',
	'--font-size-submit-btn': 'formStep.appearance.control.fontSizeSubmitBtn',
	'--font-size-link': 'formStep.appearance.control.fontSizeLink',
};

const GROUP_LABEL_KEYS: Record<CssVarGroup, BaseTextKey> = {
	page: 'formStep.appearance.group.page',
	form: 'formStep.appearance.group.form',
	input: 'formStep.appearance.group.input',
	button: 'formStep.appearance.group.button',
};

export const CSS_VARIABLE_GROUPS: Array<{ key: CssVarGroup; labelKey: BaseTextKey }> =
	FORM_CSS_VARIABLE_GROUPS.map((g) => ({ key: g.key, labelKey: GROUP_LABEL_KEYS[g.key] }));

export const CSS_VARIABLE_CONTROLS: CssVarControl[] = FORM_CSS_VARIABLE_CONTROLS.map((c) => ({
	variable: c.variable,
	labelKey: CONTROL_LABEL_KEYS[c.variable],
	type: c.type,
	group: c.group,
	default: c.default,
}));

export const CSS_VARIABLE_DEFAULTS: Record<string, string> = FORM_CSS_VARIABLE_DEFAULTS;
