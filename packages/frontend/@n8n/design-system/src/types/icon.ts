import type { TextColor } from '@n8n/design-system/types/text';

const ICON_SIZE = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;
export type IconSize = (typeof ICON_SIZE)[number];

export type IconColor = TextColor;

const ICON_ORIENTATION = ['horizontal', 'vertical'] as const;
export type IconOrientation = (typeof ICON_ORIENTATION)[number];
