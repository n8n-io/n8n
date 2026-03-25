/**
 * @typedef {{
 *   insert?: string[]
 *   insertAt?: number
 *   delete?: string[]
 *   deleteAt?: number
 *   format?: Record<string,string[]>
 *   formatAt?: number
 * }} Attribution
 */
/**
 * @type {s.Schema<Attribution>}
 */
export const $attribution: s.Schema<Attribution>;
/**
 * @typedef {{ [key: string]: any }} FormattingAttributes
 */
/**
 * @typedef {{
 *   type: 'delta',
 *   name?: string,
 *   attrs?: { [Key in string|number]: DeltaAttrOpJSON },
 *   children?: Array<DeltaListOpJSON>
 * }} DeltaJSON
 */
/**
 * @typedef {{ type: 'insert', insert: string|Array<any>, format?: { [key: string]: any }, attribution?: Attribution } | { delete: number } | { type: 'retain', retain: number, format?: { [key:string]: any }, attribution?: Attribution } | { type: 'modify', value: object }} DeltaListOpJSON
 */
/**
 * @typedef {{ type: 'insert', value: any, prevValue?: any, attribution?: Attribution } | { type: 'delete', prevValue?: any, attribution?: Attribution } | { type: 'modify', value: DeltaJSON }} DeltaAttrOpJSON
 */
/**
 * @typedef {TextOp|InsertOp<any>|DeleteOp|RetainOp|ModifyOp<any>} ChildrenOpAny
 */
/**
 * @typedef {SetAttrOp<any>|DeleteAttrOp<any>|ModifyAttrOp} AttrOpAny
 */
/**
 * @typedef {ChildrenOpAny|AttrOpAny} _OpAny
 */
/**
 * @type {s.Schema<DeltaAttrOpJSON>}
 */
export const $deltaMapChangeJson: s.Schema<DeltaAttrOpJSON>;
export class TextOp extends list.ListNode {
    /**
     * @param {string} insert
     * @param {FormattingAttributes|null} format
     * @param {Attribution?} attribution
     */
    constructor(insert: string, format: FormattingAttributes | null, attribution: Attribution | null);
    /**
     * @readonly
     * @type {string}
     */
    readonly insert: string;
    /**
     * @readonly
     * @type {FormattingAttributes|null}
     */
    readonly format: FormattingAttributes | null;
    attribution: Attribution | null;
    /**
     * @type {string?}
     */
    _fingerprint: string | null;
    get $type(): s.Schema<TextOp>;
    /**
     * @param {string} newVal
     */
    _updateInsert(newVal: string): void;
    /**
     * @return {'insert'}
     */
    get type(): "insert";
    get length(): number;
    get fingerprint(): string;
    /**
     * Remove a part of the operation (similar to Array.splice)
     *
     * @param {number} offset
     * @param {number} len
     */
    _splice(offset: number, len: number): this;
    /**
     * @return {DeltaListOpJSON}
     */
    toJSON(): DeltaListOpJSON;
    /**
     * @return {TextOp}
     */
    clone(start?: number, end?: number): TextOp;
    /**
     * @param {TextOp} other
     */
    [equalityTrait.EqualityTraitSymbol](other: TextOp): boolean;
}
/**
 * @template {any} ArrayContent
 */
export class InsertOp<ArrayContent extends unknown> extends list.ListNode {
    /**
     * @param {Array<ArrayContent>} insert
     * @param {FormattingAttributes|null} format
     * @param {Attribution?} attribution
     */
    constructor(insert: Array<ArrayContent>, format: FormattingAttributes | null, attribution: Attribution | null);
    /**
     * @readonly
     * @type {Array<ArrayContent>}
     */
    readonly insert: Array<ArrayContent>;
    /**
     * @readonly
     * @type {FormattingAttributes?}
     */
    readonly format: FormattingAttributes | null;
    /**
     * @readonly
     * @type {Attribution?}
     */
    readonly attribution: Attribution | null;
    /**
     * @type {string?}
     */
    _fingerprint: string | null;
    get $type(): s.Schema<InsertOp<any>>;
    /**
     * @param {ArrayContent} newVal
     */
    _updateInsert(newVal: ArrayContent): void;
    /**
     * @return {'insert'}
     */
    get type(): "insert";
    get length(): number;
    /**
     * @param {number} i
     * @return {Extract<ArrayContent,DeltaAny>}
     */
    _modValue(i: number): Extract<ArrayContent, DeltaAny>;
    get fingerprint(): string;
    /**
     * Remove a part of the operation (similar to Array.splice)
     *
     * @param {number} offset
     * @param {number} len
     */
    _splice(offset: number, len: number): this;
    /**
     * @return {DeltaListOpJSON}
     */
    toJSON(): DeltaListOpJSON;
    /**
     * @return {InsertOp<ArrayContent>}
     */
    clone(start?: number, end?: number): InsertOp<ArrayContent>;
    /**
     * @param {InsertOp<ArrayContent>} other
     */
    [equalityTrait.EqualityTraitSymbol](other: InsertOp<ArrayContent>): boolean;
}
/**
 * @template {DeltaConf} [DConf={}]
 */
