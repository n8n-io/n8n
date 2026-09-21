const CALLOUT_VARIANTS = ['info', 'success', 'secondary', 'warning', 'danger', 'custom'] as const;
export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];
