/* eslint no-console:0 */

import katex from "katex";
import splitAtDelimiters from "./splitAtDelimiters";

/* Note: optionsCopy is mutated by this method. If it is ever exposed in the
 * API, we should copy it before mutating.
 */
const renderMathInText = function(text, optionsCopy) {
    const data = splitAtDelimiters(text, optionsCopy.delimiters);
    if (data.length === 1 && data[0].type === 'text') {
        // There is no formula in the text.
        // Let's return null which means there is no need to replace
        // the current text node with a new one.
        return null;
    }

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < data.length; i++) {
        if (data[i].type === "text") {
            fragment.appendChild(document.createTextNode(data[i].data));
        } else {
            const span = document.createElement("span");
            let math = data[i].data;
            // Override any display mode defined in the settings with that
            // defined by the text itself
            optionsCopy.displayMode = data[i].display;
            try {
                if (optionsCopy.preProcess) {
                    math = optionsCopy.preProcess(math);
                }
                katex.render(math, span, optionsCopy);
            } catch (e) {
                if (!(e instanceof katex.ParseError)) {
                    throw e;
                }
                optionsCopy.errorCallback(
                    "KaTeX auto-render: Failed to parse `" + data[i].data +
                        "` with ",
                    e
                );
                fragment.appendChild(document.createTextNode(data[i].rawData));
                continue;
            }
            fragment.appendChild(span);
        }
    }

    return fragment;
};

const renderElem = function(elem, optionsCopy) {
    for (let i = 0; i < elem.childNodes.length; i++) {
        const childNode = elem.childNodes[i];
        if (childNode.nodeType === 3) {
            // Text node
            // Concatenate all sibling text nodes.
            // Webkit browsers split very large text nodes into smaller ones,
            // so the delimiters may be split across different nodes.
            let textContentConcat = childNode.textContent;
            let sibling = childNode.nextSibling;
            let nSiblings = 0;
            while (sibling && (sibling.nodeType === Node.TEXT_NODE)) {
                textContentConcat += sibling.textContent;
                sibling = sibling.nextSibling;
                nSiblings++;
            }
            const frag = renderMathInText(textContentConcat, optionsCopy);
            if (frag) {
                // Remove extra text nodes
                for (let j = 0; j < nSiblings; j++) {
                    childNode.nextSibling.remove();
                }
                i += frag.childNodes.length - 1;
                elem.replaceChild(frag, childNode);
            } else {
                // If the concatenated text does not contain math
                // the siblings will not either
                i += nSiblings;
            }
        } else if (childNode.nodeType === 1) {
            // Element node
            const className = ' ' + childNode.className + ' ';
            const shouldRender = optionsCopy.ignoredTags.indexOf(
                childNode.nodeName.toLowerCase()) === -1 &&
                  optionsCopy.ignoredClasses.every(
                      x => className.indexOf(' ' + x + ' ') === -1);

            if (shouldRender) {
                renderElem(childNode, optionsCopy);
            }
        }
        // Otherwise, it's something else, and ignore it.
    }
};

const renderMathInElement = function(elem, options) {
    if (!elem) {
        throw new Error("No element provided to render");
    }

    const optionsCopy = {};

    // Object.assign(optionsCopy, option)
    for (const option in options) {
        if (options.hasOwnProperty(option)) {
            optionsCopy[option] = options[option];
        }
    }

    // default options
    optionsCopy.delimiters = optionsCopy.delimiters || [
        {left: "$$", right: "$$", display: true},
        {left: "\\(", right: "\\)", display: false},
        // LaTeX uses $…$, but it ruins the display of normal `$` in text:
        // {left: "$", right: "$", display: false},
        // $ must come after $$

        // Render AMS environments even if outside $$…$$ delimiters.
        {left: "\\begin{equation}", right: "\\end{equation}", display: true},
        {left: "\\begin{align}", right: "\\end{align}", display: true},
        {left: "\\begin{alignat}", right: "\\end{alignat}", display: true},
        {left: "\\begin{gather}", right: "\\end{gather}", display: true},
        {left: "\\begin{CD}", right: "\\end{CD}", display: true},

        {left: "\\[", right: "\\]", display: true},
    ];
    optionsCopy.ignoredTags = optionsCopy.ignoredTags || [
        "script", "noscript", "style", "textarea", "pre", "code", "option",
    ];
    optionsCopy.ignoredClasses = optionsCopy.ignoredClasses || [];
    optionsCopy.errorCallback = optionsCopy.errorCallback || console.error;

    // Enable sharing of global macros defined via `\gdef` between different
    // math elements within a single call to `renderMathInElement`.
    optionsCopy.macros = optionsCopy.macros || {};

    renderElem(elem, optionsCopy);
};

export default renderMathInElement;
