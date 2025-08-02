const SELECT_SIZES = ['mini', 'small', 'medium', 'large', 'xlarge'] as const;
export type SelectSize = (typeof SELECT_SIZES)[number];