export class DeleteOp<DConf extends DeltaConf = {}> extends list.ListNode {
    /**
     * @param {number} len
     */
    constructor(len: number);
    delete: number;
    /**
     * @type {Delta<DConf>?}
     */
    prevValue: Delta<DConf> | null;
    /**
     * @type {string|null}
     */
    _fingerprint: string | null;
    get $type(): s.Schema<DeleteOp<any>>;
    /**
     * @return {'delete'}
     */
    get type(): "delete";
    get length(): number;
    get fingerprint(): string;
    /**
     * Remove a part of the operation (similar to Array.splice)
     *
     * @param {number} _offset
     * @param {number} len
     */
    _splice(_offset: number, len: number): this;
    /**
     * @return {DeltaListOpJSON}
     */
    toJSON(): DeltaListOpJSON;
    /**
     * @param {number} start
     * @param {number} end
     * @return {DeleteOp}
     */
    clone(start?: number, end?: number): DeleteOp;
    /**
     * @param {DeleteOp} other
     */
    [equalityTrait.EqualityTraitSymbol](other: DeleteOp): boolean;
}
export class RetainOp extends list.ListNode {
    /**
     * @param {number} retain
     * @param {FormattingAttributes|null} format
     * @param {Attribution?} attribution
     */
    constructor(retain: number, format: FormattingAttributes | null, attribution: Attribution | null);
    /**
     * @readonly
     * @type {number}
     */
    readonly retain: number;
    /**
     * @readonly
     * @type {FormattingAttributes?}
     */
    readonly format: FormattingAttributes | null;
    /**
     * @readonly
     * @type {Attribution?}
     */
    readonly attribution: Attribution | null;
    /**
     * @type {string|null}
     */
    _fingerprint: string | null;
    get $type(): s.Schema<RetainOp>;
    /**
     * @return {'retain'}
     */
    get type(): "retain";
    get length(): number;
    get fingerprint(): string;
    /**
     * Remove a part of the operation (similar to Array.splice)
     *
     * @param {number} _offset
     * @param {number} len
     */
    _splice(_offset: number, len: number): this;
    /**
     * @return {DeltaListOpJSON}
     */
    toJSON(): DeltaListOpJSON;
    clone(start?: number, end?: number): RetainOp;
    /**
     * @param {RetainOp} other
     */
    [equalityTrait.EqualityTraitSymbol](other: RetainOp): boolean;
}
/**
 * Delta that can be applied on a YType Embed
 *
 * @template {Delta} [DTypes=DeltaAny]
 */
export class ModifyOp<DTypes extends Delta = DeltaAny> extends list.ListNode {
    /**
     * @param {DTypes} delta
     * @param {FormattingAttributes|null} format
     * @param {Attribution?} attribution
     */
    constructor(delta: DTypes, format: FormattingAttributes | null, attribution: Attribution | null);
    /**
     * @readonly
     * @type {DTypes}
     */
    readonly value: DTypes;
    /**
     * @readonly
     * @type {FormattingAttributes?}
     */
    readonly format: FormattingAttributes | null;
    /**
     * @readonly
     * @type {Attribution?}
     */
    readonly attribution: Attribution | null;
    /**
     * @type {string|null}
     */
    _fingerprint: string | null;
    get $type(): s.Schema<ModifyOp<DeltaAny>>;
    /**
     * @return {'modify'}
     */
    get type(): "modify";
    get length(): number;
    /**
     * @type {DeltaBuilderAny}
     */
    get _modValue(): DeltaBuilderAny;
    get fingerprint(): string;
    /**
     * Remove a part of the operation (similar to Array.splice)
     *
     * @param {number} _offset
     * @param {number} _len
     */
    _splice(_offset: number, _len: number): this;
    /**
     * @return {DeltaListOpJSON}
     */
    toJSON(): DeltaListOpJSON;
    /**
     * @return {ModifyOp<DTypes>}
     */
    clone(): ModifyOp<DTypes>;
    /**
     * @param {ModifyOp<any>} other
     */
    [equalityTrait.EqualityTraitSymbol](other: ModifyOp<any>): boolean;
}
/**
 * @template {any} [V=any]
 * @template {string|number} [K=any]
 */
export class SetAttrOp<V extends unknown = any, K extends string | number = any> {
    /**
     * @param {K} key
     * @param {V} value
     * @param {V|undefined} prevValue
     * @param {Attribution?} attribution
     */
    constructor(key: K, value: V, prevValue: V | undefined, attribution: Attribution | null);
    /**
     * @readonly
     * @type {K}
     */
    readonly key: K;
    /**
     * @readonly
     * @type {V}
     */
    readonly value: V;
    /**
     * @readonly
     * @type {V|undefined}
     */
    readonly prevValue: V | undefined;
    /**
     * @readonly
     * @type {Attribution?}
     */
    readonly attribution: Attribution | null;
    /**
     * @type {string|null}
     */
    _fingerprint: string | null;
    get $type(): s.Schema<SetAttrOp<any, any>>;
    /**
     * @return {'insert'}
     */
    get type(): "insert";
    /**
     * @type {DeltaBuilderAny}
     */
    get _modValue(): DeltaBuilderAny;
    get fingerprint(): string;
    toJSON(): {
        type: "insert";
        value: DeltaJSON | V;
    } & (({
        attribution: Attribution;
    } | {
        attribution?: undefined;
    }) & ({
        prevValue: V & ({} | null);
    } | {
        prevValue?: undefined;
    }));
    /**
     * @return {SetAttrOp<V,K>}
     */
    clone(): SetAttrOp<V, K>;
    /**
     * @param {SetAttrOp<V>} other
     */
    [equalityTrait.EqualityTraitSymbol](other: SetAttrOp<V>): boolean;
}
/**
 * @template [V=any]
 * @template {string|number} [K=string|number]
 */
export class DeleteAttrOp<V = any, K extends string | number = string | number> {
    /**
     * @param {K} key
     * @param {V|undefined} prevValue
     * @param {Attribution?} attribution
     */
    constructor(key: K, prevValue: V | undefined, attribution: Attribution | null);
    /**
     * @type {K}
     */
    key: K;
    /**
     * @type {V|undefined}
     */
    prevValue: V | undefined;
    attribution: Attribution | null;
    /**
     * @type {string|null}
     */
    _fingerprint: string | null;
    get $type(): s.Schema<DeleteAttrOp<any, string | number>>;
    /**
     * @type {'delete'}
     */
    get type(): "delete";
    get value(): undefined;
    get fingerprint(): string;
    /**
     * @return {DeltaAttrOpJSON}
     */
    toJSON(): DeltaAttrOpJSON;
    clone(): DeleteAttrOp<V, K>;
    /**
     * @param {DeleteAttrOp<V>} other
     */
    [equalityTrait.EqualityTraitSymbol](other: DeleteAttrOp<V>): boolean;
}
/**
 * @template {DeltaAny} [Modifier=DeltaAny]
 * @template {string|number} [K=string]
 */
