import { default as defaultOptions, flatten as flattenOptions, } from './options.js';
import * as staticMethods from './static.js';
import { Cheerio } from './cheerio.js';
import { isHtml, isCheerio } from './utils.js';
export function getLoad(parse, render) {
    /**
     * Create a querying function, bound to a document created from the provided markup.
     *
     * Note that similar to web browser contexts, this operation may introduce
     * `<html>`, `<head>`, and `<body>` elements; set `isDocument` to `false` to
     * switch to fragment mode and disable this.
     *
     * @param content - Markup to be loaded.
     * @param options - Options for the created instance.
     * @param isDocument - Allows parser to be switched to fragment mode.
     * @returns The loaded document.
     * @see {@link https://cheerio.js.org#loading} for additional usage information.
     */
    return function load(content, options, isDocument = true) {
        if (content == null) {
            throw new Error('cheerio.load() expects a string');
        }
        const internalOpts = { ...defaultOptions, ...flattenOptions(options) };
        const initialRoot = parse(content, internalOpts, isDocument, null);
        /** Create an extended class here, so that extensions only live on one instance. */
        class LoadedCheerio extends Cheerio {
            _make(selector, context) {
                const cheerio = initialize(selector, context);
                cheerio.prevObject = this;
                return cheerio;
            }
            _parse(content, options, isDocument, context) {
                return parse(content, options, isDocument, context);
            }
            _render(dom) {
                return render(dom, this.options);
            }
        }
        function initialize(selector, context, root = initialRoot, opts) {
            // $($)
            if (selector && isCheerio(selector))
                return selector;
            const options = {
                ...internalOpts,
                ...flattenOptions(opts),
            };
            const r = typeof root === 'string'
                ? [parse(root, options, false, null)]
                : 'length' in root
                    ? root
                    : [root];
            const rootInstance = isCheerio(r)
                ? r
                : new LoadedCheerio(r, null, options);
            // Add a cyclic reference, so that calling methods on `_root` never fails.
            rootInstance._root = rootInstance;
            // $(), $(null), $(undefined), $(false)
            if (!selector) {
                return new LoadedCheerio(undefined, rootInstance, options);
            }
            const elements = typeof selector === 'string' && isHtml(selector)
                ? // $(<html>)
                    parse(selector, options, false, null).children
                : isNode(selector)
                    ? // $(dom)
                        [selector]
                    : Array.isArray(selector)
                        ? // $([dom])
                            selector
                        : undefined;
            const instance = new LoadedCheerio(elements, rootInstance, options);
            if (elements) {
                return instance;
            }
            if (typeof selector !== 'string') {
                throw new Error('Unexpected type of selector');
            }
            // We know that our selector is a string now.
            let search = selector;
            const searchContext = !context
                ? // If we don't have a context, maybe we have a root, from loading
                    rootInstance
                : typeof context === 'string'
                    ? isHtml(context)
                        ? // $('li', '<ul>...</ul>')
                            new LoadedCheerio([parse(context, options, false, null)], rootInstance, options)
                        : // $('li', 'ul')
                            ((search = `${context} ${search}`), rootInstance)
                    : isCheerio(context)
                        ? // $('li', $)
                            context
                        : // $('li', node), $('li', [nodes])
                            new LoadedCheerio(Array.isArray(context) ? context : [context], rootInstance, options);
            // If we still don't have a context, return
            if (!searchContext)
                return instance;
            /*
             * #id, .class, tag
             */
            return searchContext.find(search);
        }
        // Add in static methods & properties
        Object.assign(initialize, staticMethods, {
            load,
            // `_root` and `_options` are used in static methods.
            _root: initialRoot,
            _options: internalOpts,
            // Add `fn` for plugins
            fn: LoadedCheerio.prototype,
            // Add the prototype here to maintain `instanceof` behavior.
            prototype: LoadedCheerio.prototype,
        });
        return initialize;
    };
}
function isNode(obj) {
    return (!!obj.name ||
        obj.type === 'root' ||
        obj.type === 'text' ||
        obj.type === 'comment');
}
//# sourceMappingURL=load.js.map