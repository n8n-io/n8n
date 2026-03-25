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
 * @typedef {s.Unwrap<$anyOp>} DeltaOps
 */
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
 * @typedef {AttrInsertOp<any>|AttrDeleteOp<any>|AttrModifyOp} AttrOpAny
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
 * @template {fingerprintTrait.Fingerprintable} ArrayContent
 */
export class InsertOp<ArrayContent extends fingerprintTrait.Fingerprintable> extends list.ListNode {
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
 * @template {fingerprintTrait.Fingerprintable} [Children=never]
 * @template {string} [Text=never]
 */
export class DeleteOp<Children extends fingerprintTrait.Fingerprintable = never, Text extends string = never> extends list.ListNode {
    /**
     * @param {number} len
     */
    constructor(len: number);
    delete: number;
    /**
     * @type {(Children|Text) extends never ? null : (Delta<any,{},Children,Text>?)}
     */
    prevValue: (Children | Text) extends never ? null : (Delta<any, {}, Children, Text> | null);
    /**
     * @type {string|null}
     */
    _fingerprint: string | null;
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
    clone(start?: number, end?: number): DeleteOp<never, never>;
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
 * @template {DeltaAny} [DTypes=DeltaAny]
 */
export class ModifyOp<DTypes extends DeltaAny = DeltaAny> extends list.ListNode {
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
 * @template {fingerprintTrait.Fingerprintable} V
 * @template {string|number} [K=any]
 */
export class AttrInsertOp<V extends fingerprintTrait.Fingerprintable, K extends string | number = any> {
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
        value: V | DeltaJSON;
    } & (({
        attribution: Attribution;
    } | {
        attribution?: undefined;
    }) & ({
        prevValue: V & {};
    } | {
        prevValue?: undefined;
    }));
    /**
     * @return {AttrInsertOp<V,K>}
     */
    clone(): AttrInsertOp<V, K>;
    /**
     * @param {AttrInsertOp<V>} other
     */
    [equalityTrait.EqualityTraitSymbol](other: AttrInsertOp<V>): boolean;
}
/**
 * @template V
 * @template {string|number} [K=string]
 */
export class AttrDeleteOp<V, K extends string | number = string> {
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
    get value(): undefined;
    /**
     * @type {'delete'}
     */
    get type(): "delete";
    get fingerprint(): string;
    /**
     * @return {DeltaAttrOpJSON}
     */
    toJSON(): DeltaAttrOpJSON;
    clone(): AttrDeleteOp<V, K>;
    /**
     * @param {AttrDeleteOp<V>} other
     */
    [equalityTrait.EqualityTraitSymbol](other: AttrDeleteOp<V>): boolean;
}
/**
 * @template {DeltaAny} [Modifier=DeltaAny]
 * @template {string|number} [K=string]
 */
export class AttrModifyOp<Modifier extends DeltaAny = DeltaAny, K extends string | number = string> {
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
     * @return {AttrModifyOp<Modifier,K>}
     */
    clone(): AttrModifyOp<Modifier, K>;
    /**
     * @param {AttrModifyOp<Modifier>} other
     */
    [equalityTrait.EqualityTraitSymbol](other: AttrModifyOp<Modifier>): boolean;
}
/**
 * @type {s.Schema<AttrDeleteOp<any> | DeleteOp>}
 */
export const $deleteOp: s.Schema<AttrDeleteOp<any> | DeleteOp>;
/**
 * @type {s.Schema<AttrInsertOp<any> | InsertOp<any>>}
 */
export const $insertOp: s.Schema<AttrInsertOp<any> | InsertOp<any>>;
export function $insertOpWith<Content extends fingerprintTrait.Fingerprintable>($content: s.Schema<Content>): s.Schema<AttrInsertOp<Content> | InsertOp<Content>>;
/**
 * @type {s.Schema<TextOp>}
 */
export const $textOp: s.Schema<TextOp>;
/**
 * @type {s.Schema<RetainOp>}
 */
export const $retainOp: s.Schema<RetainOp>;
/**
 * @type {s.Schema<AttrModifyOp | ModifyOp>}
 */
export const $modifyOp: s.Schema<AttrModifyOp | ModifyOp>;
export function $modifyOpWith<Modify extends DeltaAny>($content: s.Schema<Modify>): s.Schema<AttrModifyOp<Modify> | ModifyOp<Modify>>;
export const $anyOp: s.Schema<AttrInsertOp<any, any> | InsertOp<any> | AttrDeleteOp<any, string> | DeleteOp<never, never> | TextOp | AttrModifyOp<DeltaAny, string> | ModifyOp<DeltaAny>>;
/**
 * @template {Array<any>|string} C1
 * @template {Array<any>|string} C2
 * @typedef {Extract<C1 | C2, Array<any>> extends never
 *   ? never
 *   : (Array<(Extract<C1 | C2,Array<any>> extends Array<infer AC1> ? (unknown extends AC1 ? never : AC1) : never)>)} MergeListArrays
 */
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
 * @template X
 * @typedef {0 extends (1 & X) ? null : X} _AnyToNull
 */
/**
 * @template {s.Schema<Delta<any,any,any,any,any>>|null} Schema
 * @typedef {_AnyToNull<Schema> extends null ? Delta<any,{[key:string|number]:any},any,string> : (Schema extends s.Schema<infer D> ? D : never)} AllowedDeltaFromSchema
 */
/**
 * @typedef {Delta<any,{ [k:string|number]: any },any,any,any>} DeltaAny
 */
/**
 * @typedef {DeltaBuilder<any,{ [k:string|number]: any },any,any,any>} DeltaBuilderAny
 */
/**
 * @template {string} [NodeName=any]
 * @template {{[k:string|number]:any}} [Attrs={}]
 * @template {fingerprintTrait.Fingerprintable} [Children=never]
 * @template {string} [Text=never]
 * @template {s.Schema<Delta<any,any,any,any,any>>|null} [Schema=any]
 */
export class Delta<NodeName extends string = any, Attrs extends {
    [k: string | number]: any;
} = {}, Children extends fingerprintTrait.Fingerprintable = never, Text extends string = never, Schema extends s.Schema<Delta<any, any, any, any, any>> | null = any> {
    /**
     * @param {NodeName} [name]
     * @param {Schema} [$schema]
     */
    constructor(name?: NodeName, $schema?: Schema);
    name: NodeName | null;
    $schema: NonNullable<Schema> | null;
    /**
     * @type {{ [K in keyof Attrs]?: K extends string|number ? (AttrInsertOp<Attrs[K],K>|AttrDeleteOp<Attrs[K],K>|(Delta extends Attrs[K] ? AttrModifyOp<Extract<Attrs[K],DeltaAny>,K> : never)) : never }
     *   & { [Symbol.iterator]: () => Iterator<{ [K in keyof Attrs]: K extends string|number ? (AttrInsertOp<Attrs[K],K>|AttrDeleteOp<Attrs[K],K>|(Delta extends Attrs[K] ? AttrModifyOp<Extract<Attrs[K],DeltaAny>,K> : never)) : never }[keyof Attrs]> }
     * }
     */
    attrs: { [K in keyof Attrs]?: K extends string | number ? (AttrInsertOp<Attrs[K], K> | AttrDeleteOp<Attrs[K], K> | (Delta extends Attrs[K] ? AttrModifyOp<Extract<Attrs[K], DeltaAny>, K> : never)) : never; } & {
        [Symbol.iterator]: () => Iterator<{ [K in keyof Attrs]: K extends string | number ? (AttrInsertOp<Attrs[K], K> | AttrDeleteOp<Attrs[K], K> | (Delta extends Attrs[K] ? AttrModifyOp<Extract<Attrs[K], DeltaAny>, K> : never)) : never; }[keyof Attrs]>;
    };
    /**
     * @type {list.List<
     *   RetainOp
     *   | DeleteOp
     *   | (Text extends never ? never : TextOp)
     *   | (Children extends never ? never : InsertOp<Children>)
     *   | (Delta extends Children ? ModifyOp<Extract<Children,Delta<any,any,any,any,any>>> : never)
     * >}
     */
    children: list.List<RetainOp | DeleteOp | (Text extends never ? never : TextOp) | (Children extends never ? never : InsertOp<Children>) | (Delta extends Children ? ModifyOp<Extract<Children, Delta<any, any, any, any, any>>> : never)>;
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
     * @param {Delta<any,any,any,any,any>} other
     * @return {boolean}
     */
    equals(other: Delta<any, any, any, any, any>): boolean;
    /**
     * @return {DeltaBuilder<NodeName,Attrs,Children,Text,Schema>}
     */
    clone(): DeltaBuilder<NodeName, Attrs, Children, Text, Schema>;
    /**
     * @param {number} start
     * @param {number} end
     * @return {DeltaBuilder<NodeName,Attrs,Children,Text,Schema>}
     */
    slice(start?: number, end?: number): DeltaBuilder<NodeName, Attrs, Children, Text, Schema>;
    /**
     * Mark this delta as done and perform some cleanup (e.g. remove appended retains without
     * formats&attributions). In the future, there might be additional merge operations that can be
     * performed to result in smaller deltas. Set `markAsDone=false` to only perform the cleanup.
     *
     * @return {Delta<NodeName,Attrs,Children,Text,Schema>}
     */
    done(markAsDone?: boolean): Delta<NodeName, Attrs, Children, Text, Schema>;
    [fingerprintTrait.FingerprintTraitSymbol](): string;
    /**
     * @param {any} other
     * @return {boolean}
     */
    [equalityTrait.EqualityTraitSymbol](other: any): boolean;
}
export function clone<D extends DeltaAny>(d: D): D extends DeltaBuilder<infer NodeName_1, infer Attrs_1, infer Children_1, infer Text, infer Schema_1> ? DeltaBuilder<NodeName_1, Attrs_1, Children_1, Text, Schema_1> : never;
/**
 * @template {string} [NodeName=any]
 * @template {{[key:string|number]:any}} [Attrs={}]
 * @template {fingerprintTrait.Fingerprintable} [Children=never]
 * @template {string} [Text=never]
 * @template {s.Schema<Delta<any,any,any,any,any>>|null} [Schema=any]
 * @extends {Delta<NodeName,Attrs,Children,Text,Schema>}
 */
export class DeltaBuilder<NodeName extends string = any, Attrs extends {
    [key: string | number]: any;
} = {}, Children extends fingerprintTrait.Fingerprintable = never, Text extends string = never, Schema extends s.Schema<Delta<any, any, any, any, any>> | null = any> extends Delta<NodeName, Attrs, Children, Text, Schema> {
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
     * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,any,infer Children,infer Text,infer Schema> ? ((Children extends never ? never : Array<Children>) | Text) : never} NewContent
     * @param {NewContent} insert
     * @param {FormattingAttributes?} [formatting]
     * @param {Attribution?} [attribution]
     * @return {DeltaBuilder<
     *   NodeName,
     *   Attrs,
     *   Exclude<NewContent,string>[number]|Children,
     *   (Extract<NewContent,string>|Text) extends never ? never : string,
     *   Schema
     * >}
     */
    insert<NewContent extends AllowedDeltaFromSchema<Schema> extends Delta<any, any, infer Children_1, infer Text_1, infer Schema_1> ? ((Children_1 extends never ? never : Array<Children_1>) | Text_1) : never>(insert: NewContent, formatting?: FormattingAttributes | null, attribution?: Attribution | null): DeltaBuilder<NodeName, Attrs, Exclude<NewContent, string>[number] | Children, (Extract<NewContent, string> | Text) extends never ? never : string, Schema>;
    /**
     * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,any,infer Children,any,any> ? Extract<Children,Delta<any,any,any,any,any>> : never} NewContent
     * @param {NewContent} modify
     * @param {FormattingAttributes?} formatting
     * @param {Attribution?} attribution
     * @return {DeltaBuilder<
     *   NodeName,
     *   Attrs,
     *   Exclude<NewContent,string>[number]|Children,
     *   (Extract<NewContent,string>|Text) extends string ? string : never,
     *   Schema
     * >}
     */
    modify<NewContent extends AllowedDeltaFromSchema<Schema> extends Delta<any, any, infer Children_1, any, any> ? Extract<Children_1, Delta<any, any, any, any, any>> : never>(modify: NewContent, formatting?: FormattingAttributes | null, attribution?: Attribution | null): DeltaBuilder<NodeName, Attrs, Exclude<NewContent, string>[number] | Children, (Extract<NewContent, string> | Text) extends string ? string : never, Schema>;
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
     * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,infer Attrs,any,any,any> ? (keyof Attrs) : never} Key
     * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,infer Attrs,any,any,any> ? (Attrs[Key]) : never} Val
     * @param {Key} key
     * @param {Val} val
     * @param {Attribution?} attribution
     * @param {Val|undefined} [prevValue]
     * @return {DeltaBuilder<
     *   NodeName,
     *   { [K in keyof AddToAttrs<Attrs,Key,Val>]: AddToAttrs<Attrs,Key,Val>[K]  },
     *   Children,
     *   Text,
     *   Schema
     * >}
     */
    set<Key extends AllowedDeltaFromSchema<Schema> extends Delta<any, infer Attrs_1, any, any, any> ? (keyof Attrs_1) : never, Val extends AllowedDeltaFromSchema<Schema> extends Delta<any, infer Attrs_1, any, any, any> ? (Attrs_1[Key]) : never>(key: Key, val: Val, attribution?: Attribution | null, prevValue?: Val | undefined): DeltaBuilder<NodeName, { [K in keyof AddToAttrs<Attrs, Key, Val>]: AddToAttrs<Attrs, Key, Val>[K]; }, Children, Text, Schema>;
    /**
     * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,infer Attrs,any,any,any> ? Attrs : never} NewAttrs
     * @param {NewAttrs} attrs
     * @param {Attribution?} attribution
     * @return {DeltaBuilder<
     *   NodeName,
     *   { [K in keyof MergeAttrs<Attrs,NewAttrs>]: MergeAttrs<Attrs,NewAttrs>[K] },
     *   Children,
     *   Text,
     *   Schema
     * >}
     */
    setMany<NewAttrs extends AllowedDeltaFromSchema<Schema> extends Delta<any, infer Attrs_1, any, any, any> ? Attrs_1 : never>(attrs: NewAttrs, attribution?: Attribution | null): DeltaBuilder<NodeName, { [K in keyof MergeAttrs<Attrs, NewAttrs>]: MergeAttrs<Attrs, NewAttrs>[K]; }, Children, Text, Schema>;
    /**
     * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,infer As,any,any,any> ? keyof As : never} Key
     * @param {Key} key
     * @param {Attribution?} attribution
     * @param {any} [prevValue]
     * @return {DeltaBuilder<
     *   NodeName,
     *   { [K in keyof AddToAttrs<Attrs,Key,never>]: AddToAttrs<Attrs,Key,never>[K] },
     *   Children,
     *   Text,
     *   Schema
     * >}
     */
    unset<Key extends AllowedDeltaFromSchema<Schema> extends Delta<any, infer As, any, any, any> ? keyof As : never>(key: Key, attribution?: Attribution | null, prevValue?: any): DeltaBuilder<NodeName, { [K in keyof AddToAttrs<Attrs, Key, never>]: AddToAttrs<Attrs, Key, never>[K]; }, Children, Text, Schema>;
    /**
     * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,infer As,any,any,any> ? { [K in keyof As]: Extract<As[K],Delta<any,any,any,any,any>> extends never ? never : K }[keyof As] : never} Key
     * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,infer As,any,any,any> ? Extract<As[Key],Delta<any,any,any,any,any>> : never} D
     * @param {Key} key
     * @param {D} modify
     * @return {DeltaBuilder<
     *   NodeName,
     *   { [K in keyof AddToAttrs<Attrs,Key,D>]: AddToAttrs<Attrs,Key,D>[K]  },
     *   Children,
     *   Text,
     *   Schema
     * >}
     */
    update<Key extends AllowedDeltaFromSchema<Schema> extends Delta<any, infer As, any, any, any> ? { [K in keyof As]: Extract<As[K], Delta<any, any, any, any, any>> extends never ? never : K; }[keyof As] : never, D extends AllowedDeltaFromSchema<Schema> extends Delta<any, infer As, any, any, any> ? Extract<As[Key], Delta<any, any, any, any, any>> : never>(key: Key, modify: D): DeltaBuilder<NodeName, { [K in keyof AddToAttrs<Attrs, Key, D>]: AddToAttrs<Attrs, Key, D>[K]; }, Children, Text, Schema>;
    /**
     * @param {Delta<NodeName,Attrs,Children,Text,any>} other
     */
    apply(other: Delta<NodeName, Attrs, Children, Text, any>): this;
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
     * @template {DeltaAny} OtherDelta
     * @param {OtherDelta} other
     * @return {CastToDelta<OtherDelta> extends Delta<any,any,infer OtherChildren,infer OtherText,any> ? DeltaBuilder<NodeName,Attrs,Children|OtherChildren,Text|OtherText,Schema> : never}
     */
    append<OtherDelta extends DeltaAny>(other: OtherDelta): CastToDelta<OtherDelta> extends Delta<any, any, infer OtherChildren, infer OtherText, any> ? DeltaBuilder<NodeName, Attrs, Children | OtherChildren, Text | OtherText, Schema> : never;
}
/**
 * @template {DeltaAny} D
 * @typedef {D extends DeltaBuilder<infer N,infer Attrs,infer Children,infer Text,infer Schema> ? Delta<N,Attrs,Children,Text,Schema> : D} CastToDelta
 */