export class ModifyAttrOp<Modifier extends DeltaAny = DeltaAny, K extends string | number = string> {
    /**
     * @param {K} key
     * @param {Modifier} delta
     */
    constructor(key: K, delta: Modifier);
    /**
     * @readonly
     * @type {K}
     */
    readonly key: K;
    /**
     * @readonly
     * @type {Modifier}
     */
    readonly value: Modifier;
    /**
     * @type {string|null}
     */
    _fingerprint: string | null;
    get $type(): s.Schema<ModifyAttrOp<any, string | number>>;
    /**
     * @type {'modify'}
     */
    get type(): "modify";
    get fingerprint(): string;
    /**
     * @return {DeltaBuilder}
     */
    get _modValue(): DeltaBuilder;
    /**
     * @return {DeltaAttrOpJSON}
     */
    toJSON(): DeltaAttrOpJSON;
    /**
     * @return {ModifyAttrOp<Modifier,K>}
     */
    clone(): ModifyAttrOp<Modifier, K>;
    /**
     * @param {ModifyAttrOp<Modifier>} other
     */
    [equalityTrait.EqualityTraitSymbol](other: ModifyAttrOp<Modifier>): boolean;
}
export const $insertOp: s.Schema<InsertOp<any>>;
export const $modifyOp: s.Schema<ModifyOp>;
export const $textOp: s.Schema<TextOp>;
export const $deleteOp: s.Schema<DeleteOp<any>>;
export const $retainOp: s.Schema<RetainOp>;
export const $anyOp: s.Schema<TextOp | InsertOp<any> | DeleteOp<any> | ModifyOp<DeltaAny>>;
export const $setAttrOp: s.Schema<SetAttrOp<any>>;
export const $modifyAttrOp: s.Schema<ModifyAttrOp<any, string | number>>;
export const $deleteAttrOp: s.Schema<DeleteAttrOp<any, string | number>>;
export const $anyAttrOp: s.Schema<SetAttrOp<any, any> | DeleteAttrOp<any, string | number> | ModifyAttrOp<any, string | number>>;
export function $setAttrOpWith<Content extends fingerprintTrait.Fingerprintable>($content: s.Schema<Content>): s.Schema<SetAttrOp<Content>>;
export function $insertOpWith<Content extends fingerprintTrait.Fingerprintable>($content: s.Schema<Content>): s.Schema<InsertOp<Content>>;
export function $modifyOpWith<Modify extends DeltaAny>($content: s.Schema<Modify>): s.Schema<ModifyOp<Modify>>;
export function $modifyAttrOpWith<Modify extends DeltaAny>($content: s.Schema<Modify>): s.Schema<ModifyAttrOp<Modify>>;
/**
 * @template {DeltaConf} [DConf={}]
 * @extends {DeltaData<
 *   DeltaConfGetName<DConf>,
 *   DeltaConfGetAttrs<DConf>,
 *   DeltaConfGetChildren<DConf>,
 *   DConf extends {text:true} ? true : false
 * >}
 */
export class Delta<DConf extends DeltaConf = {}> extends DeltaData<DeltaConfGetName<DConf>, import("../ts.js").TypeIsAny<DConf, {
    [K: string]: any;
    [K: number]: any;
}, DConf extends {
    attrs: infer Attrs_1;
} ? Attrs_1 extends undefined ? {} : Attrs_1 : {}>, DeltaConfGetChildren<DConf>, DConf extends {
    text: true;
} ? true : false> {
    /**
     * @param {string?} name
     * @param {s.Schema<Delta<any>>?} $schema
     */
    constructor(name: string | null, $schema: s.Schema<Delta<any>> | null);
    get $type(): s.Schema<DeltaAny>;
    /**
     * @type {string}
     */
    get fingerprint(): string;
    isEmpty(): boolean;
    /**
     * @return {DeltaJSON}
     */
    toJSON(): DeltaJSON;
    /**
     * @param {Delta<any>} other
     * @return {boolean}
     */
    equals(other: Delta<any>): boolean;
    /**
     * Mark this delta as done and perform some cleanup (e.g. remove appended retains without
     * formats&attributions). In the future, there might be additional merge operations that can be
     * performed to result in smaller deltas. Set `markAsDone=false` to only perform the cleanup.
     *
     * @return {Delta<DConf>}
     */
    done(markAsDone?: boolean): Delta<DConf>;
    [fingerprintTrait.FingerprintTraitSymbol](): string;
    /**
     * @param {any} other
     * @return {boolean}
     */
    [equalityTrait.EqualityTraitSymbol](other: any): boolean;
}
export function slice<DConf extends DeltaConf>(d: Delta<DConf>, start?: number, end?: number, currNode?: ChildrenOpAny | null): DeltaBuilder<DConf>;
export function clone<D extends DeltaAny>(d: D): D extends Delta<infer DConf> ? DeltaBuilder<DConf> : never;
/**
 * @template {DeltaConf} [DConf={}]
 * @extends {Delta<DConf>}
 */
