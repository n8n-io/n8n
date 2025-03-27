export const EntryTypes = {
	NEW_TIME_ENTRY: 0,
} as const;

export type EntryType = (typeof EntryTypes)[keyof typeof EntryTypes];