/**
 * @template {string} NodeName
 * @template {{ [key: string|number]: any }} [Attrs={}]
 * @template {fingerprintTrait.Fingerprintable|never} [Children=never]
 * @template {string|never} [Text=never]
 * @typedef {Delta<NodeName,Attrs,Children|Delta<NodeName,Attrs,Children,Text>|RecursiveDelta<NodeName,Attrs,Children,Text>,Text>} RecursiveDelta
 */
/**
 * @template {string} Name
 * @template {{[k:string|number]:any}} Attrs
 * @template {fingerprintTrait.Fingerprintable} Children
 * @template {boolean} HasText
 * @template {{ [k:string]:any }} Formats
 * @template {boolean} Recursive
 * @extends {s.Schema<Delta<
 *   Name,
 *   Attrs,
 *   Children|(Recursive extends true ? RecursiveDelta<Name,Attrs,Children,HasText extends true ? string : never> : never),
 *   HasText extends true ? string : never,
 *   any>>}
 */
export class $Delta<Name extends string, Attrs extends {
    [k: string | number]: any;
}, Children extends fingerprintTrait.Fingerprintable, HasText extends boolean, Formats extends {
    [k: string]: any;
}, Recursive extends boolean> extends s.Schema<Delta<Name, Attrs, Children | (Recursive extends true ? RecursiveDelta<Name, Attrs, Children, HasText extends true ? string : never> : never), HasText extends true ? string : never, any>> {
    /**
     * @param {s.Schema<Name>} $name
     * @param {s.Schema<Attrs>} $attrs
     * @param {s.Schema<Children>} $children
     * @param {HasText} hasText
     * @param {s.Schema<Formats>} $formats
     * @param {Recursive} recursive
     */
    constructor($name: s.Schema<Name>, $attrs: s.Schema<Attrs>, $children: s.Schema<Children>, hasText: HasText, $formats: s.Schema<Formats>, recursive: Recursive);
    shape: {
        $name: s.Schema<Name>;
        $attrs: s.Schema<Attrs> | s.Schema<Partial<s.$ObjectToType<{
            [key: string]: s.Schema<any>;
            [key: number]: s.Schema<any>;
            [key: symbol]: s.Schema<any>;
        }>>>;
        $children: s.Schema<Children>;
        hasText: HasText;
        $formats: s.Schema<Formats>;
    };
}
export function $delta<NodeNameSchema extends s.Schema<string> | string | Array<string> = s.Schema<any>, AttrsSchema extends s.Schema<{
    [key: string | number]: any;
}> | {
    [key: string | number]: any;
} = s.Schema<{}>, ChildrenSchema extends unknown = s.Schema<never>, HasText extends boolean = false, Recursive extends boolean = false, Formats extends {
    [k: string]: any;
} = {
    [k: string]: any;
}>({ name, attrs, children, text, formats, recursive }: {
    name?: NodeNameSchema | null | undefined;
    attrs?: AttrsSchema | null | undefined;
    children?: ChildrenSchema | null | undefined;
    text?: HasText | undefined;
    formats?: Formats | undefined;
    recursive?: Recursive | undefined;
}): [s.Unwrap<s.ReadSchema<NodeNameSchema>>, s.Unwrap<s.ReadSchema<AttrsSchema>>, s.Unwrap<s.ReadSchema<ChildrenSchema>>] extends [infer NodeName_1, infer Attrs_1, infer Children_1] ? s.Schema<Delta<NodeName_1, Attrs_1, Children_1 | (Recursive extends true ? RecursiveDelta<NodeName_1, Attrs_1, Children_1, HasText extends true ? string : never> : never), HasText extends true ? string : never>> : never;
export const $$delta: s.Schema<$Delta<string, {
    [k: string]: any;
    [k: number]: any;
}, fingerprintTrait.Fingerprintable, boolean, {
    [k: string]: any;
}, boolean>>;
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
/**
 * @type {s.Schema<DeltaAny>}
 */
