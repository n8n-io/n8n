/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference types="node" />

import { EventEmitter } from "events";
import { Token } from "parse5";
import { Context } from "vm";
import * as tough from "tough-cookie";

// Needed to allow adding properties to `DOMWindow` that are only supported
// in newer TypeScript versions:
// tslint:disable-next-line: no-declare-current-package no-single-declare-module
declare module "jsdom" {
    const toughCookie: typeof tough;
    class CookieJar extends tough.CookieJar {}

    interface AbortablePromise<T> extends Promise<T> {
        abort(): void;
    }

    class JSDOM {
        constructor(html?: string | Buffer | BinaryData, options?: ConstructorOptions);

        static fromURL(url: string, options?: BaseOptions): Promise<JSDOM>;
        static fromFile(url: string, options?: FileOptions): Promise<JSDOM>;
        static fragment(html: string): DocumentFragment;

        readonly window: DOMWindow;
        readonly virtualConsole: VirtualConsole;
        readonly cookieJar: CookieJar;

        /**
         * The serialize() method will return the HTML serialization of the document, including the doctype.
         */
        serialize(): string;

        /**
         * The nodeLocation() method will find where a DOM node is within the source document,
         * returning the parse5 location info for the node.
         *
         * @throws {Error} If the JSDOM was not created with `includeNodeLocations`
         */
        nodeLocation(node: Node): Token.Location | null | undefined;

        /**
         * The built-in `vm` module of Node.js is what underpins JSDOM's script-running magic.
         * Some advanced use cases, like pre-compiling a script and then running it multiple
         * times, benefit from using the `vm` module directly with a jsdom-created `Window`.
         *
         * @throws {TypeError} If the `JSDOM` instance was created without `runScripts` set, or if you are using JSDOM in a web browser.
         */
        getInternalVMContext(): Context;

        /**
         * The reconfigure method allows changing the `window.top` and url from the outside.
         */
        reconfigure(settings: ReconfigureSettings): void;
    }

    class ResourceLoader {
        fetch(url: string, options: FetchOptions): AbortablePromise<Buffer> | null;

        constructor(obj?: ResourceLoaderConstructorOptions);
    }

    class VirtualConsole extends EventEmitter {
        on<K extends keyof Console>(method: K, callback: Console[K]): this;
        on(event: "jsdomError", callback: (e: Error) => void): this;

        sendTo(console: Console, options?: VirtualConsoleSendToOptions): this;
    }

    type BinaryData = ArrayBufferLike | NodeJS.ArrayBufferView;
    interface BaseOptions {
        /**
         * referrer just affects the value read from document.referrer.
         * It defaults to no referrer (which reflects as the empty string).
         */
        referrer?: string | undefined;

        /**
         * userAgent affects the value read from navigator.userAgent, as well as the User-Agent header sent while fetching subresources.
         *
         * @default
         * `Mozilla/5.0 (${process.platform}) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/${jsdomVersion}`
         */
        userAgent?: string | undefined;

        /**
         * `includeNodeLocations` preserves the location info produced by the HTML parser,
         * allowing you to retrieve it with the nodeLocation() method (described below).
         *
         * It defaults to false to give the best performance,
         * and cannot be used with an XML content type since our XML parser does not support location info.
         *
         * @default false
         */
        includeNodeLocations?: boolean | undefined;
        runScripts?: "dangerously" | "outside-only" | undefined;
        resources?: "usable" | ResourceLoader | undefined;
        virtualConsole?: VirtualConsole | undefined;
        cookieJar?: CookieJar | undefined;

        /**
         * jsdom does not have the capability to render visual content, and will act like a headless browser by default.
         * It provides hints to web pages through APIs such as document.hidden that their content is not visible.
         *
         * When the `pretendToBeVisual` option is set to `true`, jsdom will pretend that it is rendering and displaying
         * content.
         *
         * @default false
         */
        pretendToBeVisual?: boolean | undefined;
        beforeParse?(window: DOMWindow): void;
    }

    interface FileOptions extends BaseOptions {
        /**
         * url sets the value returned by window.location, document.URL, and document.documentURI,
         * and affects things like resolution of relative URLs within the document
         * and the same-origin restrictions and referrer used while fetching subresources.
         * It will default to a file URL corresponding to the given filename, instead of to "about:blank".
         */
        url?: string | undefined;

        /**
         * contentType affects the value read from document.contentType, and how the document is parsed: as HTML or as XML.
         * Values that are not "text/html" or an XML mime type will throw. It will default to "application/xhtml+xml" if
         * the given filename ends in .xhtml or .xml; otherwise it will continue to default to "text/html".
         */
        contentType?: string | undefined;
    }

