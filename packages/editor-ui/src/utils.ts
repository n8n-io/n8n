export const omit = (keyToOmit: string, { [keyToOmit]: _, ...remainder }) => remainder;
