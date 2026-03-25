import { UserEventClickOptions, UserEventClearOptions, UserEventHoverOptions, UserEventFillOptions, UserEventUploadOptions, UserEventDragAndDropOptions, UserEventSelectOptions, LocatorScreenshotOptions, LocatorByRoleOptions, LocatorOptions } from 'vitest/browser';

type ClauseCombinator = '' | '>' | '+' | '~' | '>=';
type CSSFunctionArgument = CSSComplexSelector | number | string;
interface CSSFunction {
    name: string;
    args: CSSFunctionArgument[];
}
interface CSSSimpleSelector {
    css?: string;
    functions: CSSFunction[];
}
interface CSSComplexSelector {
    simples: {
        selector: CSSSimpleSelector;
        combinator: ClauseCombinator;
    }[];
}
type CSSComplexSelectorList = CSSComplexSelector[];

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

interface NestedSelectorBody {
    parsed: ParsedSelector;
    distance?: number;
}
interface ParsedSelectorPart {
    name: string;
    body: string | CSSComplexSelectorList | NestedSelectorBody;
    source: string;
}
interface ParsedSelector {
    parts: ParsedSelectorPart[];
    capture?: number;
}

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

interface GenerateSelectorOptions {
    testIdAttributeName: string;
}

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

interface ElementText {
    full: string;
    normalized: string;
    immediate: string[];
}

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

interface QueryContext {
    scope: Element | Document;
    pierceShadow: boolean;
    originalScope?: Element | Document;
}
type Selector = any;
interface SelectorEvaluator {
    query: (context: QueryContext, selector: Selector) => Element[];
    matches: (element: Element, selector: Selector, context: QueryContext) => boolean;
}
interface SelectorEngine$1 {
    matches?: (element: Element, args: (string | number | Selector)[], context: QueryContext, evaluator: SelectorEvaluator) => boolean;
    query?: (context: QueryContext, args: (string | number | Selector)[], evaluator: SelectorEvaluator) => Element[];
}
declare class SelectorEvaluatorImpl implements SelectorEvaluator {
    private _engines;
    private _cacheQueryCSS;
    private _cacheMatches;
    private _cacheQuery;
    private _cacheMatchesSimple;
    private _cacheMatchesParents;
    private _cacheCallMatches;
    private _cacheCallQuery;
    private _cacheQuerySimple;
    _cacheText: Map<Element | ShadowRoot, ElementText>;
    private _scoreMap;
    private _retainCacheCounter;
    constructor(extraEngines: Map<string, SelectorEngine$1>);
    begin(): void;
    end(): void;
    private _cached;
    private _checkSelector;
    matches(element: Element, s: Selector, context: QueryContext): boolean;
    query(context: QueryContext, s: any): Element[];
    _markScore(element: Element, score: number): void;
    private _hasScopeClause;
    private _expandContextForScopeMatching;
    private _matchesSimple;
    private _querySimple;
    private _matchesParents;
    private _matchesEngine;
    private _queryEngine;
    private _callMatches;
    private _callQuery;
    private _matchesCSS;
    _queryCSS(context: QueryContext, css: string): Element[];
    private _getEngine;
}

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
interface ByRoleOptions {
    checked?: boolean;
    disabled?: boolean;
    exact?: boolean;
    expanded?: boolean;
    includeHidden?: boolean;
    level?: number;
    name?: string | RegExp;
    pressed?: boolean;
    selected?: boolean;
}
declare function getByTestIdSelector(testIdAttributeName: string, testId: string | RegExp): string;
declare function getByLabelSelector(text: string | RegExp, options?: {
    exact?: boolean;
}): string;
declare function getByAltTextSelector(text: string | RegExp, options?: {
    exact?: boolean;
}): string;
declare function getByTitleSelector(text: string | RegExp, options?: {
    exact?: boolean;
}): string;
declare function getByPlaceholderSelector(text: string | RegExp, options?: {
    exact?: boolean;
}): string;
declare function getByTextSelector(text: string | RegExp, options?: {
    exact?: boolean;
}): string;
declare function getByRoleSelector(role: string, options?: ByRoleOptions): string;

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

