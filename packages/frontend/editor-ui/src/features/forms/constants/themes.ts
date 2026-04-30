export interface FormTheme {
	id: string;
	overrides: Record<string, string>;
}

const DARK_OVERRIDES: Record<string, string> = {
	'--color-background': '#1a1b1e',
	'--color-card-bg': '#2c2d31',
	'--color-card-border': '#3e4045',
	'--color-header': '#e4e5e7',
	'--color-header-subtext': '#9b9da3',
	'--color-label': '#c8c9cb',
	'--color-input-bg': '#232428',
	'--color-input-border': '#4a4b50',
	'--color-input-text': '#b0b2b7',
	'--color-focus-border': '#7c6ce0',
	'--color-link': '#9b9da3',
};

const COMPACT_OVERRIDES: Record<string, string> = {
	'--container-width': '360px',
	'--padding-container-top': '16px',
	'--padding-card': '16px',
	'--padding-form-input': '8px',
	'--margin-bottom-card': '8px',
	'--submit-btn-height': '40px',
	'--font-size-header': '17px',
	'--font-size-label': '12px',
	'--font-size-input': '12px',
	'--border-radius-card': '6px',
	'--border-radius-input': '4px',
};

export const FORM_THEMES: FormTheme[] = [
	// ── Light family ──────────────────────────────────────────────────────────
	{ id: 'light', overrides: {} },
	{ id: 'dark', overrides: DARK_OVERRIDES },

	// ── Density variants ──────────────────────────────────────────────────────
	{
		id: 'dense',
		overrides: {
			'--padding-container-top': '12px',
			'--padding-card': '16px',
			'--margin-bottom-card': '8px',
			'--padding-form-input': '8px',
			'--submit-btn-height': '36px',
			'--font-size-header': '17px',
			'--font-size-subheader': '12px',
		},
	},
	{ id: 'compact', overrides: COMPACT_OVERRIDES },
	{ id: 'compactDark', overrides: { ...COMPACT_OVERRIDES, ...DARK_OVERRIDES } },

	// ── Enterprise family ─────────────────────────────────────────────────────
	{
		id: 'enterprise',
		overrides: {
			'--font-family': "'Helvetica Neue', Helvetica, Arial, sans-serif",
			'--color-background': '#f5f6f8',
			'--color-card-border': '#cfd5dc',
			'--color-header': '#1c2b3a',
			'--color-header-subtext': '#4a5a6a',
			'--color-submit-btn-bg': '#0055b3',
			'--color-focus-border': '#0055b3',
			'--color-required': '#cc0000',
			'--border-radius-card': '2px',
			'--border-radius-input': '2px',
		},
	},
	{
		id: 'enterpriseDark',
		overrides: {
			'--font-family': "'Helvetica Neue', Helvetica, Arial, sans-serif",
			'--color-background': '#12192b',
			'--color-card-bg': '#1c2540',
			'--color-card-border': '#2a3560',
			'--color-header': '#dde3f0',
			'--color-header-subtext': '#7a88a8',
			'--color-label': '#8898b8',
			'--color-input-bg': '#161e36',
			'--color-input-border': '#2a3560',
			'--color-input-text': '#a8b8d8',
			'--color-focus-border': '#0077cc',
			'--color-link': '#4488cc',
			'--color-submit-btn-bg': '#0055b3',
			'--color-required': '#cc2222',
			'--border-radius-card': '2px',
			'--border-radius-input': '2px',
		},
	},
	// ── Fun family ────────────────────────────────────────────────────────────
	{
		id: 'fun',
		overrides: {
			'--font-family': "'Georgia', serif",
			'--color-background': '#fef0fb',
			'--color-card-bg': '#fff8fe',
			'--color-card-border': '#f0a8e8',
			'--color-header': '#9b1fa8',
			'--color-header-subtext': '#c060c8',
			'--color-label': '#6a2070',
			'--color-submit-btn-bg': '#e040d0',
			'--color-focus-border': '#e040d0',
			'--color-required': '#e040d0',
			'--border-radius-card': '20px',
			'--border-radius-input': '16px',
		},
	},
	{
		id: 'funColorful',
		overrides: {
			'--font-family': "'Georgia', serif",
			'--color-background': '#e8fff0',
			'--color-card-bg': '#f8fffc',
			'--color-card-border': '#40d890',
			'--color-header': '#ff3838',
			'--color-header-subtext': '#ff8c20',
			'--color-label': '#1a88d0',
			'--color-input-bg': '#ffffff',
			'--color-input-border': '#40d890',
			'--color-focus-border': '#30c8a8',
			'--color-submit-btn-bg': '#ff5520',
			'--color-required': '#ff2060',
			'--border-radius-card': '24px',
			'--border-radius-input': '16px',
		},
	},
];