export const $deltaAny: s.Schema<DeltaAny>;
/**
 * @type {s.Schema<DeltaBuilderAny>}
 */
export const $deltaBuilderAny: s.Schema<DeltaBuilderAny>;
export function mergeAttrs<T extends {
    [key: string]: any;
}>(a: T | null, b: T | null): T | null;
export function mergeDeltas<D extends DeltaAny | null>(a: D, b: D): D;
export function random<D extends DeltaAny>(gen: prng.PRNG, $d: s.Schema<D>): D extends Delta<infer NodeName_1, infer Attrs_1, infer Children_1, infer Text, infer Schema_1> ? DeltaBuilder<NodeName_1, Attrs_1, Children_1, Text, Schema_1> : never;
/**
 * @overload
 * @return {DeltaBuilder<any,{},never,never,null>}
 */
export function create(): DeltaBuilder<any, {}, never, never, null>;
/**
 * @template {string} NodeName
 * @overload
 * @param {NodeName} nodeName
 * @return {DeltaBuilder<NodeName,{},never,never,null>}
 */
export function create<NodeName extends string>(nodeName: NodeName): DeltaBuilder<NodeName, {}, never, never, null>;
/**
 * @template {string} NodeName
 * @template {s.Schema<DeltaAny>} Schema
 * @overload
 * @param {NodeName} nodeName
 * @param {Schema} schema
 * @return {Schema extends s.Schema<Delta<infer N,infer Attrs,infer Children,infer Text,any>> ? DeltaBuilder<NodeName,Attrs,Children,Text,Schema> : never}
 */
