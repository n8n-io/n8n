import { DocNode, DocNodeKind, type IDocNodeParameters, type IDocNodeParsedParameters } from './DocNode';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocHtmlAttribute}.
 */
export interface IDocHtmlAttributeParameters extends IDocNodeParameters {
    name: string;
    spacingAfterName?: string;
    spacingAfterEquals?: string;
    value: string;
    spacingAfterValue?: string;
}
/**
 * Constructor parameters for {@link DocHtmlAttribute}.
 */
export interface IDocHtmlAttributeParsedParameters extends IDocNodeParsedParameters {
    nameExcerpt: TokenSequence;
    spacingAfterNameExcerpt?: TokenSequence;
    equalsExcerpt: TokenSequence;
    spacingAfterEqualsExcerpt?: TokenSequence;
    valueExcerpt: TokenSequence;
    spacingAfterValueExcerpt?: TokenSequence;
}
/**
 * Represents an HTML attribute inside a DocHtmlStartTag or DocHtmlEndTag.
 *
 * Example: `href="#"` inside `<a href="#" />`
 */
export declare class DocHtmlAttribute extends DocNode {
    private _name;
    private readonly _nameExcerpt;
    private _spacingAfterName;
    private readonly _spacingAfterNameExcerpt;
    private readonly _equalsExcerpt;
    private _spacingAfterEquals;
    private readonly _spacingAfterEqualsExcerpt;
    private _value;
    private readonly _valueExcerpt;
    private _spacingAfterValue;
    private readonly _spacingAfterValueExcerpt;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocHtmlAttributeParameters | IDocHtmlAttributeParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The HTML attribute name.
     */
    get name(): string;
    /**
     * Explicit whitespace that a renderer should insert after the HTML attribute name.
     * If undefined, then the renderer can use a formatting rule to generate appropriate spacing.
     */
    get spacingAfterName(): string | undefined;
    /**
     * Explicit whitespace that a renderer should insert after the "=".
     * If undefined, then the renderer can use a formatting rule to generate appropriate spacing.
     */
    get spacingAfterEquals(): string | undefined;
    /**
     * The HTML attribute value.
     */
    get value(): string;
    /**
     * Explicit whitespace that a renderer should insert after the HTML attribute name.
     * If undefined, then the renderer can use a formatting rule to generate appropriate spacing.
     */
    get spacingAfterValue(): string | undefined;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocHtmlAttribute.d.ts.map