    interface ConstructorOptions extends BaseOptions {
        /**
         * url sets the value returned by window.location, document.URL, and document.documentURI,
         * and affects things like resolution of relative URLs within the document
         * and the same-origin restrictions and referrer used while fetching subresources.
         * It defaults to "about:blank".
         */
        url?: string | undefined;

        /**
         * contentType affects the value read from document.contentType, and how the document is parsed: as HTML or as XML.
         * Values that are not "text/html" or an XML mime type will throw. It defaults to "text/html".
         */
        contentType?: SupportedContentTypes | undefined;

        /**
         * The maximum size in code units for the separate storage areas used by localStorage and sessionStorage.
         * Attempts to store data larger than this limit will cause a DOMException to be thrown. By default, it is set
         * to 5,000,000 code units per origin, as inspired by the HTML specification.
         *
         * @default 5_000_000
         */
        storageQuota?: number | undefined;
    }

    type SupportedContentTypes = 'text/html' | 'application/xhtml+xml' | 'application/xml' | 'text/xml' | 'image/svg+xml';

    interface VirtualConsoleSendToOptions {
        omitJSDOMErrors: boolean;
    }

    interface ReconfigureSettings {
        windowTop?: DOMWindow | undefined;
        url?: string | undefined;
    }

    interface FetchOptions {
        cookieJar?: CookieJar | undefined;
        referrer?: string | undefined;
        accept?: string | undefined;
        element?: HTMLScriptElement | HTMLLinkElement | HTMLIFrameElement | HTMLImageElement | undefined;
    }

    interface ResourceLoaderConstructorOptions {
        strictSSL?: boolean | undefined;
        proxy?: string | undefined;
        userAgent?: string | undefined;
    }

    interface DOMWindow extends Omit<Window, "top" | "self" | "window"> {
        [key: string]: any;

        /* node_modules/jsdom/browser/Window.js */
        Window: typeof Window;
        readonly top: DOMWindow;
        readonly self: DOMWindow;
        readonly window: DOMWindow;

        /* ECMAScript Globals */
        globalThis: DOMWindow;
        readonly ["Infinity"]: number;
        readonly ["NaN"]: number;
        readonly undefined: undefined;

        eval(script: string): unknown;
        parseInt(s: string, radix?: number): number;
        parseFloat(string: string): number;
        isNaN(number: number): boolean;
        isFinite(number: number): boolean;
        decodeURI(encodedURI: string): string;
        decodeURIComponent(encodedURIComponent: string): string;
        encodeURI(uri: string): string;
        encodeURIComponent(uriComponent: string | number | boolean): string;
        escape(string: string): string;
        unescape(string: string): string;

        Array: typeof Array;
        ArrayBuffer: typeof ArrayBuffer;
        Atomics: typeof Atomics;
        BigInt: typeof BigInt;
        BigInt64Array: typeof BigInt64Array;
        BigUint64Array: typeof BigUint64Array;
        Boolean: typeof Boolean;
        DataView: typeof DataView;
        Date: typeof Date;
        Error: typeof Error;
        EvalError: typeof EvalError;
        Float32Array: typeof Float32Array;
        Float64Array: typeof Float64Array;
        Function: typeof Function;
        Int16Array: typeof Int16Array;
        Int32Array: typeof Int32Array;
        Int8Array: typeof Int8Array;
        Intl: typeof Intl;
        JSON: typeof JSON;
        Map: typeof Map;
        Math: typeof Math;
        Number: typeof Number;
        Object: typeof Object;
        Promise: typeof Promise;
        Proxy: typeof Proxy;
        RangeError: typeof RangeError;
        ReferenceError: typeof ReferenceError;
        Reflect: typeof Reflect;
        RegExp: typeof RegExp;
        Set: typeof Set;
        SharedArrayBuffer: typeof SharedArrayBuffer;
        String: typeof String;
        Symbol: typeof Symbol;
        SyntaxError: typeof SyntaxError;
        TypeError: typeof TypeError;
        URIError: typeof URIError;
        Uint16Array: typeof Uint16Array;
        Uint32Array: typeof Uint32Array;
        Uint8Array: typeof Uint8Array;
        Uint8ClampedArray: typeof Uint8ClampedArray;
        WeakMap: typeof WeakMap;
        WeakSet: typeof WeakSet;
        WebAssembly: typeof WebAssembly;

        /* node_modules/jsdom/living/interfaces.js */
        DOMException: typeof DOMException;

        URL: typeof URL;
        URLSearchParams: typeof URLSearchParams;

