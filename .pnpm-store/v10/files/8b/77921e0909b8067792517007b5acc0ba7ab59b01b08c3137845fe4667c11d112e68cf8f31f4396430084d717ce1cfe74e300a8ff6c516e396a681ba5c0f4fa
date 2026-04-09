import { ResolvedConfig, BrowserServerFactory, BrowserCommand, BrowserProviderOption } from 'vitest/node';
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

/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
type Language = 'javascript';
declare function asLocator(lang: Language, selector: string, isFrameLocator?: boolean): string;

declare function defineBrowserCommand<T extends unknown[]>(fn: BrowserCommand<T>): BrowserCommand<T>;

declare const createBrowserServer: BrowserServerFactory;
declare function defineBrowserProvider<T extends object = object>(options: Omit<BrowserProviderOption<T>, "serverFactory" | "options"> & {
	options?: T;
}): BrowserProviderOption;

export { asLocator, createBrowserServer, defineBrowserCommand, defineBrowserProvider, parseKeyDef, resolveScreenshotPath };
export type { CustomComparatorsRegistry };