export class DeltaBuilder<DConf extends DeltaConf = {}> extends Delta<DConf> {
    /**
     * @param {string?} name
     * @param {s.Schema<Delta<DConf>>?} $schema
     */
    constructor(name: string | null, $schema: s.Schema<Delta<DConf>> | null);
    /**
     * @type {FormattingAttributes?}
     */
    usedAttributes: FormattingAttributes | null;
    /**
     * @type {Attribution?}
     */
    usedAttribution: Attribution | null;
    /**
     * @param {Attribution?} attribution
     */
    useAttribution(attribution: Attribution | null): this;
    /**
     * @param {FormattingAttributes?} attributes
     * @return {this}
     */
    useAttributes(attributes: FormattingAttributes | null): this;
    /**
     * @param {string} name
     * @param {any} value
     */
    updateUsedAttributes(name: string, value: any): this;
    /**
     * @template {keyof Attribution} NAME
     * @param {NAME} name
     * @param {Attribution[NAME]?} value
     */
    updateUsedAttribution<NAME extends keyof Attribution>(name: NAME, value: Attribution[NAME] | null): this;
    /**
     * @template {(DConf extends {fixed:true} ? never : (Array<any>|string)) | (DeltaConfGetChildren<DConf> extends infer Children ? (Children extends never ? never : Array<Children>) : never) | DeltaConfGetText<DConf>} NewContent
     * @param {NewContent} insert
     * @param {FormattingAttributes?} [formatting]
     * @param {Attribution?} [attribution]
     * @return {DeltaBuilder<DConf extends {fixed: true} ? DConf : DeltaConfOverwrite<DConf,
     * (Exclude<NewContent,string> extends never ? {} : {
     *   children: Exclude<NewContent,string>[number]|DeltaConfGetChildren<DConf>
     * }) & (Extract<NewContent,string> extends never ? {} : { text: true })>>}
     */
    insert<NewContent extends (DConf extends {
        fixed: true;
    } ? never : (Array<any> | string)) | (DeltaConfGetChildren<DConf> extends infer Children_1 ? (Children_1 extends never ? never : Array<Children_1>) : never) | DeltaConfGetText<DConf>>(insert: NewContent, formatting?: FormattingAttributes | null, attribution?: Attribution | null): DeltaBuilder<DConf extends {
        fixed: true;
    } ? DConf : DeltaConfOverwrite<DConf, (Exclude<NewContent, string> extends never ? {} : {
        children: Exclude<NewContent, string>[number] | DeltaConfGetChildren<DConf>;
    }) & (Extract<NewContent, string> extends never ? {} : {
        text: true;
    })>>;
    /**
     * @template {Extract<DeltaConfGetAllowedChildren<DConf>,Delta>} NewContent
     * @param {NewContent} modify
     * @param {FormattingAttributes?} formatting
     * @param {Attribution?} attribution
     * @return {DeltaBuilder<DeltaConfOverwrite<DConf, {children: DeltaConfGetChildren<DConf>|NewContent}>>}
     */
    modify<NewContent extends Extract<DeltaConfGetAllowedChildren<DConf>, Delta>>(modify: NewContent, formatting?: FormattingAttributes | null, attribution?: Attribution | null): DeltaBuilder<DeltaConfOverwrite<DConf, {
        children: DeltaConfGetChildren<DConf> | NewContent;
    }>>;
    /**
     * @param {number} len
     * @param {FormattingAttributes?} [format]
     * @param {Attribution?} [attribution]
     */
    retain(len: number, format?: FormattingAttributes | null, attribution?: Attribution | null): this;
    /**
     * @param {number} len
     */
    delete(len: number): this;
    /**
     * @template {keyof DeltaConfGetAllowedAttrs<DConf>} Key
     * @template {DeltaConfGetAllowedAttrs<DConf>[Key]} Val
     * @param {Key} key
     * @param {Val} val
     * @param {Attribution?} attribution
     * @param {Val|undefined} [prevValue]
     * @return {DeltaBuilder<DeltaConfOverwrite<DConf,{attrs:AddToAttrs<DeltaConfGetAttrs<DConf>,Key,Val>}>>}
     */
    setAttr<Key extends keyof DeltaConfGetAllowedAttrs<DConf>, Val extends DeltaConfGetAllowedAttrs<DConf>[Key]>(key: Key, val: Val, attribution?: Attribution | null, prevValue?: Val | undefined): DeltaBuilder<DeltaConfOverwrite<DConf, {
        attrs: AddToAttrs<DeltaConfGetAttrs<DConf>, Key, Val>;
    }>>;
    /**
     * @template {DeltaConfGetAllowedAttrs<DConf>} NewAttrs
     * @param {NewAttrs} attrs
     * @param {Attribution?} attribution
     * @return {DeltaBuilder<DeltaConfOverwrite<
     *   DConf,
     *   { attrs: MergeAttrs<DeltaConfGetAttrs<DConf>,NewAttrs> }
     *   >>
     * }
     */
    setAttrs<NewAttrs extends DeltaConfGetAllowedAttrs<DConf>>(attrs: NewAttrs, attribution?: Attribution | null): DeltaBuilder<DeltaConfOverwrite<DConf, {
        attrs: MergeAttrs<DeltaConfGetAttrs<DConf>, NewAttrs>;
    }>>;
    /**
     * @template {keyof DeltaConfGetAllowedAttrs<DConf>} Key
     * @param {Key} key
     * @param {Attribution?} attribution
     * @param {any} [prevValue]
     * @return {DeltaBuilder<DeltaConfOverwrite<DConf, {
     *   attrs: AddToAttrs<DeltaConfGetAttrs<DConf>,Key,never>
     * }>>}
     */
    deleteAttr<Key extends keyof DeltaConfGetAllowedAttrs<DConf>>(key: Key, attribution?: Attribution | null, prevValue?: any): DeltaBuilder<DeltaConfOverwrite<DConf, {
        attrs: AddToAttrs<DeltaConfGetAttrs<DConf>, Key, never>;
    }>>;
    /**
     * @template {DeltaConfGetAllowedAttrs<DConf> extends infer As ? { [K in keyof As]: Extract<As[K],DeltaAny> extends never ? never : K }[keyof As] : never} Key
     * @template {Extract<DeltaConfGetAllowedAttrs<DConf>[Key],DeltaAny>} D
     * @param {Key} key
     * @param {D} modify
     * @return {DeltaBuilder<DeltaConfOverwrite<DConf,{attrs:AddToAttrs<DeltaConfGetAttrs<DConf>,Key,D>}>>}
     */
    modifyAttr<Key extends DeltaConfGetAllowedAttrs<DConf> extends infer As ? { [K in keyof As]: Extract<As[K], DeltaAny> extends never ? never : K; }[keyof As] : never, D extends Extract<DeltaConfGetAllowedAttrs<DConf>[Key], DeltaAny>>(key: Key, modify: D): DeltaBuilder<DeltaConfOverwrite<DConf, {
        attrs: AddToAttrs<DeltaConfGetAttrs<DConf>, Key, D>;
    }>>;
    /**
     * @param {Delta<DConf>} other
     */
    apply(other: Delta<DConf>): this;
    /**
     * @param {DeltaAny} other
     * @param {boolean} priority
     */
    rebase(other: DeltaAny, priority: boolean): this;
    /**
     * Same as doing `delta.rebase(other.inverse())`, without creating a temporary delta.
     *
     * @param {DeltaAny} other
     * @param {boolean} priority
     */
    rebaseOnInverse(other: DeltaAny, priority: boolean): this;
    /**
     * Append child ops from one op to the other.
     *
     *     delta.create().insert('a').append(delta.create().insert('b')) // => insert "ab"
     *
     * @todo on fixed deltas this should not extend
     *
     * @template {DeltaConf} OtherDeltaConf
     * @param {Delta<OtherDeltaConf>} other
     * @return {DeltaBuilder<DeltaConfOverwrite<
     *   DConf,
     *   (DeltaConfGetChildren<OtherDeltaConf> extends never ? {} : { children: DeltaConfGetChildren<DConf> | DeltaConfGetChildren<OtherDeltaConf> })
     *   & (DeltaConfGetText<OtherDeltaConf> extends string ? { text: true } : never)
     * >>}
     */
    append<OtherDeltaConf extends DeltaConf>(other: Delta<OtherDeltaConf>): DeltaBuilder<DeltaConfOverwrite<DConf, (DeltaConfGetChildren<OtherDeltaConf> extends never ? {} : {
        children: DeltaConfGetChildren<DConf> | DeltaConfGetChildren<OtherDeltaConf>;
    }) & (DeltaConfGetText<OtherDeltaConf> extends string ? {
        text: true;
    } : never)>>;
}
/**
 * @template {DeltaConf} DConf
 * @extends {s.Schema<Delta<DConf>>}
 */
