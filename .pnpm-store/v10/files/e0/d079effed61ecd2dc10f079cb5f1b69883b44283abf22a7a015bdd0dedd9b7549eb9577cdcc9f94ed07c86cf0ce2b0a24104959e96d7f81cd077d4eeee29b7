/*
 * HTML parsing and access.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/
 */

// === Main ===
// ------------

/**
 * Parse an HTML string.
 * @param html - HTML source.
 * @returns Document node object.
 */
export function parseHTML(html: string): Selection;

// === Selection ===
// -----------------

/**
 * Represents a set of nodes in a DOM tree.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/
 */
export abstract class Selection {
    protected __brand: never;

    /**
     * Get the value of an attribute for the first element in the Selection.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-attr/
     * @param name - Name of attribute to get.
     * @returns Attribute value.
     */
    attr(name: string): string | undefined;

    /**
     * Get the children of each element in the set of matched elements,
     * optionally filtered by a selector.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-children/
     * @param selector - Selector expression.
     * @returns Selected children.
     */
    children(selector?: string): Selection;

    /**
     * For each element in the set, get the first element that matches the
     * selector by testing the element itself and traversing up through its
     * ancestors in the DOM tree.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-closest/
     * @param selector - Selector expression.
     * @returns Selected nodes.
     */
    closest(selector: string): Selection;

    /**
     * Get the children of each element in the set of matched elements,
     * including text and comment nodes.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-contents/
     * @returns Selected nodes.
     */
    contents(): Selection;

    /**
     * Return the value at the named data store for the first element in the
     * set of matched elements.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-data/
     * @param key - A string naming the piece of data to set.\
     * @returns The value at the named data store.
     */
    data(key?: string): string | undefined;

    /**
     * Iterate over a Selection (k6/html), executing a function for each
     * matched element.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-each/
     * @param handler - Logic to execute for each element.
     */
    each(handler: Handler): void;

    /**
     * Reduce the set of matched elements to the one at the specified index.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-eq/
     * @param index - An integer indicating the 0-based position of the element.
     * @returns Unary set of selected element.
     */
    eq(index: number): Selection;

    /**
     * Reduce the set of matched elements to those that match the selector
     * or pass the function's test.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-filter/
     * @param selector - Selector expression.
     * @returns Selected elements.
     */
    filter(selector: string): Selection; // tslint:disable:unified-signatures

    /**
     * Reduce the set of matched elements to those that match the selector
     * or pass the function's test.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-filter/
     * @param selector - A function used as a test for each element in the set.
     * @returns Selected elements.
     */
    filter(selector: Tester): Selection;

    /**
     * Reduce the set of matched elements to those that match the selector
     * or pass the function's test.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-filter/
     * @param selector - A selection to match elements against.
     * @returns Selected elements.
     */
    filter(selector: Selection): Selection;

    /**
     * Find the selection descendants, filtered by a selector.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-find/
     * @param selector - Selector expression.
     * @returns Selected elements.
     */
    find(selector: string): Selection;

    /**
     * Reduce the set of matched elements to the first.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-first/
     * @returns Unary set of first element.
     */
    first(): Selection;

    /**
     * Retrieve the element matched by the selector.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-get/
     * @param index - A zero-based integer indicating which element to retrieve.
     * @returns Selected element.
     */
    get(index: number): Element;

    /**
     * Reduce the set of matched elements to those that have a descendant that
     * matches the selector.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-has/
     * @param selector - Selector expression.
     * @returns Selected elements.
     */
    has(selector: string): Selection;

    /**
     * Get the HTML contents of the first element.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-html/
     * @returns The HTML content of the first element.
     */
    html(): string | undefined;

    /**
     * Check the current matched set of elements against a selector or element
     * and return true if at least one of these elements matches the given
     * arguments.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-is/
     * @param selector - Selector expression.
     * @returns Whether selector matched at least one element.
     */
    is(selector: string): boolean;

    /**
     * Check the current matched set of elements against a selector or element
     * and return true if at least one of these elements matches the given
     * arguments.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-is/
     * @param selector - A function used as a test for each element in the set.
     * @returns Whether selector matched at least one element.
     */
    is(selector: Tester): boolean;

