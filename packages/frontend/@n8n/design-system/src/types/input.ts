const INPUT_TYPES = ['text', 'textarea', 'number', 'password', 'email'] as const;
const INPUT_SIZES = ['mini', 'small', 'medium', 'large', 'xlarge'] as const;

export type InputType = (typeof INPUT_TYPES)[number];
export type InputSize = (typeof INPUT_SIZES)[number];