export function create<NodeName extends string, Schema extends s.Schema<DeltaAny>>(nodeName: NodeName, schema: Schema): Schema extends s.Schema<Delta<infer N, infer Attrs_1, infer Children_1, infer Text, any>> ? DeltaBuilder<NodeName, Attrs_1, Children_1, Text, Schema> : never;
/**
 * @template {s.Schema<DeltaAny>} Schema
 * @overload
 * @param {Schema} schema
 * @return {Schema extends s.Schema<Delta<infer N,infer Attrs,infer Children,infer Text,any>> ? DeltaBuilder<N,Attrs,Children,Text,Schema> : never}
 */
export function create<Schema extends s.Schema<DeltaAny>>(schema: Schema): Schema extends s.Schema<Delta<infer N, infer Attrs_1, infer Children_1, infer Text, any>> ? DeltaBuilder<N, Attrs_1, Children_1, Text, Schema> : never;
/**
 * @template {string|null} NodeName
 * @template {{[k:string|number]:any}|null} Attrs
 * @template {Array<any>|string} [Children=never]
 * @overload
 * @param {NodeName} nodeName
 * @param {Attrs} attrs
 * @param {Children} [children]
 * @return {DeltaBuilder<
 *   NodeName extends null ? any : NodeName,
 *   Attrs extends null ? {} : Attrs,
 *   Extract<Children,Array<any>> extends Array<infer Ac> ? (unknown extends Ac ? never : Ac) : never,
 *   Extract<Children,string>,
 *   null
 * >}
 */