    /**
     * Check the current matched set of elements against a selector or element
     * and return true if at least one of these elements matches the given
     * arguments.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-is/
     * @param selector - A selection to match against.
     * @returns Whether selector matched at least one element.
     */
    is(selector: Selection): boolean;

    /**
     * Reduce the set of matched elements to the final one.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-last/
     * @returns Unary set of last element.
     */
    last(): Selection;

    /**
     * Pass each element in the current matched set through a function,
     * producing a new Array containing the return values.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-map/
     * @param mapper - Procedure to execute on each element.
     * @returns Mapper return values.
     */
    map(mapper: Mapper): unknown[];

    /**
     * Get the immediately following sibling of each element.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-next/
     * @param selector - Selector expression.
     * @returns Selected elements.
     */
    next(selector?: string): Selection;

    /**
     * Get all following siblings of each element,
     * optionally filtered by a selector.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-nextall/
     * @param selector - Selector expression.
     * @returns Selected elements.
     */
    nextAll(selector?: string): Selection;

    /**
     * Get all following siblings of each element up to but not including the
     * element matched by the selector.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-nextuntil/
     * @param selector - Selector expression.
     * @returns Selected elements.
     */
    nextUntil(selector?: string): Selection;

    /**
     * Remove elements.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/
     * @param selector - Selector expression.
     * @returns Selection with matched elements removed.
     */
    not(selector: string): Selection;

    /**
     * Remove elements.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/
     * @param selector - A function used as a test for each element in the set.
     * @returns Selection with matched elements removed.
     */
    not(selector: Tester): Selection;

    /**
     * Get the parent of each element, optionally filtered by a selector.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-parent/
     * @param selector - Selector expression.
     * @returns Selected elements.
     */
    parent(selector?: string): Selection;

    /**
     * Get the ancestors of each element, optionally filtered by a selector.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-parents/
     * @param selector - Selector expression.
     * @returns Selected elements.
     */
    parents(selector?: string): Selection;

    /**
     * Get the ancestors of each element,
     * up to but not including the element matched by the selector.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-parentsuntil/
     * @param selector - Selector expression.
     * @returns Selected elements.
     */
    parentsUntil(selector?: string): Selection;

    /**
     * Get the immediately preceding sibling of each element.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-prev/
     * @param selector - Selector expression.
     * @returns Selected elements.
     */
    prev(selector?: string): Selection;

    /**
     * Get all preceding siblings of each element,
     * optionally filtered by a selector.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-prevall/
     * @param selector - Selector expression.
     * @returns Selected elements.
     */
    prevAll(selector?: string): Selection;

    /**
     * Get all preceding siblings of each element
     * up to but not including the element matched by the selector.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-prevuntil/
     * @param selector - Selector expression.
     * @returns Selected elements.
     */
    prevUntil(selector?: string): Selection;

    /**
     * Encode a set of form elements as a string
     * in standard URL-encoded notation for submission.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-serialize/
     * @returns URL-encoded representation of the form or form elements.
     */
    serialize(): string;

    /**
     * Encode a set of form elements as an array of name-value objects.
     * `[{ name: "name", value: "value" }, ... ]`
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-serializearray/
     * @returns Array of name value objects of the form or form elements.
     */
    serializeArray(): FormValue[];

    /**
     * Encode a set of form elements as an object.
     * `{ inputName: "value", checkboxName: "value", ... }`
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-serializeobject/
     * @returns Object representation of the form or form elements,
     *     key is field name and value is field value.
     */
    serializeObject(): { [name: string]: string };

    /**
     * Return the number of elements in the selection.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-size/
     * @returns The number of elements in the selection.
     */
    size(): number;

    /**
     * Reduce the set of elements to a subset specified by a range of indices.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-slice/
     * @param start - An integer indicating the 0-based position at which the
     *     elements begin to be selected.
     * @param end - An integer indicating the 0-based position at which the
     *     elements stop being selected.
     * @returns Selected elements.
     */
    slice(start: number, end?: number): Selection;