        EventTarget: typeof EventTarget;

        NamedNodeMap: typeof NamedNodeMap;
        Node: typeof Node;
        Attr: typeof Attr;
        Element: typeof Element;
        DocumentFragment: typeof DocumentFragment;
        DOMImplementation: typeof DOMImplementation;
        Document: typeof Document;
        HTMLDocument: typeof HTMLDocument;
        XMLDocument: typeof XMLDocument;
        CharacterData: typeof CharacterData;
        Text: typeof Text;
        CDATASection: typeof CDATASection;
        ProcessingInstruction: typeof ProcessingInstruction;
        Comment: typeof Comment;
        DocumentType: typeof DocumentType;
        NodeList: typeof NodeList;
        HTMLCollection: typeof HTMLCollection;
        HTMLOptionsCollection: typeof HTMLOptionsCollection;
        DOMStringMap: typeof DOMStringMap;
        DOMTokenList: typeof DOMTokenList;

        StyleSheetList: typeof StyleSheetList;

        HTMLElement: typeof HTMLElement;
        HTMLHeadElement: typeof HTMLHeadElement;
        HTMLTitleElement: typeof HTMLTitleElement;
        HTMLBaseElement: typeof HTMLBaseElement;
        HTMLLinkElement: typeof HTMLLinkElement;
        HTMLMetaElement: typeof HTMLMetaElement;
        HTMLStyleElement: typeof HTMLStyleElement;
        HTMLBodyElement: typeof HTMLBodyElement;
        HTMLHeadingElement: typeof HTMLHeadingElement;
        HTMLParagraphElement: typeof HTMLParagraphElement;
        HTMLHRElement: typeof HTMLHRElement;
        HTMLPreElement: typeof HTMLPreElement;
        HTMLUListElement: typeof HTMLUListElement;
        HTMLOListElement: typeof HTMLOListElement;
        HTMLLIElement: typeof HTMLLIElement;
        HTMLMenuElement: typeof HTMLMenuElement;
        HTMLDListElement: typeof HTMLDListElement;
        HTMLDivElement: typeof HTMLDivElement;
        HTMLAnchorElement: typeof HTMLAnchorElement;
        HTMLAreaElement: typeof HTMLAreaElement;
        HTMLBRElement: typeof HTMLBRElement;
        HTMLButtonElement: typeof HTMLButtonElement;
        HTMLCanvasElement: typeof HTMLCanvasElement;
        HTMLDataElement: typeof HTMLDataElement;
        HTMLDataListElement: typeof HTMLDataListElement;
        HTMLDetailsElement: typeof HTMLDetailsElement;
        HTMLDialogElement: {
            new(): HTMLDialogElement;
            readonly prototype: HTMLDialogElement;
        };
        HTMLDirectoryElement: typeof HTMLDirectoryElement;
        HTMLFieldSetElement: typeof HTMLFieldSetElement;
        HTMLFontElement: typeof HTMLFontElement;
        HTMLFormElement: typeof HTMLFormElement;
        HTMLHtmlElement: typeof HTMLHtmlElement;
        HTMLImageElement: typeof HTMLImageElement;
        HTMLInputElement: typeof HTMLInputElement;
        HTMLLabelElement: typeof HTMLLabelElement;
        HTMLLegendElement: typeof HTMLLegendElement;
        HTMLMapElement: typeof HTMLMapElement;
        HTMLMarqueeElement: typeof HTMLMarqueeElement;
        HTMLMediaElement: typeof HTMLMediaElement;
        HTMLMeterElement: typeof HTMLMeterElement;
        HTMLModElement: typeof HTMLModElement;
        HTMLOptGroupElement: typeof HTMLOptGroupElement;
        HTMLOptionElement: typeof HTMLOptionElement;
        HTMLOutputElement: typeof HTMLOutputElement;
        HTMLPictureElement: typeof HTMLPictureElement;
        HTMLProgressElement: typeof HTMLProgressElement;
        HTMLQuoteElement: typeof HTMLQuoteElement;
        HTMLScriptElement: typeof HTMLScriptElement;
        HTMLSelectElement: typeof HTMLSelectElement;
        HTMLSlotElement: typeof HTMLSlotElement;
        HTMLSourceElement: typeof HTMLSourceElement;
        HTMLSpanElement: typeof HTMLSpanElement;
        HTMLTableCaptionElement: typeof HTMLTableCaptionElement;
        HTMLTableCellElement: typeof HTMLTableCellElement;
        HTMLTableColElement: typeof HTMLTableColElement;
        HTMLTableElement: typeof HTMLTableElement;
        HTMLTimeElement: typeof HTMLTimeElement;
        HTMLTableRowElement: typeof HTMLTableRowElement;
        HTMLTableSectionElement: typeof HTMLTableSectionElement;
        HTMLTemplateElement: typeof HTMLTemplateElement;
        HTMLTextAreaElement: typeof HTMLTextAreaElement;
        HTMLUnknownElement: typeof HTMLUnknownElement;
        HTMLFrameElement: typeof HTMLFrameElement;
        HTMLFrameSetElement: typeof HTMLFrameSetElement;
        HTMLIFrameElement: typeof HTMLIFrameElement;
        HTMLEmbedElement: typeof HTMLEmbedElement;
        HTMLObjectElement: typeof HTMLObjectElement;
        HTMLParamElement: typeof HTMLParamElement;
        HTMLVideoElement: typeof HTMLVideoElement;
        HTMLAudioElement: typeof HTMLAudioElement;
        HTMLTrackElement: typeof HTMLTrackElement;