export class $Delta<DConf extends DeltaConf> extends s.Schema<Delta<DConf>> {
    /**
     * @param {s.Schema<any>} $name
     * @param {s.Schema<any>} $attrs
     * @param {s.Schema<any>} $children
     * @param {any} hasText
     * @param {any} recursiveChildren
     * @param {s.Schema<{[K:string]:any}>} $formats
     */
    constructor($name: s.Schema<any>, $attrs: s.Schema<any>, $children: s.Schema<any>, hasText: any, recursiveChildren: any, $formats: s.Schema<{
        [K: string]: any;
    }>);
    /**
     * @type {{
     *   $name: s.Schema<DeltaConfGetName<DConf>>,
     *   $attrs: s.Schema<DeltaConfGetAttrs<DConf>>,
     *   $children: s.Schema<DeltaConfGetChildren<DConf>>,
     *   hasText: DeltaConfGetText<DConf>
     *   recursiveChildren: DeltaConfGetRecursiveChildren<DConf>,
     *   $formats: s.Schema<{[K:string]:any}>
     * }}
     */
    shape: {
        $name: s.Schema<DeltaConfGetName<DConf>>;
        $attrs: s.Schema<DeltaConfGetAttrs<DConf>>;
        $children: s.Schema<DeltaConfGetChildren<DConf>>;
        hasText: DeltaConfGetText<DConf>;
        recursiveChildren: DeltaConfGetRecursiveChildren<DConf>;
        $formats: s.Schema<{
            [K: string]: any;
        }>;
    };
}
export function $delta<NodeNameSchema extends s.Schema<string> | string | Array<string> = s.Schema<any>, AttrsSchema extends s.Schema<{
    [key: string | number]: any;
}> | {
    [key: string | number]: any;
} = s.Schema<{}>, ChildrenSchema extends unknown = s.Schema<never>, HasText extends boolean = false, RecursiveChildren extends boolean = false, Formats extends {
    [k: string]: any;
} = {
    [k: string]: any;
}>({ name, attrs, children, text, formats, recursiveChildren: recursive }: {
    name?: NodeNameSchema | null | undefined;
    attrs?: AttrsSchema | null | undefined;
    children?: ChildrenSchema | null | undefined;
    text?: HasText | undefined;
    formats?: Formats | undefined;
    recursiveChildren?: RecursiveChildren | undefined;
}): [s.Unwrap<s.ReadSchema<NodeNameSchema>>, s.Unwrap<s.ReadSchema<AttrsSchema>>, s.Unwrap<s.ReadSchema<ChildrenSchema>>] extends [infer NodeName_1, infer Attrs_1, infer Children_1] ? s.Schema<Delta<{
    name: NodeName_1;
    attrs: Attrs_1;
    children: Children_1;
    text: HasText;
    recursiveChildren: RecursiveChildren;
}>> : never;
export const $$delta: s.Schema<$Delta<DeltaConf>>;
export function _$delta<NodeNameSchema extends s.Schema<string> | string | Array<string> = s.Schema<any>, AttrsSchema extends s.Schema<{
    [key: string | number]: any;
}> | {
    [key: string | number]: any;
} = s.Schema<{}>, ChildrenSchema extends unknown = s.Schema<never>, HasText extends boolean = false, Recursive extends boolean = false>({ name, attrs, children, text, recursive }: {
    name?: NodeNameSchema | null | undefined;
    attrs?: AttrsSchema | null | undefined;
    children?: ChildrenSchema | null | undefined;
    text?: HasText | undefined;
    recursive?: Recursive | undefined;
}): [s.Unwrap<s.ReadSchema<NodeNameSchema>>, s.Unwrap<s.ReadSchema<AttrsSchema>>, s.Unwrap<s.ReadSchema<ChildrenSchema>>] extends [infer NodeName_1, infer Attrs_1, infer Children_1] ? s.Schema<Delta<NodeName_1, Attrs_1, Children_1 | (Recursive extends true ? RecursiveDelta<NodeName_1, Attrs_1, Children_1, HasText extends true ? string : never> : never), HasText extends true ? string : never>> : never;
export const $deltaAny: s.Schema<DeltaAny>;
export const $deltaBuilderAny: s.Schema<DeltaBuilderAny>;
export function mergeAttrs<T extends {
    [key: string]: any;
}>(a: T | null, b: T | null): T | null;
export function mergeDeltas<D extends DeltaAny | null>(a: D, b: D): D;
export function random<DConf extends DeltaConf>(gen: prng.PRNG, $d: s.Schema<Delta<DConf>>): DeltaBuilder<DConf>;
/**
 * @overload
 * @return {DeltaBuilder<{}>}
 */