    /**
     * Get the text content of the selection.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-text/
     * @returns Text content.
     */
    text(): string;

    /**
     * Retrieve all the elements contained in the selection as an array.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-toarray/
     * @returns A unary selection of each element.
     */
    toArray(): Selection[];

    /**
     * Get the current value of the first element.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-html/selection/selection-val/
     * @returns The value of the first element.
     */
    val(): string | undefined;
}

/**
 * Form field value.
 */
export interface FormValue {
    /** Field name. */
    name: string;

    /** Field value. */
    value: string;
}

/**
 * Test procedure.
 */
export interface Tester {
    /**
     * @param index - Current index.
     * @param element - Current element.
     * @returns Whether element passes test.
     */
    (index: number, element: Element): boolean;
}

/**
 * Handle procedure.
 */
export interface Handler {
    /**
     * @param index - Current index.
     * @param element - Current element.
     */
    (index: number, element: Element): void;
}

/**
 * Map procedure.
 */
export interface Mapper {
    /**
     * @param index - Current index.
     * @param selection - Current selection.
     * @returns Value selection maps to.
     */
    (index: number, selection: Selection): unknown;
}

// === Attribute ===
// -----------------

/**
 * HTML attribute.
 */
export abstract class Attribute {
    protected __brand: never;

    /** Name. */
    name: string;

    /** Owning element. */
    ownerElement: Element;

    /** Value. */
    value: string;

    /** Local part of qualified name. */
    localName(): string;

    /** Namespace URI. */
    namespaceURI(): string;

    /** Namespace prefix. */
    prefix(): string;
}

// === Node type ===
// -----------------

/**
 * Node type.
 */
export enum NodeType {
    ElementNode = 1,
    TextNode = 3,
    CommentNode = 8,
    DocumentNode = 9,
    DoctypeNode = 10,
}

// === Element ===
// ---------------

/**
 * HTML node.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class Element {
    protected __brand: never;

    /** Dictionary of element attributes. */
    attributes(): { [name: string]: Attribute };

    /** Count of child elements. */
    childElementCount(): number;

    /** Child nodes. */
    childNodes(): Element[];

    /** Child elements. */
    children(): Element[];

    /** Class names. */
    classList(): string[];

    /**
     * Class value.
     * @returns Single string with all class names.
     */
    className(): string | undefined;

    /**
     * Check whether contains element.
     * @param element - Possibly contained element.
     * @returns Whether contains element. Self containment returns `true`.
     */
    contains(element: Element): boolean;

    /** First child node. */
    firstChild(): Element | undefined;

    /** First child element. */
    firstElementChild(): Element | undefined;

    /**
     * Get attribute value.
     * @param name - Attribute name.
     * @returns Attribute value.
     */
    getAttribute(name: string): string | undefined;

    /**
     * Get attribute node.
     * @param name - Attribute name.
     * @returns Attribute node.
     */
    getAttributeNode(name: string): Attribute | undefined;

    /**
     * Get descendant elements in class.
     * @param name - Class name.
     * @return Descendant elements in class.
     */
    getElementsByClassName(name: string): Element[];

    /**
     * Get descendant elements with tag name.
     * @param name - Tag name.
     * @return Descendant elements with tag name.
     */
    getElementsByTagName(name: string): Element[];

    /**
     * Check whether has attribute.
     * @param name - Attribute name.
     * @returns Whether has attribute.
     */
    hasAttribute(name: string): boolean;

    /** Whether has any attributes. */
    hasAttributes(): boolean;

    /** Whether has any child nodes. */
    hasChildNodes(): boolean;

    /** Identifier value. */
    id(): string;

    /** Inner HTML. Markup of content. */
    innerHTML(): string | undefined;

    /** Whether has the default namespace. */
    isDefaultNamespace(): boolean;

    /**
     * Check whether node is equal.
     * @param node - Node to check.
     * @returns Whether node has equal HTML representation.
     */
    isEqualNode(node: Element): boolean;

    /**
     * Check whether node is identical.
     * @param node - Node to check.
     * @returns Whether node is self.
     */
    isSameNode(node: Element): boolean;

    /** Value of `lang` attribute. */
    lang(): string | undefined;

    /** Last child node. */
    lastChild(): Element | undefined;

    /** Last child element. */
    lastElementChild(): Element | undefined;

    /**
     * Check whether matches selector.
     * @param selector - Selector expression.
     * @returns Whether matches selector.
     */
    matches(selector: string): boolean;

    /** Namespace URI. */
    namespaceURI(): string;

    /** Next sibling element. */
    nextElementSibling(): Element | undefined;

    /** Next sibling node. */
    nextSibling(): Element | undefined;

    /** Node name. */
    nodeName(): string;

    /** Node type. */
    nodeType(): NodeType | undefined;

    /** Node value. */
    nodeValue(): string | undefined;

    /** Owning document node. */
    ownerDocument(): Element | undefined;

    /** Parent element. */
    parentElement(): Element | undefined;

    /** Parent node. */
    parentNode(): Element | undefined;

    /** Previous sibling element. */
    previousElementSibling(): Element | undefined;

    /** Previous sibling node. */
    previousSibling(): Element | undefined;

    /**
     * Select a single descendant element.
     * @param selector - Selector expression.
     * @returns First matched element.
     */
    querySelector(selector: string): Element | undefined;

    /**
     * Select descendant elements.
     * @param selector - Selector expression.
     * @returns All matched elements.
     */
    querySelectorAll(selector: string): Element[];

    /** Text content. */
    textContent(): string;

    /** String representation, eg `[object html.Node]`. */
    toString(): string;
}

