import * as Attributes from './api/attributes.js';
import * as Traversing from './api/traversing.js';
import * as Manipulation from './api/manipulation.js';
import * as Css from './api/css.js';
import * as Forms from './api/forms.js';
export class Cheerio {
    /**
     * Instance of cheerio. Methods are specified in the modules. Usage of this
     * constructor is not recommended. Please use `$.load` instead.
     *
     * @private
     * @param elements - The new selection.
     * @param root - Sets the root node.
     * @param options - Options for the instance.
     */
    constructor(elements, root, options) {
        this.length = 0;
        this.options = options;
        this._root = root;
        if (elements) {
            for (let idx = 0; idx < elements.length; idx++) {
                this[idx] = elements[idx];
            }
            this.length = elements.length;
        }
    }
}
/** Set a signature of the object. */
Cheerio.prototype.cheerio = '[cheerio object]';
/*
 * Make cheerio an array-like object
 */
Cheerio.prototype.splice = Array.prototype.splice;
// Support for (const element of $(...)) iteration:
Cheerio.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
// Plug in the API
Object.assign(Cheerio.prototype, Attributes, Traversing, Manipulation, Css, Forms);
//# sourceMappingURL=cheerio.js.map