export function create(): DeltaBuilder<{}>;
/**
 * @template {string} NodeName
 * @overload
 * @param {NodeName} nodeName
 * @return {DeltaBuilder<{ name: NodeName }>}
 */
export function create<NodeName extends string>(nodeName: NodeName): DeltaBuilder<{
    name: NodeName;
}>;
/**
 * @template {string} NodeName
 * @template {s.Schema<DeltaAny>} Schema
 * @overload
 * @param {NodeName} nodeName
 * @param {Schema} schema
 * @return {Schema extends s.Schema<Delta<infer DConf>> ? DeltaBuilder<DeltaConfOverwrite<DConf, {fixed:true}>> : never}
 */
export function create<NodeName extends string, Schema extends s.Schema<DeltaAny>>(nodeName: NodeName, schema: Schema): Schema extends s.Schema<Delta<infer DConf>> ? DeltaBuilder<DeltaConfOverwrite<DConf, {
    fixed: true;
}>> : never;
/**
 * @template {s.Schema<DeltaAny>} Schema
 * @overload
 * @param {Schema} schema
 * @return {Schema extends s.Schema<Delta<infer DConf>> ? DeltaBuilder<DeltaConfOverwrite<DConf, {fixed:true}>> : never}
 */
export function create<Schema extends s.Schema<DeltaAny>>(schema: Schema): Schema extends s.Schema<Delta<infer DConf>> ? DeltaBuilder<DeltaConfOverwrite<DConf, {
    fixed: true;
}>> : never;
/**
 * @template {string|null} NodeName
 * @template {{[k:string|number]:any}|null} Attrs
 * @template {Array<any>|string} [Children=never]
 * @overload
 * @param {NodeName} nodeName
 * @param {Attrs} attrs
 * @param {Children} [children]
 * @return {DeltaBuilder<{
 *   name: NodeName,
 *   attrs: Attrs extends null ? {} : Attrs,
 *   children: Extract<Children,Array<any>> extends Array<infer Ac> ? (unknown extends Ac ? never : Ac) : never,
 *   text: Extract<Children,string> extends never ? false : true
 * }>}
 */
