/** Extracted from the SFC so the generic props are nameable in the emitted declaration (TS4082). */
export interface TreeProps<Value = unknown> {
	value?: Record<string, Value>;
	path?: Array<string | number>;
	depth?: number;
	nodeClass?: string;
}