/**
 * HTML <a> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class AnchorElement extends HrefElement {
    protected __brand: never;
}

/**
 * HTML <area> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class AreaElement extends HrefElement {
    protected __brand: never;
}

/**
 * HTML <audio> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class AudioElement extends MediaElement {
    protected __brand: never;
}

/**
 * HTML <base> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class BaseElement extends Element {
    protected __brand: never;
}

/**
 * HTML <button> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class ButtonElement extends FormFieldElement {
    protected __brand: never;

    /** Value of `value` attribute if exists. Otherwise markup of content. */
    value(): string;
}

/**
 * HTML <canvas> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class CanvasElement extends Element {
    protected __brand: never;

    /** Coordinate space height in CSS pixels. */
    height(): number;

    /** Coordinate space width in CSS pixels. */
    width(): number;
}

/**
 * HTML <data> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class DataElement extends Element {
    protected __brand: never;
}

/**
 * HTML <datalist> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class DataListElement extends Element {
    protected __brand: never;

    /** Contained <option> elements. */
    options(): OptionElement[];
}

/**
 * HTML <del> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class DelElement extends ModElement {
    protected __brand: never;
}

/**
 * HTML <embed> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class EmbedElement extends Element {
    protected __brand: never;
}

/**
 * HTML <fieldset> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class FieldSetElement extends Element {
    protected __brand: never;

    /** Grouped elements. */
    elements(): Element[];

    /** Containing <form> element. */
    form(): FormElement | undefined;

    /** Field set type. Always `fieldset`. */
    type(): string;

    /** Validity states. Unimplemented. Always `undefined`. */
    validity(): undefined;
}

/**
 * HTML <form> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class FormElement extends Element {
    protected __brand: never;

    /** Contained form control elements. */
    elements(): Element[];

    /** Number of contained form control elements. */
    length(): number;

    /** Form submission HTTP method. */
    method(): string;
}

/**
 * HTML form field element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class FormFieldElement extends Element {
    protected __brand: never;

    /** Owning <form> element. */
    form(): FormElement | undefined;

    /** Form submission action URI. */
    formAction(): string;

    /** Form submission encoding. */
    formEnctype(): string;

    /** Form submission HTTP method. */
    formMethod(): string;

    /** Whether form submits without validation. */
    formNoValidate(): boolean;

    /** Form submission response display location. */
    formTarget(): string;

    /** Associated <label> elements. */
    labels(): LabelElement[];

    /** Form field name. */
    name(): string;
}