export function create<NodeName extends string, Attrs extends {
    [k: string | number]: any;
} | null, Children extends Array<any> | string = never>(nodeName: NodeName, attrs: Attrs, children?: Children | undefined): DeltaBuilder<{
    name: NodeName;
    attrs: Attrs extends null ? {} : Attrs;
    children: Extract<Children, Array<any>> extends Array<infer Ac> ? (unknown extends Ac ? never : Ac) : never;
    text: Extract<Children, string> extends never ? false : true;
}>;
export function diff<DConf extends DeltaConf>(d1: Delta<DConf>, d2: NoInfer<Delta<DConf>>): DeltaBuilder<DConf>;
export type Attribution = {
    insert?: string[];
    insertAt?: number;
    delete?: string[];
    deleteAt?: number;
    format?: Record<string, string[]>;
    formatAt?: number;
};
export type FormattingAttributes = {
    [key: string]: any;
};
export type DeltaJSON = {
    type: "delta";
    name?: string;
    attrs?: { [Key in string | number]: DeltaAttrOpJSON; };
    children?: Array<DeltaListOpJSON>;
};
export type DeltaListOpJSON = {
    type: "insert";
    insert: string | Array<any>;
    format?: {
        [key: string]: any;
    };
    attribution?: Attribution;
} | {
    delete: number;
} | {
    type: "retain";
    retain: number;
    format?: {
        [key: string]: any;
    };
    attribution?: Attribution;
} | {
    type: "modify";
    value: object;
};
export type DeltaAttrOpJSON = {
    type: "insert";
    value: any;
    prevValue?: any;
    attribution?: Attribution;
} | {
    type: "delete";
    prevValue?: any;
    attribution?: Attribution;
} | {
    type: "modify";
    value: DeltaJSON;
};
export type ChildrenOpAny = TextOp | InsertOp<any> | DeleteOp | RetainOp | ModifyOp<any>;
export type AttrOpAny = SetAttrOp<any> | DeleteAttrOp<any> | ModifyAttrOp;
export type _OpAny = ChildrenOpAny | AttrOpAny;
export type AddToAttrs<Attrs_1 extends { [Key in string | number]: any; }, Key extends string | number, Val extends unknown> = { [K in (Key | keyof Attrs_1)]: (unknown extends Attrs_1[K] ? never : Attrs_1[K]) | (Key extends K ? Val : never); };
export type MergeAttrs<Attrs_1 extends { [Key in string | number | symbol]: any; }, NewAttrs extends { [Key in string | number | symbol]: any; }> = { [K in (keyof NewAttrs | keyof Attrs_1)]: (unknown extends Attrs_1[K] ? never : Attrs_1[K]) | (unknown extends NewAttrs[K] ? never : NewAttrs[K]); };
export type DeltaAny = Delta<any>;
export type DeltaBuilderAny = DeltaBuilder<any>;
export type DeltaConf = {
    name?: string | undefined;
    children?: fingerprintTrait.Fingerprintable;
    text?: boolean | undefined;
    attrs?: {
        [K: string]: fingerprintTrait.Fingerprintable;
        [K: number]: fingerprintTrait.Fingerprintable;
    } | undefined;
    fixed?: boolean | undefined;
    recursiveChildren?: boolean | undefined;
    recursiveAttrs?: boolean | undefined;
};
export type DeltaConfGetName<DConf extends DeltaConf> = DConf extends {
    name: infer Name;
} ? (unknown extends Name ? any : (Exclude<Name, undefined>)) : any;
export type DeltaConfGetChildren<DConf extends DeltaConf> = (DConf extends {
    children: infer Children_1;
} ? (unknown extends Children_1 ? any : Children_1) : never) | (DConf extends {
    recursiveChildren: true;
} ? Delta<DConf> : never);
export type DeltaConfGetAllowedChildren<DConf extends DeltaConf> = DConf extends {
    fixed: true;
} ? DeltaConfGetChildren<DConf> : any;
export type DeltaConfGetText<DConf extends DeltaConf> = 0 extends (1 & DConf) ? string : (DConf extends {
    text: true;
} ? string : never);
export type DeltaConfGetAttrs<DConf extends DeltaConf> = import("../ts.js").TypeIsAny<DConf, {
    [K: string | number]: any;
}, (DConf extends {
    attrs: infer Attrs_1;
} ? (Attrs_1 extends undefined ? {} : Attrs_1) : {})>;
export type DeltaConfGetAllowedAttrs<DConf extends DeltaConf> = DConf extends {
    fixed: true;
} ? DeltaConfGetAttrs<DConf> : {
    [K: string | number]: any;
};
export type DeltaConfGetFixed<DConf extends DeltaConf> = 0 extends (1 & DConf) ? true : (DConf extends {
    fixed: true;
} ? true : false);
export type DeltaConfGetRecursiveChildren<DConf extends DeltaConf> = DConf extends {
    recursiveChildren: true;
} ? true : false;
export type DeltaConfigGetRecursiveAttrs<DConf extends DeltaConf> = DConf extends {
    recursiveAttrs: true;
} ? true : false;
/**
 * Transform Delta(Builder) to a normal delta.
 */
export type _SanifyDelta<V> = V extends never ? never : (import("../ts.js").TypeIsAny<V, any, V extends Delta<infer DConf> ? Delta<DConf> : V>);
export type PrettifyDeltaConf<DConf extends DeltaConf> = import("../ts.js").Prettify<{ [K in keyof DConf]: K extends "attrs" ? import("../ts.js").Prettify<{ [KA in keyof DConf[K]]: _SanifyDelta<DConf[K][KA]>; }, 1> : (K extends "children" ? _SanifyDelta<DConf[K]> : DConf[K]); }, 1>;
export type DeltaConfOverwrite<D1 extends DeltaConf, D2 extends DeltaConf> = import("../ts.js").TypeIsAny<D1, any, PrettifyDeltaConf<{ [K in (keyof D1 | keyof D2)]: K extends keyof D2 ? D2[K] : (K extends keyof D1 ? D1[K] : never); }>>;
export type qq = string extends never ? true : false;
import * as s from '../schema.js';
import * as list from '../list.js';
import * as equalityTrait from '../trait/equality.js';
import * as fingerprintTrait from '../trait/fingerprint.js';
/**
 * @template {{[Key in string|number]: any}} Attrs
 * @template {string|number} Key
 * @template {any} Val
 * @typedef {{ [K in (Key | keyof Attrs)]: (unknown extends Attrs[K] ? never : Attrs[K]) | (Key extends K ? Val : never) }} AddToAttrs
 */
/**
 * @template {{[Key in string|number|symbol]: any}} Attrs
 * @template {{[Key in string|number|symbol]: any}} NewAttrs
 * @typedef {{ [K in (keyof NewAttrs | keyof Attrs)]: (unknown extends Attrs[K] ? never : Attrs[K]) | (unknown extends NewAttrs[K] ? never : NewAttrs[K]) }} MergeAttrs
 */
/**
 * @typedef {Delta<any>} DeltaAny
 */
/**
 * @typedef {DeltaBuilder<any>} DeltaBuilderAny
 */
/**
 * @typedef {object} DeltaConf
 * @property {string} [DeltaConf.name]
 * @property {fingerprintTrait.Fingerprintable} [DeltaConf.children=never]
 * @property {boolean} [DeltaConf.text=never]
 * @property {{[K:string|number]:fingerprintTrait.Fingerprintable}} [DeltaConf.attrs={}]
 * @property {boolean} [DeltaConf.fixed=never]
 * @property {boolean} [DeltaConf.recursiveChildren=false]
 * @property {boolean} [DeltaConf.recursiveAttrs=false]
 */
