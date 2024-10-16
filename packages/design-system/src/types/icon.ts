const ICON_SIZE = ['xsmall', 'small', 'medium', 'large'] as const;
export type IconSize = (typeof ICON_SIZE)[number];

const ICON_COLOR = ['primary', 'danger', 'success', 'warning', 'text-base'] as const;
export type IconColor = (typeof ICON_COLOR)[number];

const ICON_ORIENTATION = ['horizontal', 'vertical'] as const;
export type IconOrientation = (typeof ICON_ORIENTATION)[number];