        SVGElement: typeof SVGElement;
        SVGGraphicsElement: typeof SVGGraphicsElement;
        SVGSVGElement: typeof SVGSVGElement;
        SVGTitleElement: typeof SVGTitleElement;
        SVGAnimatedString: typeof SVGAnimatedString;
        SVGNumber: typeof SVGNumber;
        SVGStringList: typeof SVGStringList;

        Event: typeof Event;
        CloseEvent: typeof CloseEvent;
        CustomEvent: typeof CustomEvent;
        MessageEvent: typeof MessageEvent;
        ErrorEvent: typeof ErrorEvent;
        HashChangeEvent: typeof HashChangeEvent;
        PopStateEvent: typeof PopStateEvent;
        StorageEvent: typeof StorageEvent;
        ProgressEvent: typeof ProgressEvent;
        PageTransitionEvent: typeof PageTransitionEvent;

        UIEvent: typeof UIEvent;
        FocusEvent: typeof FocusEvent;
        MouseEvent: typeof MouseEvent;
        KeyboardEvent: typeof KeyboardEvent;
        TouchEvent: typeof TouchEvent;
        CompositionEvent: typeof CompositionEvent;
        WheelEvent: typeof WheelEvent;

        BarProp: typeof BarProp;
        Location: typeof Location;
        History: typeof History;
        Screen: typeof Screen;
        Performance: typeof Performance;
        Navigator: typeof Navigator;

        PluginArray: typeof PluginArray;
        MimeTypeArray: typeof MimeTypeArray;
        Plugin: typeof Plugin;
        MimeType: typeof MimeType;

        FileReader: typeof FileReader;
        Blob: typeof Blob;
        File: typeof File;
        FileList: typeof FileList;
        ValidityState: typeof ValidityState;

        DOMParser: typeof DOMParser;
        XMLSerializer: typeof XMLSerializer;

        FormData: typeof FormData;
        XMLHttpRequestEventTarget: typeof XMLHttpRequestEventTarget;
        XMLHttpRequestUpload: typeof XMLHttpRequestUpload;
        XMLHttpRequest: typeof XMLHttpRequest;
        WebSocket: typeof WebSocket;

        NodeFilter: typeof NodeFilter;
        NodeIterator: typeof NodeIterator;
        TreeWalker: typeof TreeWalker;

        AbstractRange: typeof AbstractRange;
        Range: typeof Range;
        StaticRange: typeof StaticRange;
        Selection: typeof Selection;

        Storage: typeof Storage;

        CustomElementRegistry: typeof CustomElementRegistry;
        ShadowRoot: typeof ShadowRoot;

        MutationObserver: typeof MutationObserver;
        MutationRecord: typeof MutationRecord;

        Headers: typeof Headers;
        AbortController: typeof AbortController;
        AbortSignal: typeof AbortSignal;

        /* node_modules/jsdom/level2/style.js */
        StyleSheet: typeof StyleSheet;
        MediaList: typeof MediaList;
        CSSStyleSheet: typeof CSSStyleSheet;
        CSSRule: typeof CSSRule;
        CSSStyleRule: typeof CSSStyleRule;
        CSSMediaRule: typeof CSSMediaRule;
        CSSImportRule: typeof CSSImportRule;
        CSSStyleDeclaration: typeof CSSStyleDeclaration;

        /* node_modules/jsdom/level3/xpath.js */
        // XPathException: typeof XPathException;
        XPathExpression: typeof XPathExpression;
        XPathResult: typeof XPathResult;
        XPathEvaluator: typeof XPathEvaluator;
    }
}
