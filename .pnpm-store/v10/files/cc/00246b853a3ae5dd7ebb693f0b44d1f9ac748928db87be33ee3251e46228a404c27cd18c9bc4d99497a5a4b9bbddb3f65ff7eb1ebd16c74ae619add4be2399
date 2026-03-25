'use strict';

const cssTree = require('css-tree');

function ensureSelectorList(node) {
    if (node.type === 'Raw') {
        return cssTree.parse(node.value, { context: 'selectorList' });
    }

    return node;
}

function maxSpecificity(a, b) {
    for (let i = 0; i < 3; i++) {
        if (a[i] !== b[i]) {
            return a[i] > b[i] ? a : b;
        }
    }

    return a;
}

function maxSelectorListSpecificity(selectorList) {
    return ensureSelectorList(selectorList).children.reduce(
        (result, node) => maxSpecificity(specificity(node), result),
        [0, 0, 0]
    );
}

// §16. Calculating a selector’s specificity
// https://www.w3.org/TR/selectors-4/#specificity-rules
function specificity(simpleSelector) {
    let A = 0;
    let B = 0;
    let C = 0;

    // A selector’s specificity is calculated for a given element as follows:
    simpleSelector.children.forEach((node) => {
        switch (node.type) {
            // count the number of ID selectors in the selector (= A)
            case 'IdSelector':
                A++;
                break;

            // count the number of class selectors, attributes selectors, ...
            case 'ClassSelector':
            case 'AttributeSelector':
                B++;
                break;

            // ... and pseudo-classes in the selector (= B)
            case 'PseudoClassSelector':
                switch (node.name.toLowerCase()) {
                    // The specificity of an :is(), :not(), or :has() pseudo-class is replaced
                    // by the specificity of the most specific complex selector in its selector list argument.
                    case 'not':
                    case 'has':
                    case 'is':
                    // :matches() is used before it was renamed to :is()
                    // https://github.com/w3c/csswg-drafts/issues/3258
                    case 'matches':
                    // Older browsers support :is() functionality as prefixed pseudo-class :any()
                    // https://developer.mozilla.org/en-US/docs/Web/CSS/:is
                    case '-webkit-any':
                    case '-moz-any': {
                        const [a, b, c] = maxSelectorListSpecificity(node.children.first);

                        A += a;
                        B += b;
                        C += c;

                        break;
                    }

                    // Analogously, the specificity of an :nth-child() or :nth-last-child() selector
                    // is the specificity of the pseudo class itself (counting as one pseudo-class selector)
                    // plus the specificity of the most specific complex selector in its selector list argument (if any).
                    case 'nth-child':
                    case 'nth-last-child': {
                        const arg = node.children.first;

                        if (arg.type === 'Nth' && arg.selector) {
                            const [a, b, c] = maxSelectorListSpecificity(arg.selector);

                            A += a;
                            B += b + 1;
                            C += c;
                        } else {
                            B++;
                        }

                        break;
                    }

                    // The specificity of a :where() pseudo-class is replaced by zero.
                    case 'where':
                        break;

                    // The four Level 2 pseudo-elements (::before, ::after, ::first-line, and ::first-letter) may,
                    // for legacy reasons, be represented using the <pseudo-class-selector> grammar,
                    // with only a single ":" character at their start.
                    // https://www.w3.org/TR/selectors-4/#single-colon-pseudos
                    case 'before':
                    case 'after':
                    case 'first-line':
                    case 'first-letter':
                        C++;
                        break;

                    default:
                        B++;
                }
                break;

            // count the number of type selectors ...
            case 'TypeSelector':
                // ignore the universal selector
                if (!node.name.endsWith('*')) {
                    C++;
                }
                break;

            // ... and pseudo-elements in the selector (= C)
            case 'PseudoElementSelector':
                C++;
                break;
        }
    });

    return [A, B, C];
}

module.exports = specificity;
