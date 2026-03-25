import { isTag } from '../utils.js';
/*
 * https://github.com/jquery/jquery/blob/2.1.3/src/manipulation/var/rcheckableType.js
 * https://github.com/jquery/jquery/blob/2.1.3/src/serialize.js
 */
const submittableSelector = 'input,select,textarea,keygen';
const r20 = /%20/g;
const rCRLF = /\r?\n/g;
/**
 * Encode a set of form elements as a string for submission.
 *
 * @category Forms
 * @example
 *
 * ```js
 * $('<form><input name="foo" value="bar" /></form>').serialize();
 * //=> 'foo=bar'
 * ```
 *
 * @returns The serialized form.
 * @see {@link https://api.jquery.com/serialize/}
 */
export function serialize() {
    // Convert form elements into name/value objects
    const arr = this.serializeArray();
    // Serialize each element into a key/value string
    const retArr = arr.map((data) => `${encodeURIComponent(data.name)}=${encodeURIComponent(data.value)}`);
    // Return the resulting serialization
    return retArr.join('&').replace(r20, '+');
}
/**
 * Encode a set of form elements as an array of names and values.
 *
 * @category Forms
 * @example
 *
 * ```js
 * $('<form><input name="foo" value="bar" /></form>').serializeArray();
 * //=> [ { name: 'foo', value: 'bar' } ]
 * ```
 *
 * @returns The serialized form.
 * @see {@link https://api.jquery.com/serializeArray/}
 */
export function serializeArray() {
    // Resolve all form elements from either forms or collections of form elements
    return this.map((_, elem) => {
        const $elem = this._make(elem);
        if (isTag(elem) && elem.name === 'form') {
            return $elem.find(submittableSelector).toArray();
        }
        return $elem.filter(submittableSelector).toArray();
    })
        .filter(
    // Verify elements have a name (`attr.name`) and are not disabled (`:enabled`)
    '[name!=""]:enabled' +
        // And cannot be clicked (`[type=submit]`) or are used in `x-www-form-urlencoded` (`[type=file]`)
        ':not(:submit, :button, :image, :reset, :file)' +
        // And are either checked/don't have a checkable state
        ':matches([checked], :not(:checkbox, :radio))'
    // Convert each of the elements to its value(s)
    )
        .map((_, elem) => {
        var _a;
        const $elem = this._make(elem);
        const name = $elem.attr('name'); // We have filtered for elements with a name before.
        // If there is no value set (e.g. `undefined`, `null`), then default value to empty
        const value = (_a = $elem.val()) !== null && _a !== void 0 ? _a : '';
        // If we have an array of values (e.g. `<select multiple>`), return an array of key/value pairs
        if (Array.isArray(value)) {
            return value.map((val) => 
            /*
             * We trim replace any line endings (e.g. `\r` or `\r\n` with `\r\n`) to guarantee consistency across platforms
             * These can occur inside of `<textarea>'s`
             */
            ({ name, value: val.replace(rCRLF, '\r\n') }));
        }
        // Otherwise (e.g. `<input type="text">`, return only one key/value pair
        return { name, value: value.replace(rCRLF, '\r\n') };
    })
        .toArray();
}
//# sourceMappingURL=forms.js.map