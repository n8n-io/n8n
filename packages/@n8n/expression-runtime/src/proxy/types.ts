/**
 * Metadata returned for different value types
 */
export type ArrayMetadata = {
	__isArray: true;
	__length: number;
	__data: unknown[] | null; // null for large arrays
};

export type ObjectMetadata = {
	__isObject: true;
	__keys: string[];
};

export type ValueMetadata = ArrayMetadata | ObjectMetadata | unknown;

/**
 * Callbacks for fetching data
 */
export interface ProxyCallbacks {
	getValueAtPath(path: string[]): ValueMetadata;
	getArrayElement(path: string[], index: number): unknown;
}

/**
 * Options for proxy creation
 */
export interface ProxyOptions {
	/** Max array size to transfer entirely (default: 100) */
	smallArrayThreshold?: number;
	/** Enable debug logging */
	debug?: boolean;
}