export function create<NodeName extends string, Attrs extends {
    [k: string | number]: any;
} | null, Children extends Array<any> | string = never>(nodeName: NodeName, attrs: Attrs, children?: Children | undefined): DeltaBuilder<NodeName extends null ? any : NodeName, Attrs extends null ? {} : Attrs, Extract<Children, Array<any>> extends Array<infer Ac> ? (unknown extends Ac ? never : Ac) : never, Extract<Children, string>, null>;
export function $text<$Embeds extends Array<s.Schema<any>> = any>(...$embeds: $Embeds): s.Schema<TextDelta<_AnyToNull<$Embeds> extends null ? never : ($Embeds extends Array<s.Schema<infer $C>> ? $C : never)>>;
export const $textOnly: s.Schema<TextDelta<unknown>>;
export function text<Schema_1 extends s.Schema<Delta<any, {}, any, any, null>> = s.Schema<Delta<any, {}, never, string, null>>>($schema?: Schema_1): Schema_1 extends s.Schema<Delta<infer N, infer Attrs_1, infer Children_1, infer Text, any>> ? DeltaBuilder<N, Attrs_1, Children_1, Text, Schema_1> : never;
export function $array<$Children extends unknown>($children?: $Children): s.Schema<ArrayDelta<s.Unwrap<s.ReadSchema<$Children>>>>;
export function array<$Schema extends s.Schema<ArrayDelta<any>> = never>($schema: $Schema): $Schema extends never ? ArrayDeltaBuilder<never> : DeltaBuilder<any, {}, never, never, $Schema>;
export function $map<$Attrs extends {
    [K: string | number]: any;
}>($attrs: s.Schema<$Attrs>): s.Schema<MapDelta<$Attrs>>;
export function map<$Schema extends s.Schema<MapDelta<any>> | undefined = undefined>($schema?: $Schema): $Schema extends s.Schema<MapDelta<infer Attrs_1>> ? DeltaBuilder<any, Attrs_1, never, never, $Schema> : MapDeltaBuilder<{}>;
export function diff<D extends DeltaAny>(d1: D, d2: NoInfer<D>): D extends Delta<infer N, infer Attrs_1, infer Children_1, infer Text, any> ? DeltaBuilder<N, Attrs_1, Children_1, Text, null> : never;
export type Attribution = {
    insert?: string[];
    insertAt?: number;
    delete?: string[];
    deleteAt?: number;
    format?: Record<string, string[]>;
    formatAt?: number;
};
export type DeltaOps = s.Unwrap<s.Schema<AttrInsertOp<any, any> | InsertOp<any> | AttrDeleteOp<any, string> | DeleteOp<never, never> | TextOp | AttrModifyOp<DeltaAny, string> | ModifyOp<DeltaAny>>>;
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
export type AttrOpAny = AttrInsertOp<any> | AttrDeleteOp<any> | AttrModifyOp;
export type _OpAny = ChildrenOpAny | AttrOpAny;
export type MergeListArrays<C1 extends Array<any> | string, C2 extends Array<any> | string> = Extract<C1 | C2, Array<any>> extends never ? never : (Array<(Extract<C1 | C2, Array<any>> extends Array<infer AC1> ? (unknown extends AC1 ? never : AC1) : never)>);
export type AddToAttrs<Attrs_1 extends { [Key in string | number]: any; }, Key extends string | number, Val extends unknown> = { [K in (Key | keyof Attrs_1)]: (unknown extends Attrs_1[K] ? never : Attrs_1[K]) | (Key extends K ? Val : never); };
export type MergeAttrs<Attrs_1 extends { [Key in string | number | symbol]: any; }, NewAttrs extends { [Key in string | number | symbol]: any; }> = { [K in (keyof NewAttrs | keyof Attrs_1)]: (unknown extends Attrs_1[K] ? never : Attrs_1[K]) | (unknown extends NewAttrs[K] ? never : NewAttrs[K]); };
export type _AnyToNull<X> = 0 extends (1 & X) ? null : X;
export type AllowedDeltaFromSchema<Schema_1 extends s.Schema<Delta<any, any, any, any, any>> | null> = _AnyToNull<Schema_1> extends null ? Delta<any, {
    [key: string | number]: any;
}, any, string> : (Schema_1 extends s.Schema<infer D> ? D : never);
export type DeltaAny = Delta<any, {
    [k: string | number]: any;
}, any, any, any>;
export type DeltaBuilderAny = DeltaBuilder<any, {
    [k: string | number]: any;
}, any, any, any>;
export type CastToDelta<D extends DeltaAny> = D extends DeltaBuilder<infer N, infer Attrs_1, infer Children_1, infer Text, infer Schema_1> ? Delta<N, Attrs_1, Children_1, Text, Schema_1> : D;
export type RecursiveDelta<NodeName_1 extends string, Attrs_1 extends {
    [key: string | number]: any;
} = {}, Children_1 extends fingerprintTrait.Fingerprintable | never = never, Text extends string | never = never> = Delta<NodeName_1, Attrs_1, Children_1 | Delta<NodeName_1, Attrs_1, Children_1, Text> | RecursiveDelta<NodeName_1, Attrs_1, Children_1, Text>, Text>;
export type TextDelta<Embeds extends fingerprintTrait.Fingerprintable = never> = Delta<any, {}, Embeds, string>;
export type TextDeltaBuilder<Embeds extends fingerprintTrait.Fingerprintable = never> = DeltaBuilder<any, {}, Embeds, string>;
export type ArrayDelta<Children_1 extends fingerprintTrait.Fingerprintable> = Delta<any, {}, Children_1, never>;
export type ArrayDeltaBuilder<Children_1 extends fingerprintTrait.Fingerprintable> = DeltaBuilder<any, {}, Children_1, never>;
export type MapDelta<Attrs_1 extends {
    [K: string | number]: any;
}> = Delta<any, Attrs_1, never, never>;
export type MapDeltaBuilder<Attrs_1 extends {
    [K: string | number]: any;
}> = DeltaBuilder<any, Attrs_1, never, never>;
import * as s from '../schema.js';
import * as list from '../list.js';
import * as equalityTrait from '../trait/equality.js';
import * as fingerprintTrait from '../trait/fingerprint.js';
import * as prng from '../prng.js';
//# sourceMappingURL=delta.d.ts.map