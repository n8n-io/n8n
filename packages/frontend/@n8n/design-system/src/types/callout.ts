const CALLOUT_THEMES = ['info', 'success', 'secondary', 'warning', 'danger', 'custom'] as const;
export type CalloutTheme = (typeof CALLOUT_THEMES)[number];
