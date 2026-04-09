/// <reference types="node" />

interface Document {}

declare namespace cheerio {
    type Element = TextElement | TagElement | CommentElement;

    interface TextElement {
        type: "text";
        next: Element | null;
        prev: Element | null;
        parent: Element;
        data?: string | undefined;
        startIndex?: number | undefined;
        endIndex?: number | undefined;
    }

    interface TagElement {
        tagName: string;
        type: "tag" | "script" | "style";
        name: string;
        attribs: { [attr: string]: string };
        "x-attribsNamespace": { [attr: string]: string };
        "x-prefixNamespace": { [attr: string]: string };
        children: Element[];
        childNodes: Element[] | null;
        lastChild: Element | null;
        firstChild: Element | null;
        next: Element | null;
        nextSibling: Element;
        prev: Element | null;
        previousSibling: Element;
        parent: Element;
        parentNode: Element;
        nodeValue: string;
        data?: string | undefined;
        startIndex?: number | undefined;
        endIndex?: number | undefined;
    }

    interface CommentElement {
        type: "comment";
        next: Element | null;
        prev: Element | null;
        parent: Element;
        data?: string | undefined;
        startIndex?: number | undefined;
        endIndex?: number | undefined;
    }

    type AttrFunction = (el: Element, i: number, currentValue: string) => any;

    interface Cheerio {
        // Document References
        // Cheerio https://github.com/cheeriojs/cheerio
        // JQuery http://api.jquery.com

        [Symbol.iterator](): IterableIterator<Element>;
        [index: number]: Element;
        cheerio: string;
        length: number;

        // Attributes

        attr(): { [attr: string]: string };
        attr(name: string): string | undefined;
        attr(name: string, value: AttrFunction): Cheerio;
        // `value` *can* be `any` here but:
        // 1. That makes type-checking the function-type useless
        // 2. It's converted to a string anyways
        attr(name: string, value: string): Cheerio;
        // The map's values *can* be `any` but they'll all be cast to strings
        // regardless.
        attr(map: { [key: string]: any }): Cheerio;

        data(): any;
        data(name: string): any;
        data(name: string, value: any): any;

        val(): string;
        val(value: string): Cheerio;

        removeAttr(name: string): Cheerio;

        has(selector: string): Cheerio;
        has(element: Element): Cheerio;

        hasClass(className: string): boolean;
        addClass(classNames: string): Cheerio;

        removeClass(): Cheerio;
        removeClass(className: string): Cheerio;
        removeClass(func: (index: number, className: string) => string): Cheerio;

        toggleClass(className: string): Cheerio;
        toggleClass(className: string, toggleSwitch: boolean): Cheerio;
        toggleClass(toggleSwitch?: boolean): Cheerio;
        toggleClass(
            func: (index: number, className: string, toggleSwitch: boolean) => string,
            toggleSwitch?: boolean,
        ): Cheerio;

        is(selector: string): boolean;
        is(element: Element): boolean;
        is(element: Element[]): boolean;
        is(selection: Cheerio): boolean;
        is(func: (index: number, element: Element) => boolean): boolean;

        // Form
        serialize(): string;
        serializeArray(): Array<{ name: string; value: string }>;

        // Traversing

        find(selector: string): Cheerio;
        find(element: Cheerio): Cheerio;

        parent(selector?: string): Cheerio;
        parents(selector?: string): Cheerio;
        parentsUntil(selector?: string, filter?: string): Cheerio;
        parentsUntil(element: Element, filter?: string): Cheerio;
        parentsUntil(element: Cheerio, filter?: string): Cheerio;

        prop(name: string): any;
        prop(name: string, value: any): Cheerio;

        closest(): Cheerio;
        closest(selector: string): Cheerio;

        next(selector?: string): Cheerio;
        nextAll(): Cheerio;
        nextAll(selector: string): Cheerio;

        nextUntil(selector?: string, filter?: string): Cheerio;
        nextUntil(element: Element, filter?: string): Cheerio;
        nextUntil(element: Cheerio, filter?: string): Cheerio;

        prev(selector?: string): Cheerio;
        prevAll(): Cheerio;
        prevAll(selector: string): Cheerio;

        prevUntil(selector?: string, filter?: string): Cheerio;
        prevUntil(element: Element, filter?: string): Cheerio;
        prevUntil(element: Cheerio, filter?: string): Cheerio;

        slice(start: number, end?: number): Cheerio;

        siblings(selector?: string): Cheerio;

        children(selector?: string): Cheerio;

        contents(): Cheerio;

        each(func: (index: number, element: Element) => any): Cheerio;
        map(func: (index: number, element: Element) => any): Cheerio;

        filter(selector: string): Cheerio;
        filter(selection: Cheerio): Cheerio;
        filter(element: Element): Cheerio;
        filter(elements: Element[]): Cheerio;
        filter(func: (index: number, element: Element) => boolean): Cheerio;

        not(selector: string): Cheerio;
        not(selection: Cheerio): Cheerio;
        not(element: Element): Cheerio;
        not(func: (index: number, element: Element) => boolean): Cheerio;

        first(): Cheerio;
        last(): Cheerio;

        eq(index: number): Cheerio;

