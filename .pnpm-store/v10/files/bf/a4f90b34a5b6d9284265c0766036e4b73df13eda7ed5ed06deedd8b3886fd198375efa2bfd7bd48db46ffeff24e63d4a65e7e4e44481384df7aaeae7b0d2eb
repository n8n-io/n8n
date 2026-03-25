import { ResolvedConfig, BrowserCommand, BrowserServerFactory, BrowserProviderOption } from 'vitest/node';
import { ScreenshotMatcherOptions, NonStandardScreenshotComparators, ScreenshotComparatorRegistry } from '@vitest/browser/context';

interface BaseMetadata {
	height: number;
	width: number;
}
type TypedArray = Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike> | Uint8ClampedArray<ArrayBufferLike>;
type Promisable<T> = T | Promise<T>;
type Comparator<Options extends Record<string, unknown>> = (reference: {
	metadata: BaseMetadata;
	data: TypedArray;
}, actual: {
	metadata: BaseMetadata;
	data: TypedArray;
}, options: {
	/**
	* Allows the comparator to create a diff image.
	*
	* Note that the comparator might choose to ignore the flag, so a diff image is not guaranteed.
	*/
	createDiff: boolean;
} & Options) => Promisable<{
	pass: boolean;
	diff: TypedArray | null;
	message: string | null;
}>;
type CustomComparatorsToRegister = { [Key in keyof NonStandardScreenshotComparators] : Comparator<NonStandardScreenshotComparators[Key]> };
type CustomComparatorsRegistry = keyof CustomComparatorsToRegister extends never ? {
	comparators?: Record<string, Comparator<Record<string, unknown>>>;
} : {
	comparators: CustomComparatorsToRegister;
};
declare module "vitest/node" {
	interface ToMatchScreenshotOptions extends Omit<ScreenshotMatcherOptions, "comparatorName" | "comparatorOptions">, CustomComparatorsRegistry {}
	interface ToMatchScreenshotComparators extends ScreenshotComparatorRegistry {}
}

declare enum DOM_KEY_LOCATION {
	STANDARD = 0,
	LEFT = 1,
	RIGHT = 2,
	NUMPAD = 3
}
interface keyboardKey {
	/** Physical location on a keyboard */
	code?: string;
	/** Character or functional key descriptor */
	key?: string;
	/** Location on the keyboard for keys with multiple representation */
	location?: DOM_KEY_LOCATION;
	/** Does the character in `key` require/imply AltRight to be pressed? */
	altGr?: boolean;
	/** Does the character in `key` require/imply a shiftKey to be pressed? */
	shift?: boolean;
}
declare function parseKeyDef(text: string): {
	keyDef: keyboardKey;
	releasePrevious: boolean;
	releaseSelf: boolean;
	repeat: number;
}[];
declare function resolveScreenshotPath(testPath: string, name: string, config: ResolvedConfig, customPath: string | undefined): string;

declare function defineBrowserCommand<T extends unknown[]>(fn: BrowserCommand<T>): BrowserCommand<T>;

declare const createBrowserServer: BrowserServerFactory;
declare function defineBrowserProvider<T extends object = object>(options: Omit<BrowserProviderOption<T>, "serverFactory" | "options"> & {
	options?: T;
}): BrowserProviderOption;

export { createBrowserServer, defineBrowserCommand, defineBrowserProvider, parseKeyDef, resolveScreenshotPath };
export type { CustomComparatorsRegistry };
