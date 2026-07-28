export interface TreeProps<Value = unknown> {
	value?: Record<string, Value>;
	path?: Array<string | number>;
	depth?: number;
	nodeClass?: string;
}