/**
 * HTML hyperlink element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class HrefElement extends Element {
    protected __brand: never;

    /** `#` prefixed URL fragment identifier. */
    hash(): string;

    /** URL hostname plus `:` delimited port if nonempty. `hostname[:port]` */
    host(): string;

    /** URL hostname. */
    hostname(): string;

    /** Unicode serialization of URL origin. */
    origin(): string;

    /** URL password. */
    password(): string;

    /** `/` prefixed URL path. */
    pathname(): string;

    /** URL port number. Empty string if unspecified. */
    port(): string;

    /** `:` suffixed URL protocol scheme. */
    protocol(): string;

    /** Link types. */
    relList(): string[];

    /** `?` prefixed URL query string. */
    search(): string;

    /** Text content. */
    text(): string;

    /** URL username. */
    username(): string;
}

/**
 * HTML <iframe> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class IFrameElement extends Element {
    protected __brand: never;
}

/**
 * HTML <img> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class ImageElement extends Element {
    protected __brand: never;
}

/**
 * HTML <input> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class InputElement extends FormFieldElement {
    protected __brand: never;

    /** Owning <form> element. */
    form(): FormElement | undefined;
}

/**
 * HTML <ins> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class InsElement extends ModElement {
    protected __brand: never;
}

/**
 * HTML <keygen> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class KeygenElement extends Element {
    protected __brand: never;

    /** Owning <form> element. */
    form(): FormElement | undefined;

    /** Associated <label> elements. */
    labels(): LabelElement[];
}

/**
 * HTML <label> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class LabelElement extends Element {
    protected __brand: never;

    /** Associated form control element. */
    control(): Element | undefined;

    /** Owning <form> element. */
    form(): FormElement | undefined;
}

/**
 * HTML <legend> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class LegendElement extends Element {
    protected __brand: never;

    /** Owning <form> element. */
    form(): FormElement | undefined;
}

/**
 * HTML <li> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class LiElement extends Element {
    protected __brand: never;
}

/**
 * HTML <link> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class LinkElement extends Element {
    protected __brand: never;

    /** Link types. */
    relList(): string[];
}

/**
 * HTML <map> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class MapElement extends Element {
    protected __brand: never;

    /** Associated <area> elements. */
    areas(): Element[];

    /** Associated <img> and <object> elements. */
    images(): Element[];
}

/**
 * HTML media element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class MediaElement extends Element {
    protected __brand: never;

    /** Contained <track> elements. */
    textTracks(): TrackElement[];
}

/**
 * HTML <meta> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class MetaElement extends Element {
    protected __brand: never;
}

/**
 * HTML <meter> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class MeterElement extends Element {
    protected __brand: never;

    /** Associated <label> elements. */
    labels(): LabelElement[];
}

/**
 * HTML modification element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class ModElement extends Element {
    protected __brand: never;
}

/**
 * HTML <object> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class ObjectElement extends Element {
    protected __brand: never;

    /** Owning <form> element. */
    form(): FormElement | undefined;
}

/**
 * HTML <ol> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class OListElement extends Element {
    protected __brand: never;
}

/**
 * HTML <optgroup> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class OptGroupElement extends Element {
    protected __brand: never;
}

/**
 * HTML <option> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class OptionElement extends Element {
    protected __brand: never;

    /** Whether disabled. */
    disabled(): boolean;

    /** Owning <form> element. */
    form(): FormElement | undefined;

    /** Index in containing options list. */
    index(): number;

    /** `label` attribute value. */
    label(): string;

    /** Text content. */
    text(): string;

    /** `value` attribute value. */
    value(): string;
}

/**
 * HTML <output> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class OutputElement extends Element {
    protected __brand: never;

    /** Default value. */
    defaultValue(): string;

    /** Owning <form> element. */
    form(): FormElement | undefined;

    /** Associated <label> elements. */
    labels(): LabelElement[];

    /** Text content. */
    value(): string;
}