/**
 * @template {DeltaConf} DConf
 * @typedef {DConf extends {name:infer Name} ? (unknown extends Name ? any : (Exclude<Name,undefined>)) : any} DeltaConfGetName
 */
/**
 * @template {DeltaConf} DConf
 * @typedef {(DConf extends {children:infer Children} ? (unknown extends Children ? any : Children) : never) | (DConf extends {recursiveChildren:true} ? Delta<DConf> : never)} DeltaConfGetChildren
 */
/**
 * @template {DeltaConf} DConf
 * @typedef {DConf extends {fixed:true} ? DeltaConfGetChildren<DConf> : any } DeltaConfGetAllowedChildren
 */
/**
 * @template {DeltaConf} DConf
 * @typedef {0 extends (1 & DConf) ? string : (DConf extends {text:true} ? string : never)} DeltaConfGetText
 */
/**
 * @template {DeltaConf} DConf
 * @typedef {import('../ts.js').TypeIsAny<DConf, {[K:string|number]:any}, (DConf extends {attrs:infer Attrs} ? (Attrs extends undefined ? {} : Attrs) : {})>} DeltaConfGetAttrs
 */
/**
 * @template {DeltaConf} DConf
 * @typedef {DConf extends {fixed:true} ? DeltaConfGetAttrs<DConf> : {[K:string|number]:any}} DeltaConfGetAllowedAttrs
 */
/**
 * @template {DeltaConf} DConf
 * @typedef {0 extends (1 & DConf) ? true : (DConf extends { fixed: true } ? true : false)} DeltaConfGetFixed
 */
/**
 * @template {DeltaConf} DConf
 * @typedef {DConf extends {recursiveChildren:true} ? true : false} DeltaConfGetRecursiveChildren
 */
/**
 * @template {DeltaConf} DConf
 * @typedef {DConf extends {recursiveAttrs:true} ? true : false} DeltaConfigGetRecursiveAttrs
 */
/**
 * Transform Delta(Builder) to a normal delta.
 *
 * @template V
 * @typedef {V extends never ? never : (import('../ts.js').TypeIsAny<V,any,V extends Delta<infer DConf> ? Delta<DConf> : V>)} _SanifyDelta
 */
/**
 * @template {DeltaConf} DConf
 * @typedef {import('../ts.js').Prettify<{[K in keyof DConf]: K extends 'attrs' ? import('../ts.js').Prettify<{ [KA in keyof DConf[K]]: _SanifyDelta<DConf[K][KA]> },1> : (K extends 'children' ? _SanifyDelta<DConf[K]> : DConf[K]) }, 1>} PrettifyDeltaConf
 */
/**
 * @template {DeltaConf} D1
 * @template {DeltaConf} D2
 * @typedef {import('../ts.js').TypeIsAny<D1, any, PrettifyDeltaConf<{[K in (keyof D1|keyof D2)]: K extends keyof D2 ? D2[K] : (K extends keyof D1 ? D1[K] : never)}>>} DeltaConfOverwrite
 */
/**
 * @template {string} Name
 * @template {{[K in string|number]:any}} Attrs
 * @template Children
 * @template {boolean} Text
 */
declare class DeltaData<Name extends string, Attrs extends { [K in string | number]: any; }, Children, Text extends boolean> {
    /**
     * @param {string?} name
     * @param {s.Schema<Delta<any>>?} $schema
     */
    constructor(name: string | null, $schema: s.Schema<Delta<any>> | null);
    name: Name;
    $schema: s.Schema<Delta<any>> | null;
    /**
     * @type {{ [K in keyof Attrs]?: K extends string|number ? (SetAttrOp<Attrs[K],K>|DeleteAttrOp<Attrs[K],K>|(Attrs[K] extends never ? never : (Attrs[K] extends Delta ? ModifyAttrOp<Extract<Attrs[K],Delta>,K> : never))) : never }
     *       & { [Symbol.iterator]: () => Iterator<{ [K in keyof Attrs]: K extends string|number ? (SetAttrOp<Attrs[K],K>|DeleteAttrOp<Attrs[K],K>|(Attrs[K] extends never ? never : (Delta extends Attrs[K] ? ModifyAttrOp<Extract<Attrs[K],Delta>,K> : never))) : never }[keyof Attrs]> }
     * }
     */
    attrs: { [K in keyof Attrs]?: K extends string | number ? (SetAttrOp<Attrs[K], K> | DeleteAttrOp<Attrs[K], K> | (Attrs[K] extends never ? never : (Attrs[K] extends Delta ? ModifyAttrOp<Extract<Attrs[K], Delta>, K> : never))) : never; } & {
        [Symbol.iterator]: () => Iterator<{ [K in keyof Attrs]: K extends string | number ? (SetAttrOp<Attrs[K], K> | DeleteAttrOp<Attrs[K], K> | (Attrs[K] extends never ? never : (Delta extends Attrs[K] ? ModifyAttrOp<Extract<Attrs[K], Delta>, K> : never))) : never; }[keyof Attrs]>;
    };
    /**
     * @type {list.List<
     *   | (Text extends true ? (RetainOp|TextOp|DeleteOp<any>) : never)
     *   | (RetainOp|InsertOp<Children>|DeleteOp<any>|(Delta extends Children ? ModifyOp<Extract<Children,Delta>> : never))
     * >}
     */
    children: list.List<(Text extends true ? (RetainOp | TextOp | DeleteOp<any>) : never) | (RetainOp | InsertOp<Children> | DeleteOp<any> | (Delta extends Children ? ModifyOp<Extract<Children, Delta>> : never))>;
    childCnt: number;
    /**
     * @type {any}
     */
    origin: any;
    /**
     * @type {string|null}
     */
    _fingerprint: string | null;
    isDone: boolean;
}
import * as prng from '../prng.js';
export {};
//# sourceMappingURL=delta.d.ts.map