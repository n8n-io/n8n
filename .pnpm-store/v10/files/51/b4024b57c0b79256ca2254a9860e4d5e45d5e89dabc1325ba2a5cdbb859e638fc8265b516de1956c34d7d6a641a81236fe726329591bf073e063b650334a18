# Installation
> `npm install --save @types/turndown`

# Summary
This package contains type definitions for turndown (https://github.com/domchristie/turndown).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/turndown.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/turndown/index.d.ts)
````ts
declare class TurndownService {
    constructor(options?: TurndownService.Options);

    addRule(key: string, rule: TurndownService.Rule): this;
    keep(filter: TurndownService.Filter): this;
    remove(filter: TurndownService.Filter): this;
    use(plugins: TurndownService.Plugin | TurndownService.Plugin[]): this;
    escape(str: string): string;

    turndown(html: string | TurndownService.Node): string;

    options: TurndownService.Options;
    rules: TurndownService.Rules;
}

export = TurndownService;

declare namespace TurndownService {
    interface Options {
        headingStyle?: "setext" | "atx" | undefined;
        hr?: string | undefined;
        br?: string | undefined;
        bulletListMarker?: "-" | "+" | "*" | undefined;
        codeBlockStyle?: "indented" | "fenced" | undefined;
        emDelimiter?: "_" | "*" | undefined;
        fence?: "```" | "~~~" | undefined;
        strongDelimiter?: "__" | "**" | undefined;
        linkStyle?: "inlined" | "referenced" | undefined;
        linkReferenceStyle?: "full" | "collapsed" | "shortcut" | undefined;
        preformattedCode?: boolean;

        keepReplacement?: ReplacementFunction | undefined;
        blankReplacement?: ReplacementFunction | undefined;
        defaultReplacement?: ReplacementFunction | undefined;
    }

    interface Rule {
        filter: Filter;
        replacement?: ReplacementFunction | undefined;
    }

    interface Rules {
        options: Options;
        array: Rule[];

        blankRule: ReplacementFunction;
        defaultRule: ReplacementFunction;
        keepReplacement: ReplacementFunction;

        add(key: Filter, rule: Rule): void;
        forEach(callback: (rule: Rule, index: number) => any): void;
        forNode(node: HTMLElement): Rule;
        keep(filter: Filter): void;
        remove(filter: Filter): void;
    }

    type Plugin = (service: TurndownService) => void;
    type Node = HTMLElement | Document | DocumentFragment;

    type Filter = TagName | TagName[] | FilterFunction;
    type FilterFunction = (node: HTMLElement, options: Options) => boolean;

    type ReplacementFunction = (
        content: string,
        node: HTMLElement,
        options: Options,
    ) => string;

    type TagName = keyof HTMLElementTagNameMap;
}

````

### Additional Details
 * Last updated: Sun, 26 Oct 2025 17:33:29 GMT
 * Dependencies: none

# Credits
These definitions were written by [Sergey Zhidkov](https://github.com/sergey-zhidkov).