        get(): any[];
        get(index: number): any;

        index(): number;
        index(selector: string): number;
        index(selection: Cheerio): number;

        end(): Cheerio;

        add(selectorOrHtml: string): Cheerio;
        add(selector: string, context: Document): Cheerio;
        add(element: Element): Cheerio;
        add(elements: Element[]): Cheerio;
        add(selection: Cheerio): Cheerio;

        addBack(): Cheerio;
        addBack(filter: string): Cheerio;

        // Manipulation
        appendTo(target: Cheerio): Cheerio;
        prependTo(target: Cheerio): Cheerio;

        append(content: string, ...contents: any[]): Cheerio;
        append(content: Document, ...contents: any[]): Cheerio;
        append(content: Document[], ...contents: any[]): Cheerio;
        append(content: Cheerio, ...contents: any[]): Cheerio;

        prepend(content: string, ...contents: any[]): Cheerio;
        prepend(content: Document, ...contents: any[]): Cheerio;
        prepend(content: Document[], ...contents: any[]): Cheerio;
        prepend(content: Cheerio, ...contents: any[]): Cheerio;

        after(content: string, ...contents: any[]): Cheerio;
        after(content: Document, ...contents: any[]): Cheerio;
        after(content: Document[], ...contents: any[]): Cheerio;
        after(content: Cheerio, ...contents: any[]): Cheerio;

        insertAfter(content: string): Cheerio;
        insertAfter(content: Document): Cheerio;
        insertAfter(content: Cheerio): Cheerio;

        before(content: string, ...contents: any[]): Cheerio;
        before(content: Document, ...contents: any[]): Cheerio;
        before(content: Document[], ...contents: any[]): Cheerio;
        before(content: Cheerio, ...contents: any[]): Cheerio;

        insertBefore(content: string): Cheerio;
        insertBefore(content: Document): Cheerio;
        insertBefore(content: Cheerio): Cheerio;

        remove(selector?: string): Cheerio;

        replaceWith(content: string): Cheerio;
        replaceWith(content: Element): Cheerio;
        replaceWith(content: Element[]): Cheerio;
        replaceWith(content: Cheerio): Cheerio;
        replaceWith(content: () => Cheerio): Cheerio;

        empty(): Cheerio;

        html(): string | null;
        html(html: string): Cheerio;

        text(): string;
        text(text: string): Cheerio;

        wrap(content: string): Cheerio;
        wrap(content: Document): Cheerio;
        wrap(content: Cheerio): Cheerio;

        css(propertyName?: string): string;
        css(propertyNames: string[]): string[];
        css(propertyName: string, value: string): Cheerio;
        css(propertyName: string, value: number): Cheerio;
        css(propertyName: string, func: (index: number, value: string) => string): Cheerio;
        css(propertyName: string, func: (index: number, value: string) => number): Cheerio;
        css(properties: Object): Cheerio;

        // Rendering

        // Miscellaneous

        clone(): Cheerio;

        // Not Documented

        toArray(): Element[];
    }

    interface CheerioParserOptions {
        // Document References
        // Cheerio https://github.com/cheeriojs/cheerio
        // HTMLParser2 https://github.com/fb55/htmlparser2/wiki/Parser-options
        // DomHandler https://github.com/fb55/DomHandler

        xmlMode?: boolean | undefined;
        decodeEntities?: boolean | undefined;
        lowerCaseTags?: boolean | undefined;
        lowerCaseAttributeNames?: boolean | undefined;
        recognizeCDATA?: boolean | undefined;
        recognizeSelfClosing?: boolean | undefined;
        normalizeWhitespace?: boolean | undefined;
        withStartIndices?: boolean | undefined;
        withEndIndices?: boolean | undefined;
        ignoreWhitespace?: boolean | undefined;
        _useHtmlParser2?: boolean | undefined;
    }

    interface Selector {
        (selector: string): Cheerio;
        (selector: string, context: string): Cheerio;
        (selector: string, context: Element): Cheerio;
        (selector: string, context: Element[]): Cheerio;
        (selector: string, context: Cheerio): Cheerio;
        (selector: string, context: string, root: string): Cheerio;
        (selector: string, context: Element, root: string): Cheerio;
        (selector: string, context: Element[], root: string): Cheerio;
        (selector: string, context: Cheerio, root: string): Cheerio;
        (selector: any): Cheerio;
    }

    interface Root extends Selector {
        // Document References
        // Cheerio https://github.com/cheeriojs/cheerio
        // JQuery http://api.jquery.com
        root(): Cheerio;
        contains(container: Element, contained: Element): boolean;
        parseHTML(data: string, context?: Document | null, keepScripts?: boolean): Document[];

        html(options?: CheerioParserOptions): string;
        html(dom: string | Cheerio | Element, options?: CheerioParserOptions): string;

        xml(dom?: string | Cheerio | Element): string;
    }

    interface CheerioAPI extends Root {
        version: string;
        load(html: string | Buffer, options?: CheerioParserOptions): Root;
        load(element: Element | Element[], options?: CheerioParserOptions): Root;
    }
}

declare module "cheerio" {
    const cheerioModule: cheerio.CheerioAPI;
    export = cheerioModule;
}