interface IvyaOptions {
    testIdAttribute: string;
    browser: 'webkit' | 'chromium' | 'firefox';
}
interface IvyaConfiguration {
    testIdAttribute?: string;
    browser: 'webkit' | 'chromium' | 'firefox';
}
declare class Ivya {
    /** @internal */
    _engines: Map<string, SelectorEngine>;
    /** @internal */
    _evaluator: SelectorEvaluatorImpl;
    static options: IvyaOptions;
    private static singleton;
    static create(options: IvyaConfiguration): Ivya;
    private constructor();
    queryLocatorSelector(locator: string, root?: Node, strict?: boolean): Element | null;
    queryLocatorSelectorAll(locator: string, root?: Node): Element[];
    querySelector(selector: ParsedSelector, root: Node, strict?: boolean): Element | null;
    queryAllByRole(text: string, options?: ByRoleOptions, container?: Node): Element[];
    queryAllByLabelText(text: string | RegExp, options?: {
        exact?: boolean;
    }, container?: Node): Element[];
    queryAllByTestId(text: string | RegExp, container?: Node): Element[];
    queryAllByText(text: string | RegExp, options?: {
        exact?: boolean;
    }, container?: Node): Element[];
    queryAllByTitle(text: string | RegExp, options?: {
        exact?: boolean;
    }, container?: Node): Element[];
    queryAllByPlaceholder(text: string | RegExp, options?: {
        exact?: boolean;
    }, container?: Node): Element[];
    queryAllByAltText(text: string | RegExp, options?: {
        exact?: boolean;
    }, container?: Node): Element[];
    queryByRole(text: string, options?: ByRoleOptions, container?: Node): Element | null;
    queryByLabelText(text: string | RegExp, options?: {
        exact?: boolean;
    }, container?: Node): Element | null;
    queryByTestId(text: string | RegExp, container?: Node): Element | null;
    queryByText(text: string | RegExp, options?: {
        exact?: boolean;
    }, container?: Node): Element | null;
    queryByTitle(text: string | RegExp, options?: {
        exact?: boolean;
    }, container?: Node): Element | null;
    queryByPlaceholder(text: string | RegExp, options?: {
        exact?: boolean;
    }, container?: Node): Element | null;
    queryByAltText(text: string | RegExp, options?: {
        exact?: boolean;
    }, container?: Node): Element | null;
    private strictModeViolationError;
    generateSelectorSimple(targetElement: Element, options?: GenerateSelectorOptions): string;
    parseSelector(selector: string): ParsedSelector;
    previewNode(node: Node): string;
    querySelectorAll(selector: ParsedSelector, root: Node): Element[];
    private _queryEngineAll;
    private _queryNth;
    private _queryLayoutSelector;
    private createStacklessError;
    private _createTextEngine;
    private _createAttributeEngine;
    private _createCSSEngine;
    private _createNamedAttributeEngine;
    private _createVisibleEngine;
    private _createControlEngine;
    private _createHasEngine;
    private _createHasNotEngine;
    private _createInternalChainEngine;
    private _createInternalLabelEngine;
    private _createInternalHasTextEngine;
    private _createInternalHasNotTextEngine;
}
type SelectorRoot = Element | ShadowRoot | Document;
interface SelectorEngine {
    queryAll: (root: SelectorRoot, selector: string | any) => Element[];
}

declare function convertElementToCssSelector(element: Element): string;
declare function processTimeoutOptions<T extends {
	timeout?: number;
}>(options_?: T): T | undefined;
declare function getIframeScale(): number;

declare const selectorEngine: Ivya;
declare abstract class Locator {
	abstract selector: string;
	private _parsedSelector;
	protected _container?: Element | undefined;
	protected _pwSelector?: string | undefined;
	constructor();
	click(options?: UserEventClickOptions): Promise<void>;
	dblClick(options?: UserEventClickOptions): Promise<void>;
	tripleClick(options?: UserEventClickOptions): Promise<void>;
	clear(options?: UserEventClearOptions): Promise<void>;
	hover(options?: UserEventHoverOptions): Promise<void>;
	unhover(options?: UserEventHoverOptions): Promise<void>;
	fill(text: string, options?: UserEventFillOptions): Promise<void>;
	upload(files: string | string[] | File | File[], options?: UserEventUploadOptions): Promise<void>;
	dropTo(target: Locator, options?: UserEventDragAndDropOptions): Promise<void>;
	selectOptions(value: HTMLElement | HTMLElement[] | Locator | Locator[] | string | string[], options?: UserEventSelectOptions): Promise<void>;
	screenshot(options: Omit<LocatorScreenshotOptions, "base64"> & {
		base64: true;
	}): Promise<{
		path: string;
		base64: string;
	}>;
	screenshot(options?: LocatorScreenshotOptions): Promise<string>;
	protected abstract locator(selector: string): Locator;
	protected abstract elementLocator(element: Element): Locator;
	getByRole(role: string, options?: LocatorByRoleOptions): Locator;
	getByAltText(text: string | RegExp, options?: LocatorOptions): Locator;
	getByLabelText(text: string | RegExp, options?: LocatorOptions): Locator;
	getByPlaceholder(text: string | RegExp, options?: LocatorOptions): Locator;
	getByTestId(testId: string | RegExp): Locator;
	getByText(text: string | RegExp, options?: LocatorOptions): Locator;
	getByTitle(title: string | RegExp, options?: LocatorOptions): Locator;
	filter(filter: LocatorOptions): Locator;
	and(locator: Locator): Locator;
	or(locator: Locator): Locator;
	query(): HTMLElement | SVGElement | null;
	element(): HTMLElement | SVGElement;
	elements(): (HTMLElement | SVGElement)[];
	get length(): number;
	all(): Locator[];
	nth(index: number): Locator;
	first(): Locator;
	last(): Locator;
	toString(): string;
	toJSON(): string;
	protected triggerCommand<T>(command: string, ...args: any[]): Promise<T>;
}

export { Locator, convertElementToCssSelector, getByAltTextSelector, getByLabelSelector, getByPlaceholderSelector, getByRoleSelector, getByTestIdSelector, getByTextSelector, getByTitleSelector, getIframeScale, processTimeoutOptions, selectorEngine };