/**
 * HTML <param> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class ParamElement extends Element {
    protected __brand: never;
}

/**
 * HTML <pre> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class PreElement extends Element {
    protected __brand: never;
}

/**
 * HTML <progress> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class ProgressElement extends Element {
    protected __brand: never;

    /** Associated <label> elements. */
    labels(): LabelElement[];

    /** Work required. */
    max(): number;

    /** Progress bar position. `value/max` */
    position(): number;

    /** Work completed. */
    value(): number;
}

/**
 * HTML <q> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class QuoteElement extends Element {
    protected __brand: never;
}

/**
 * HTML <script> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class ScriptElement extends Element {
    protected __brand: never;

    /** Source code. */
    text(): string;
}

/**
 * HTML <select> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class SelectElement extends Element {
    protected __brand: never;

    /** Owning <form> element. */
    form(): FormElement | undefined;

    /** Associated <label> elements. */
    labels(): LabelElement[];

    /** Number of contained <option> elements. */
    length(): number;

    /** Contained <option> elements. */
    options(): OptionElement[];

    /** First selected <option> element index. */
    selectedIndex(): number;

    /** Selected <option> elements. */
    selectedOptions(): OptionElement[];

    /** Number of visible rows. */
    size(): number;

    /** Select type. `select-one` or `select-multiple`. */
    type(): string;

    /** First selected <option> element value. */
    value(): string;
}

/**
 * HTML <source> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class SourceElement extends Element {
    protected __brand: never;
}

/**
 * HTML <style> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class StyleElement extends Element {
    protected __brand: never;

    /** `type` attribute value. */
    type(): string;
}

/**
 * HTML <tbody> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class TableBodyElement extends TableSectionElement {
    protected __brand: never;
}

/**
 * HTML table cell element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class TableCellElement extends Element {
    protected __brand: never;

    /** Index in containing row. */
    cellIndex(): number;
}

/**
 * HTML <col> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class TableColElement extends Element {
    protected __brand: never;

    /** Number of consecutive columns spanned. */
    span(): number;
}

/**
 * HTML <td> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class TableDataCellElement extends TableCellElement {
    protected __brand: never;
}

/**
 * HTML <table> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class TableElement extends Element {
    protected __brand: never;

    /** First child <caption> element. */
    caption(): Element | undefined;

    /** Contained <tr> elements. */
    rows(): Element[];

    /** Contained <tbody> elements. */
    tBodies(): Element[];

    /** First child <tfoot> element. */
    tFoot(): Element | undefined;

    /** First child <thead> element. */
    tHead(): Element | undefined;
}

/**
 * HTML <tfoot> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class TableFootElement extends TableSectionElement {
    protected __brand: never;
}

/**
 * HTML <thead> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class TableHeadElement extends TableSectionElement {
    protected __brand: never;
}

/**
 * HTML <th> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class TableHeaderCellElement extends TableCellElement {
    protected __brand: never;
}

/**
 * HTML <tr> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class TableRowElement extends Element {
    protected __brand: never;

    /** Contained table cell elements. */
    cells(): TableCellElement[];

    /** Index in containing table. */
    rowIndex(): number;

    /** Index in containing table section. */
    sectionRowIndex(): number;
}

/**
 * HTML table section element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class TableSectionElement extends Element {
    protected __brand: never;

    /** Contained <tr> elements. */
    rows(): Element[];
}

/**
 * HTML <textarea> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class TextAreaElement extends Element {
    protected __brand: never;

    /** Owning <form> element. */
    form(): FormElement | undefined;

    /** Associated <label> elements. */
    labels(): LabelElement[];

    /** Byte length of current text value. */
    length(): number;
}

/**
 * HTML <time> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class TimeElement extends Element {
    protected __brand: never;
}

/**
 * HTML <title> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class TitleElement extends Element {
    protected __brand: never;

    /** Title text. */
    text(): string;
}

/**
 * HTML <track> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class TrackElement extends Element {
    protected __brand: never;
}

/**
 * HTML <ul> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class UListElement extends Element {
    protected __brand: never;
}

/**
 * HTML <video> element.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-html/element/
 */
export abstract class VideoElement extends MediaElement {
    protected __brand: never;
}
