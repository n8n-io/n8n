export declare const draft: "2020-12";
export declare const $schema: "https://json-schema.org/draft/2020-12/schema";
type MaybeReadonlyArray<T> = Array<T> | ReadonlyArray<T>;
type ValueOf<T> = T[keyof T];
/**
 * JSON Schema [Draft 2020-12](https://json-schema.org/draft/2020-12/json-schema-validation.html)
 */
export type JSONSchema<Value = any, SchemaType = Value extends boolean ? "boolean" : Value extends null ? "null" : Value extends number ? "number" | "integer" : Value extends string ? "string" : Value extends unknown[] ? "array" : Value extends Record<string | number, unknown> ? "object" : JSONSchema.TypeValue> = boolean | {
    /**
     * Using JSON Pointer fragments requires knowledge of the structure of the
     * schema. When writing schema documents with the intention to provide
     * re-usable schemas, it may be preferable to use a plain name fragment
     * that is not tied to any particular structural location.  This allows a
     * subschema to be relocated without requiring JSON Pointer references to
     * be updated.
     *
     * The `$anchor` keyword is used to specify such a fragment.  It is an
     * identifier keyword that can only be used to create plain name fragments.
     *
     * If present, the value of this keyword MUST be a string, which MUST start
     * with a letter `[A-Za-z]`, followed by any number of letters, digits
     * `[0-9]`, hyphens `-`, underscores `_`, colons `:`,
     * or periods `.`.
     *
     * Note that the anchor string does not include the `#` character,
     * as it is not a URI-reference.  An `{"$anchor": "foo"}` becomes the
     * fragment `#foo` when used in a URI.
     *
     * The base URI to which the resulting fragment is appended is determined
     * by the `$id` keyword as explained in the previous section.
     * Two `$anchor` keywords in the same schema document MAY have the same
     * value if they apply to different base URIs, as the resulting full URIs
     * will be distinct.  However, the effect of two `$anchor` keywords
     * with the same value and the same base URI is undefined.  Implementations
     * MAY raise an error if such usage is detected.
     */
    $anchor?: string;
    /**
     * This keyword reserves a location for comments from schema authors to
     * readers or maintainers of the schema.
     *
     * The value of this keyword MUST be a string. Implementations MUST NOT
     * present this string to end users.  Tools for editing schemas SHOULD
     * support displaying and editing this keyword.  The value of this keyword
     * MAY be used in debug or error output which is intended for developers
     * making use of schemas.
     *
     * Schema vocabularies SHOULD allow `$comment` within any object
     * containing vocabulary keywords.  Implementations MAY assume `$comment`
     * is allowed unless the vocabulary specifically forbids it.  Vocabularies
     * MUST NOT specify any effect of `$comment` beyond what is described in
     * this specification.
     *
     * Tools that translate other media types or programming languages
     * to and from `application/schema+json` MAY choose to convert that media
     * type or programming language's native comments to or from `$comment`
     * values. The behavior of such translation when both native comments and
     * `$comment` properties are present is implementation-dependent.
     *
     * Implementations MAY strip `$comment` values at any point during
     * processing. In particular, this allows for shortening schemas when the
     * size of deployed schemas is a concern.
     *
     * Implementations MUST NOT take any other action based on the presence,
     * absence, or contents of `$comment` properties.  In particular, the
     * value of `$comment` MUST NOT be collected as an annotation result.
     */
    $comment?: string;
    /**
     * The `$defs` keyword reserves a location for schema authors to inline
     * re-usable JSON Schemas into a more general schema. The keyword does not
     * directly affect the validation result.
     *
     * This keyword's value MUST be an object. Each member value of this object
     * MUST be a valid JSON Schema.
     */
    $defs?: Record<string, JSONSchema>;
    /**
     * "The `$dynamicAnchor` indicates that the fragment is an extension
     * point when used with the `$dynamicRef` keyword. This low-level,
     * advanced feature makes it easier to extend recursive schemas such as the
     * meta-schemas, without imposing any particular semantics on that
     * extension. See `$dynamicRef` for more details.
     */
    $dynamicAnchor?: string;
    /**
     * The `$dynamicRef` keyword is an applicator that allows for deferring
     * the full resolution until runtime, at which point it is resolved each
     * time it is encountered while evaluating an instance.
     *
     * Together with `$dynamicAnchor`, `$dynamicRef` implements a
     * cooperative extension mechanism that is primarily useful with recursive
     * schemas (schemas that reference themselves).  Both the extension point
     * and the runtime-determined extension target are defined with
     * `$dynamicAnchor`, and only exhibit runtime dynamic behavior when
     * referenced with `$dynamicRef`.
     *
     * The value of the `$dynamicRef` property MUST be a string which is
     * a URI-Reference.  Resolved against the current URI base, it produces
     * the URI used as the starting point for runtime resolution.  This initial
     * resolution is safe to perform on schema load.
     *
     * If the initially resolved starting point URI includes a fragment that
     * was created by the `$dynamicAnchor` keyword, the initial URI MUST be
     * replaced by the URI (including the fragment) for the outermost schema
     * resource in the [dynamic scope][scopes] that defines
     * an identically named fragment with `$dynamicAnchor`.
     *
     * Otherwise, its behavior is identical to `$ref`, and no runtime
     * resolution is needed.
     *
     * [scopes]: https://json-schema.org/draft/2020-12/json-schema-core.html#scopes
     *
     * @format "uri-reference"
     */
    $dynamicRef?: string;
    /**
     * The `$id` keyword identifies a schema resource with its
     * [canonical][[RFC6596]] URI.
     *
     * Note that this URI is an identifier and not necessarily a network
     * locator. In the case of a network-addressable URL, a schema need not be
     * downloadable from its canonical URI.
     *
     * If present, the value for this keyword MUST be a string, and MUST
     * represent a valid [URI-reference][RFC3986].  This URI-reference SHOULD
     * be normalized, and MUST resolve to an [absolute-URI][RFC3986] (without a
     * fragment).  Therefore, `$id` MUST NOT contain a non-empty fragment,
     * and SHOULD NOT contain an empty fragment.
     *
     * Since an empty fragment in the context of the
     * `application/schema+json` media type refers to the same resource as
     * the base URI without a fragment, an implementation MAY normalize a URI
     * ending with an empty fragment by removing the fragment.  However, schema
     * authors SHOULD NOT rely on this behavior across implementations.
     *
     * This URI also serves as the base URI for relative URI-references in
     * keywords within the schema resource, in accordance with
     * [RFC 3986][RFC3986] section 5.1.1 regarding base URIs embedded in
     * content.
     *
     * The presence of `$id` in a subschema indicates that the subschema
     * constitutes a distinct schema resource within a single schema document.
     * Furthermore, in accordance with [RFC 3986][RFC3986] section 5.1.2
     * regarding encapsulating entities, if an `$id` in a subschema is a
     * relative URI-reference, the base URI for resolving that reference is the
     * URI of the parent schema resource.
     *
     * If no parent schema object explicitly identifies itself as a resource
     * with `$id`, the base URI is that of the entire document.
     *
     * The root schema of a JSON Schema document SHOULD contain an `$id`
     * keyword with an [absolute-URI][RFC3986] (containing a scheme, but no
     * fragment).
     *
     * [RFC6596]: https://datatracker.ietf.org/doc/html/rfc6596
     * [RFC3986]: https://datatracker.ietf.org/doc/html/rfc3986
     *
     * @format "uri-reference"
     */
    $id?: string;
    /**
     * The `$ref` keyword is an applicator that is used to reference a
     * statically identified schema. Its results are the results of the
     * referenced schema. Other keywords can appear alongside of `$ref` in
     * the same schema object.
     *
     * The value of the `$ref` property MUST be a string which is a
     * URI-Reference. Resolved against the current URI base, it produces the
     * URI of the schema to apply.
     *
     * @format "uri-reference"
     */
    $ref?: string;
    /**
     * The `$schema` keyword is both used as a JSON Schema dialect identifier
     * and as the identifier of a resource which is itself a JSON Schema, which
     * describes the set of valid schemas written for this particular dialect.
     *
     * The value of this keyword MUST be a [URI][RFC3986] (containing a scheme)
     * and this URI MUST be normalized. The current schema MUST be valid
     * against the meta-schema identified by this URI.
     *
     * If this URI identifies a retrievable resource, that resource SHOULD be
     * of media type `application/schema+json`.
     *
     * The `$schema` keyword SHOULD be used in the document root schema
     * object, and MAY be used in the root schema objects of embedded schema
     * resources. It MUST NOT appear in non-resource root schema objects.  If
     * absent from the document root schema, the resulting behavior is
     * implementation-defined.
     *
     * Values for this property are defined elsewhere in this and other
     * documents, and by other parties.
     *
     * [RFC3986]: https://datatracker.ietf.org/doc/html/rfc3986
     *
     * @format "uri"
     */
    $schema?: string;
    /**
     * The `$vocabulary` keyword is used in meta-schemas to identify the
     * vocabularies available for use in schemas described by that meta-schema.
     * It is also used to indicate whether each vocabulary is required or
     * optional, in the sense that an implementation MUST understand the
     * required vocabularies in order to successfully process the schema.
     * Together, this information forms a dialect. Any vocabulary that is
     * understood by the implementation MUST be processed in a manner
     * consistent with the semantic definitions contained within the
     * vocabulary.
     *
     * The value of this keyword MUST be an object.  The property names in the
     * object MUST be URIs (containing a scheme) and this URI MUST be
     * normalized. Each URI that appears as a property name identifies a
     * specific set of keywords and their semantics.
     *
     * The URI MAY be a URL, but the nature of the retrievable resource is
     * currently undefined, and reserved for future use.  Vocabulary authors
     * MAY use the URL of the vocabulary specification, in a human-readable
     * media type such as `text/html` or `text/plain`, as the vocabulary
     * URI.
     *
     * The values of the object properties MUST be booleans. If the value is
     * `true`, then implementations that do not recognize the vocabulary MUST
     * refuse to process any schemas that declare this meta-schema with
     * `$schema`.  If the value is `false`, implementations that do not
     * recognize the vocabulary SHOULD proceed with processing such schemas.
     * The value has no impact if the implementation understands the
     * vocabulary.
     *
     * Unrecognized keywords SHOULD be ignored.  This remains the case for
     * keywords defined by unrecognized vocabularies.  It is not currently
     * possible to distinguish between unrecognized keywords that are defined
     * in vocabularies from those that are not part of any vocabulary.
     *
     * The `$vocabulary` keyword SHOULD be used in the root schema of any
     * schema document intended for use as a meta-schema.  It MUST NOT appear
     * in subschemas.
     *
     * The `$vocabulary` keyword MUST be ignored in schema documents that are
     * not being processed as a meta-schema.
     */
    $vocabulary?: Record<string, string>;
    /**
     * @deprecated `additionalItems` has been deprecated in favor of `prefixItems`
     * paired with `items`.
     */
    additionalItems?: JSONSchema;
    /**
     * The value of `additionalProperties` MUST be a valid JSON Schema.
     *
     * The behavior of this keyword depends on the presence and annotation
     * results of `properties` and `patternProperties` within the same
     * schema object. Validation with `additionalProperties` applies only to
     * the child values of instance names that do not appear in the annotation
     * results of either `properties` or `patternProperties`.
     *
     * For all such properties, validation succeeds if the child instance
     * validates against the `additionalProperties` schema.
     *
     * The annotation result of this keyword is the set of instance property
     * names validated by this keyword's subschema. Annotation results for
     * `additionalProperties` keywords from multiple schemas applied to the
     * same instance location are combined by taking the union of the sets.
     *
     * Omitting this keyword has the same assertion behavior as an empty
     * schema.
     *
     * Implementations MAY choose to implement or optimize this keyword in
     * another way that produces the same effect, such as by directly checking
     * the names in `properties` and the patterns in `patternProperties`
     * against the instance property set.
     */
    additionalProperties?: JSONSchema;
    /**
     * This keyword's value MUST be a non-empty array. Each item of the array
     * MUST be a valid JSON Schema.
     *
     * An instance validates successfully against this keyword if it validates
     * successfully against all schemas defined by this keyword's value.
     */
    allOf?: MaybeReadonlyArray<JSONSchema<Value, SchemaType>>;
    /**
     * This keyword's value MUST be a non-empty array. Each item of the array
     * MUST be a valid JSON Schema.
     *
     * An instance validates successfully against this keyword if it validates
     * successfully against at least one schema defined by this keyword's
     * value.
     */
    anyOf?: MaybeReadonlyArray<JSONSchema<Value, SchemaType>>;
    /**
     * An instance validates successfully against this keyword if its value is
     * equal to the value of the keyword.
     *
     * Use of this keyword is functionally equivalent to the `enum` keyword
     * with a single value.
     */
    const?: Value;
    /**
     * The value of this keyword MUST be a valid JSON Schema.
     *
     * An array instance is valid against `contains` if at least one of its
     * elements is valid against the given schema. The subschema MUST be
     * applied to every array element even after the first match has been
     * found, in order to collect annotations for use by other keywords.
     * This is to ensure that all possible annotations are collected.
     *
     * Logically, the validation result of applying the value subschema to each
     * item in the array MUST be OR'ed with `false`, resulting in an overall
     * validation result.
     *
     * This keyword produces an annotation value which is an array of the
     * indexes to which this keyword validates successfully when applying its
     * subschema, in ascending order. The value MAY be a boolean `true` if
     * the subschema validates successfully when applied to every index of the
     * instance. The annotation MUST be present if the instance array to which
     * this keyword's schema applies is empty.
     */
    contains?: JSONSchema<Value, SchemaType>;
    /**
     * If the instance value is a string, this property defines that the
     * string SHOULD be interpreted as binary data and decoded using the
     * encoding named by this property. [RFC 2045, Sec 6.1][RFC2045] lists the
     * possible values for this property.
     *
     * The value of this property SHOULD be ignored if the instance described
     * is not a string.
     *
     * If this keyword is absent, but `contentMediaType` is present, this
     * indicates that the media type could be encoded into `UTF-8` like any
     * other JSON string value, and does not require additional decoding.
     *
     * The value of this property MUST be a string.
     *
     * [RFC2045]: https://datatracker.ietf.org/doc/html/rfc2045#section-6.1
     */
    contentEncoding?: "7bit" | "8bit" | "base64" | "binary" | "ietf-token" | "quoted-printable" | "x-token";
    /**
     * If the instance is a string, this property indicates the media type
     * of the contents of the string.  If `contentEncoding` is present,
     * this property describes the decoded string.
     *
     * The value of this property must be a media type, as defined by
     * [RFC 2046][RFC2046]. This property defines the media type of instances
     * which this schema defines.
     *
     * The value of this property SHOULD be ignored if the instance described
     * is not a string.
     *
     * If the `contentEncoding` property is not present, but the instance
     * value is a string, then the value of this property SHOULD specify a text
     * document type, and the character set SHOULD be the character set into
     * which the JSON string value was decoded (for which the default is
     * Unicode).
     *
     * [RFC2046]: https://datatracker.ietf.org/doc/html/rfc2046
     */
    contentMediaType?: string;
    /**
     * If the instance is a string, and if `contentMediaType` is present,
     * this property contains a schema which describes the structure of the
     * string.
     *
     * This keyword MAY be used with any media type that can be mapped into
     * JSON Schema's data model.
     *
     * The value of this property MUST be a valid JSON schema. It SHOULD be
     * ignored if `contentMediaType` is not present.
     */
    contentSchema?: JSONSchema<Value, SchemaType>;
    /**
     * This keyword can be used to supply a default JSON value associated with
     * a particular schema. It is RECOMMENDED that a `default` value be valid
     * against the associated schema.
     */
    default?: Value;
    /**
     * @deprecated `definitions` has been renamed to `$defs`.
     */
    definitions?: Record<string, JSONSchema>;
    /**
     * @deprecated `dependencies` has been split into two keywords:
     * `dependentSchemas` and `dependentRequired`.
     */
    dependencies?: Record<string, MaybeReadonlyArray<string> | JSONSchema>;
    /**
     * The value of this keyword MUST be an object.  Properties in
     * this object, if any, MUST be arrays.  Elements in each array,
     * if any, MUST be strings, and MUST be unique.
     *
     * This keyword specifies properties that are required if a specific
     * other property is present.  Their requirement is dependent on the
     * presence of the other property.
     *
     * Validation succeeds if, for each name that appears in both
     * the instance and as a name within this keyword's value, every
     * item in the corresponding array is also the name of a property
     * in the instance.
     *
     * Omitting this keyword has the same behavior as an empty object.
     */
    dependentRequired?: Record<string, MaybeReadonlyArray<string>>;
    /**
     * This keyword specifies subschemas that are evaluated if the instance is
     * an object and contains a certain property.
     *
     * This keyword's value MUST be an object. Each value in the object MUST be
     * a valid JSON Schema.
     *
     * If the object key is a property in the instance, the entire instance
     * must validate against the subschema. Its use is dependent on the
     * presence of the property.
     *
     * Omitting this keyword has the same behavior as an empty object.
     */
    dependentSchemas?: Record<string, JSONSchema>;
    /**
     * The value of this keyword MUST be a boolean.  When multiple occurrences
     * of this keyword are applicable to a single sub-instance, applications
     * SHOULD consider the instance location to be deprecated if any occurrence
     * specifies a `true` value.
     *
     * If `deprecated` has a value of boolean `true`, it indicates that
     * applications SHOULD refrain from usage of the declared property. It MAY
     * mean the property is going to be removed in the future.
     *
     * A root schema containing `deprecated` with a value of `true`
     * indicates that the entire resource being described MAY be removed in the
     * future.
     *
     * The `deprecated` keyword applies to each instance location to which
     * the schema object containing the keyword successfully applies.  This can
     * result in scenarios where every array item or object property is
     * deprecated even though the containing array or object is not.
     *
     * Omitting this keyword has the same behavior as a value of `false`.
     */
    deprecated?: boolean;
    /**
     * Can be used to decorate a user interface with explanation or information
     * about the data produced.
     */
    description?: string;
    /**
     * This keyword's value MUST be a valid JSON Schema.
     *
     * When `if` is present, and the instance fails to validate against its
     * subschema, then validation succeeds against this keyword if the instance
     * successfully validates against this keyword's subschema.
     *
     * This keyword has no effect when `if` is absent, or when the instance
     * successfully validates against its subschema. Implementations MUST NOT
     * evaluate the instance against this keyword, for either validation or
     * annotation collection purposes, in such cases.
     */
    else?: JSONSchema<Value, SchemaType>;
    /**
     * The value of this keyword MUST be an array. This array SHOULD have at
     * least one element. Elements in the array SHOULD be unique.
     *
     * An instance validates successfully against this keyword if its value is
     * equal to one of the elements in this keyword's array value.
     *
     * Elements in the array might be of any type, including `null`.
     */
    enum?: MaybeReadonlyArray<Value>;
    /**
     * The value of this keyword MUST be an array. When multiple occurrences of
     * this keyword are applicable to a single sub-instance, implementations
     * MUST provide a flat array of all values rather than an array of arrays.
     *
     * This keyword can be used to provide sample JSON values associated with a
     * particular schema, for the purpose of illustrating usage. It is
     * RECOMMENDED that these values be valid against the associated schema.
     *
     * Implementations MAY use the value(s) of `default`, if present, as an
     * additional example. If `examples` is absent, `default` MAY still be
     * used in this manner.
     */
    examples?: MaybeReadonlyArray<Value>;
    /**
     * The value of `exclusiveMaximum` MUST be a number, representing an
     * exclusive upper limit for a numeric instance.
     *
     * If the instance is a number, then the instance is valid only if it has a
     * value strictly less than (not equal to) `exclusiveMaximum`.
     */
    exclusiveMaximum?: number;
    /**
     * The value of `exclusiveMinimum` MUST be a number, representing an
     * exclusive lower limit for a numeric instance.
     *
     * If the instance is a number, then the instance is valid only if it has a
     * value strictly greater than (not equal to) `exclusiveMinimum`.
     */
    exclusiveMinimum?: number;
    /**
     * Implementations MAY treat `format` as an assertion in addition to an
     * annotation, and attempt to validate the value's conformance to the
     * specified semantics.
     *
     * The value of this keyword is called a format attribute. It MUST be a
     * string. A format attribute can generally only validate a given set
     * of instance types. If the type of the instance to validate is not in
     * this set, validation for this format attribute and instance SHOULD
     * succeed. Format attributes are most often applied to strings, but can
     * be specified to apply to any type.
     *
     * Implementations MAY support custom format attributes. Save for agreement
     * between parties, schema authors SHALL NOT expect a peer implementation
     * to support such custom format attributes.  An implementation MUST NOT
     * fail validation or cease processing due to an unknown format attribute.
     * When treating `format` as an annotation, implementations SHOULD
     * collect both known and unknown format attribute values.
     */
    format?: string;
    /**
     * This keyword's value MUST be a valid JSON Schema.
     *
     * This validation outcome of this keyword's subschema has no direct effect
     * on the overall validation result. Rather, it controls which of the
     * `then` or `else` keywords are evaluated.
     *
     * Instances that successfully validate against this keyword's subschema
     * MUST also be valid against the subschema value of the `then` keyword,
     * if present.
     *
     * Instances that fail to validate against this keyword's subschema MUST
     * also be valid against the subschema value of the `else` keyword, if
     * present.
     *
     * If annotations are being collected, they are collected
     * from this keyword's subschema in the usual way, including when the
     * keyword is present without either `then` or `else`.
     */
    if?: JSONSchema<Value, SchemaType>;
    /**
     * The value of `items` MUST be a valid JSON Schema.
     *
     * This keyword applies its subschema to all instance elements at indexes
     * greater than the length of the `prefixItems` array in the same schema
     * object, as reported by the annotation result of that `prefixItems`
     * keyword.  If no such annotation result exists, `items` applies its
     * subschema to all instance array elements.
     *
     * Note that the behavior of `items` without `prefixItems` is identical
     * to that of the schema form of `items` in prior drafts.
     *
     * When `prefixItems` is present, the behavior of `items` is identical
     * to the former `additionalItems` keyword.
     *
     * If the `items` subschema is applied to any positions within the
     * instance array, it produces an annotation result of boolean `true`,
     * indicating that all remaining array elements have been evaluated against
     * this keyword's subschema.
     *
     * Omitting this keyword has the same assertion behavior as an empty
     * schema.
     *
     * Implementations MAY choose to implement or optimize this keyword
     * in another way that produces the same effect, such as by directly
     * checking for the presence and size of a `prefixItems` array.
     */
    items?: JSONSchema;
    /**
     * The value of this keyword MUST be a non-negative integer.
     *
     * If `contains` is not present within the same schema object, then this
     * keyword has no effect.
     *
     * An instance array is valid against `maxContains` in two ways,
     * depending on the form of the annotation result of an adjacent
     * `contains` keyword. The first way is if the annotation result is an
     * array and the length of that array is less than or equal to the
     * `maxContains` value. The second way is if the annotation result is a
     * boolean `true` and the instance array length is less than or equal to
     * the `maxContains` value.
     */
    maxContains?: number;
    /**
     * The value of `maximum` MUST be a number, representing an inclusive
     * upper limit for a numeric instance.
     *
     * If the instance is a number, then this keyword validates only if the
     * instance is less than or exactly equal to `maximum`.
     */
    maximum?: number;
    /**
     * The value of this keyword MUST be a non-negative integer.
     *
     * An array instance is valid against `maxItems` if its size is less
     * than, or equal to, the value of this keyword.
     *
     * @minimum 0
     */
    maxItems?: number;
    /**
     * The value of this keyword MUST be a non-negative integer.
     *
     * A string instance is valid against this keyword if its length is less
     * than, or equal to, the value of this keyword.
     *
     * The length of a string instance is defined as the number of its
     * characters as defined by [RFC 8259][RFC8259].
     *
     * [RFC8259]: https://datatracker.ietf.org/doc/html/rfc8259
     *
     * @minimum 0
     */
    maxLength?: number;
    /**
     * The value of this keyword MUST be a non-negative integer.
     *
     * An object instance is valid against `maxProperties` if its number of
     * `properties` is less than, or equal to, the value of this keyword.
     *
     * @minimum 0
     */
    maxProperties?: number;
    /**
     * The value of this keyword MUST be a non-negative integer.
     *
     * If `contains` is not present within the same schema object, then this
     * keyword has no effect.
     *
     * An instance array is valid against `minContains` in two ways,
     * depending on the form of the annotation result of an adjacent
     * `contains` keyword. The first way is if the annotation result is an
     * array and the length of that array is greater than or equal to the
     * `minContains` value. The second way is if the annotation result is a
     * boolean `true` and the instance array length is greater than or equal
     * to the `minContains` value.
     *
     * A value of `0` is allowed, but is only useful for setting a range
     * of occurrences from `0` to the value of `maxContains`.  A value of
     * `0` with no `maxContains` causes `contains` to always pass
     * validation.
     *
     * Omitting this keyword has the same behavior as a value of `1`.
     *
     * @default 1
     */
    minContains?: number;
    /**
     * The value of `minimum` MUST be a number, representing an inclusive
     * lower limit for a numeric instance.
     *
     * If the instance is a number, then this keyword validates only if the
     * instance is greater than or exactly equal to `minimum`.
     */
    minimum?: number;
    /**
     * The value of this keyword MUST be a non-negative integer.
     *
     * An array instance is valid against `minItems` if its size is greater
     * than, or equal to, the value of this keyword.
     *
     * Omitting this keyword has the same behavior as a value of `0`.
     *
     * @default 0
     * @minimum 0
     */
    minItems?: number;
    /**
     * The value of this keyword MUST be a non-negative integer.
     *
     * A string instance is valid against this keyword if its length is greater
     * than, or equal to, the value of this keyword.
     *
     * The length of a string instance is defined as the number of its
     * characters as defined by [RFC 8259][RFC8259].
     *
     * Omitting this keyword has the same behavior as a value of `0`.
     *
     * [RFC8259]: https://datatracker.ietf.org/doc/html/rfc8259
     *
     * @default 0
     * @minimum 0
     */
    minLength?: number;
    /**
     * The value of this keyword MUST be a non-negative integer.
     *
     * An object instance is valid against `minProperties` if its number of
     * `properties` is greater than, or equal to, the value of this keyword.
     *
     * Omitting this keyword has the same behavior as a value of `0`.
     *
     * @default 0
     * @minimum 0
     */
    minProperties?: number;
    /**
     * The value of `multipleOf` MUST be a number, strictly greater than
     * `0`.
     *
     * A numeric instance is valid only if division by this keyword's value
     * results in an integer.
     *
     * @exclusiveMinimum 0
     */
    multipleOf?: number;
    /**
     * This keyword's value MUST be a valid JSON Schema.
     *
     * An instance is valid against this keyword if it fails to validate
     * successfully against the schema defined by this keyword.
     */
    not?: JSONSchema<Value, SchemaType>;
    /**
     * This keyword's value MUST be a non-empty array. Each item of the array
     * MUST be a valid JSON Schema.
     *
     * An instance validates successfully against this keyword if it validates
     * successfully against exactly one schema defined by this keyword's value.
     */
    oneOf?: MaybeReadonlyArray<JSONSchema<Value, SchemaType>>;
    /**
     * The value of this keyword MUST be a string. This string SHOULD be a
     * valid regular expression, according to the [ECMA-262][ecma262] regular
     * expression dialect.
     *
     * A string instance is considered valid if the regular expression matches
     * the instance successfully. Recall: regular expressions are not
     * implicitly anchored.
     *
     * [ecma262]: https://www.ecma-international.org/publications-and-standards/standards/ecma-262/
     *
     * @format "regex"
     */
    pattern?: string;
    /**
     * The value of `patternProperties` MUST be an object. Each property name
     * of this object SHOULD be a valid regular expression, according to the
     * [ECMA-262][ecma262] regular expression dialect. Each property value of
     * this object MUST be a valid JSON Schema.
     *
     * Validation succeeds if, for each instance name that matches any regular
     * expressions that appear as a property name in this keyword's value,
     * the child instance for that name successfully validates against each
     * schema that corresponds to a matching regular expression.
     *
     * The annotation result of this keyword is the set of instance property
     * names matched by this keyword. Omitting this keyword has the same
     * assertion behavior as an empty object.
     *
     * [ecma262]: https://www.ecma-international.org/publications-and-standards/standards/ecma-262/
     */
    patternProperties?: Record<string, JSONSchema>;
    /**
     * The value of `prefixItems` MUST be a non-empty array of valid JSON
     * Schemas.
     *
     * Validation succeeds if each element of the instance validates against
     * the schema at the same position, if any.  This keyword does not
     * constrain the length of the array.  If the array is longer than this
     * keyword's value, this keyword validates only the prefix of matching
     * length.
     *
     * This keyword produces an annotation value which is the largest index to
     * which this keyword applied a subschema.  The value MAY be a boolean
     * `true` if a subschema was applied to every index of the instance, such
     * as is produced by the `items` keyword.
     * This annotation affects the behavior of `items` and
     * `unevaluatedItems`.
     *
     * Omitting this keyword has the same assertion behavior as an empty array.
     */
    prefixItems?: MaybeReadonlyArray<JSONSchema> | JSONSchema;
    /**
     * The value of `properties` MUST be an object. Each value of this object
     * MUST be a valid JSON Schema.
     *
     * Validation succeeds if, for each name that appears in both the instance
     * and as a name within this keyword's value, the child instance for that
     * name successfully validates against the corresponding schema.
     *
     * The annotation result of this keyword is the set of instance property
     * names matched by this keyword.
     *
     * Omitting this keyword has the same assertion behavior as an empty
     * object.
     */
    properties?: Record<string, JSONSchema>;
    /**
     * The value of `propertyNames` MUST be a valid JSON Schema.
     *
     * If the instance is an object, this keyword validates if every property
     * name in the instance validates against the provided schema.
     * Note the property name that the schema is testing will always be a
     * string.
     *
     * Omitting this keyword has the same behavior as an empty schema.
     */
    propertyNames?: JSONSchema;
    /**
     * The value of this keyword MUST be a boolean. When multiple occurrences
     * of this keyword are applicable to a single sub-instance, the resulting
     * value MUST be `true` if any occurrence specifies a `true` value, and
     * MUST be `false` otherwise.
     *
     * If `readOnly` has a value of boolean `true`, it indicates that the
     * value of the instance is managed exclusively by the owning authority,
     * and attempts by an application to modify the value of this property are
     * expected to be ignored or rejected by that owning authority.
     *
     * An instance document that is marked as `readOnly` for the entire
     * document MAY be ignored if sent to the owning authority, or MAY result
     * in an error, at the authority's discretion.
     *
     * For example, `readOnly` would be used to mark a database-generated
     * serial number as read-only.
     *
     * This keyword can be used to assist in user interface instance
     * generation.
     *
     * @default false
     */
    readOnly?: boolean;
    /**
     * The value of this keyword MUST be an array. Elements of this array, if
     * any, MUST be strings, and MUST be unique.
     *
     * An object instance is valid against this keyword if every item in the
     * array is the name of a property in the instance.
     *
     * Omitting this keyword has the same behavior as an empty array.
     */
    required?: MaybeReadonlyArray<string>;
    /**
     * This keyword's value MUST be a valid JSON Schema.
     *
     * When `if` is present, and the instance successfully validates against
     * its subschema, then validation succeeds against this keyword if the
     * instance also successfully validates against this keyword's subschema.
     *
     * This keyword has no effect when `if` is absent, or when the instance
     * fails to validate against its subschema. Implementations MUST NOT
     * evaluate the instance against this keyword, for either validation or
     * annotation collection purposes, in such cases.
     */
    then?: JSONSchema<Value, SchemaType>;
    /**
     * Can be used to decorate a user interface with a short label about the
     * data produced.
     */
    title?: string;
    /**
     * The value of this keyword MUST be either a string or an array. If it is
     * an array, elements of the array MUST be strings and MUST be unique.
     *
     * String values MUST be one of the six primitive types (`"null"`,
     * `"boolean"`, `"object"`, `"array"`, `"number"`, or
     * `"string"`), or `"integer"` which matches any number with a zero
     * fractional part.
     *
     * An instance validates if and only if the instance is in any of the sets
     * listed for this keyword.
     */
    type?: SchemaType;
    /**
     * The value of `unevaluatedItems` MUST be a valid JSON Schema.
     *
     * The behavior of this keyword depends on the annotation results of
     * adjacent keywords that apply to the instance location being validated.
     * Specifically, the annotations from `prefixItems`, `items`, and
     * `contains`, which can come from those keywords when they are adjacent
     * to the `unevaluatedItems` keyword. Those three annotations, as well as
     * `unevaluatedItems`, can also result from any and all adjacent
     * [in-place applicator][in-place-applicator] keywords.
     *
     * If no relevant annotations are present, the `unevaluatedItems`
     * subschema MUST be applied to all locations in the array.
     * If a boolean `true` value is present from any of the relevant
     * annotations, `unevaluatedItems` MUST be ignored.  Otherwise, the
     * subschema MUST be applied to any index greater than the largest
     * annotation value for `prefixItems`, which does not appear in any
     * annotation value for `contains`.
     *
     * This means that `prefixItems`, `items`, `contains`, and all
     * in-place applicators MUST be evaluated before this keyword can be
     * evaluated. Authors of extension keywords MUST NOT define an in-place
     * applicator that would need to be evaluated after this keyword.
     *
     * If the `unevaluatedItems` subschema is applied to any positions within
     * the instance array, it produces an annotation result of boolean
     * `true`, analogous to the behavior of `items`.
     *
     * Omitting this keyword has the same assertion behavior as an empty
     * schema.
     *
     * [in-place-applicator]: https://json-schema.org/draft/2020-12/json-schema-core.html#in-place
     */
    unevaluatedItems?: JSONSchema;
    /**
     * The value of `unevaluatedProperties` MUST be a valid JSON Schema.
     *
     * The behavior of this keyword depends on the annotation results of
     * adjacent keywords that apply to the instance location being validated.
     * Specifically, the annotations from `properties`,
     * `patternProperties`, and `additionalProperties`, which can come from
     * those keywords when they are adjacent to the `unevaluatedProperties`
     * keyword.  Those three annotations, as well as `unevaluatedProperties`,
     * can also result from any and all adjacent
     * [in-place applicator][in-place-applicator] keywords.
     *
     * Validation with `unevaluatedProperties` applies only to the child
     * values of instance names that do not appear in the `properties`,
     * `patternProperties`, `additionalProperties`, or
     * `unevaluatedProperties` annotation results that apply to the
     * instance location being validated.
     *
     * For all such properties, validation succeeds if the child instance
     * validates against the "unevaluatedProperties" schema.
     *
     * This means that `properties`, `patternProperties`,
     * `additionalProperties`, and all in-place applicators MUST be evaluated
     * before this keyword can be evaluated.  Authors of extension keywords
     * MUST NOT define an in-place applicator that would need to be evaluated
     * after this keyword.
     *
     * The annotation result of this keyword is the set of instance property
     * names validated by this keyword's subschema.
     *
     * Omitting this keyword has the same assertion behavior as an empty
     * schema.
     *
     * [in-place-applicator]: https://json-schema.org/draft/2020-12/json-schema-core.html#in-place
     */
    unevaluatedProperties?: JSONSchema;
    /**
     * The value of this keyword MUST be a boolean.
     *
     * If this keyword has boolean value `false`, the instance validates
     * successfully. If it has boolean value `true`, the instance validates
     * successfully if all of its elements are unique.
     *
     * Omitting this keyword has the same behavior as a value of `false`.
     *
     * @default false
     */
    uniqueItems?: boolean;
    /**
     * The value of this keyword MUST be a boolean. When multiple occurrences
     * of this keyword is applicable to a single sub-instance, the resulting
     * value MUST be `true` if any occurrence specifies a `true` value, and
     * MUST be `false` otherwise.
     *
     * If `writeOnly` has a value of boolean `true`, it indicates that the
     * value is never present when the instance is retrieved from the owning
     * authority. It can be present when sent to the owning authority to update
     * or create the document (or the resource it represents), but it will not
     * be included in any updated or newly created version of the instance.
     *
     * An instance document that is marked as `writeOnly` for the entire
     * document MAY be returned as a blank document of some sort, or MAY
     * produce an error upon retrieval, or have the retrieval request ignored,
     * at the authority's discretion.
     *
     * For example, `writeOnly` would be used to mark a password input field.
     *
     * These keywords can be used to assist in user interface instance
     * generation. In particular, an application MAY choose to use a widget
     * that hides input values as they are typed for write-only fields.
     *
     * @default false
     */
    writeOnly?: boolean;
};
export declare namespace JSONSchema {
    type TypeValue = ValueOf<TypeName> | TypeName | Array<ValueOf<TypeName> | TypeName> | ReadonlyArray<ValueOf<TypeName> | TypeName>;
    /**
     * JSON Schema interface
     */
    type Interface<Value = any, SchemaType extends TypeValue = TypeValue> = Exclude<JSONSchema<Value, SchemaType>, boolean>;
    type Array<T = any> = Pick<Interface<T, "array">, KeywordByType.Any | KeywordByType.Array>;
    type Boolean = Pick<Interface<boolean, "boolean">, KeywordByType.Any>;
    type Integer = Pick<Interface<number, "integer">, KeywordByType.Any | KeywordByType.Number>;
    type Number = Pick<Interface<number, "number">, KeywordByType.Any | KeywordByType.Number>;
    type Null = Pick<Interface<null, "null">, KeywordByType.Any>;
    type Object<T = any> = Pick<Interface<T, "object">, KeywordByType.Any | KeywordByType.Object>;
    type String = Pick<Interface<string, "string">, KeywordByType.Any | KeywordByType.String>;
}
declare namespace KeywordByType {
    type Any = "$anchor" | "$comment" | "$defs" | "$dynamicAnchor" | "$dynamicRef" | "$id" | "$ref" | "$schema" | "$vocabulary" | "allOf" | "anyOf" | "const" | "default" | "definitions" | "deprecated" | "description" | "else" | "enum" | "examples" | "format" | "if" | "not" | "oneOf" | "readOnly" | "then" | "title" | "type" | "writeOnly";
    type Array = "additionalItems" | "contains" | "items" | "maxContains" | "maxItems" | "minContains" | "minItems" | "prefixItems" | "unevaluatedItems" | "uniqueItems";
    type Number = "exclusiveMaximum" | "exclusiveMinimum" | "maximum" | "minimum" | "multipleOf";
    type Object = "additionalProperties" | "dependencies" | "dependentRequired" | "dependentSchemas" | "maxProperties" | "minProperties" | "patternProperties" | "properties" | "propertyNames" | "required" | "unevaluatedProperties";
    type String = "contentEncoding" | "contentMediaType" | "contentSchema" | "maxLength" | "minLength" | "pattern";
}
/**
 * Content encoding strategy enum.
 *
 * - [Content-Transfer-Encoding Syntax](https://datatracker.ietf.org/doc/html/rfc2045#section-6.1)
 * - [7bit vs 8bit encoding](https://stackoverflow.com/questions/25710599/content-transfer-encoding-7bit-or-8-bit/28531705#28531705)
 */
export declare enum ContentEncoding {
    /**
     * Only US-ASCII characters, which use the lower 7 bits for each character.
     *
     * Each line must be less than 1,000 characters.
     */
    "7bit" = "7bit",
    /**
     * Allow extended ASCII characters which can use the 8th (highest) bit to
     * indicate special characters not available in 7bit.
     *
     * Each line must be less than 1,000 characters.
     */
    "8bit" = "8bit",
    /**
     * Useful for data that is mostly non-text.
     */
    Base64 = "base64",
    /**
     * Same character set as 8bit, with no line length restriction.
     */
    Binary = "binary",
    /**
     * An extension token defined by a standards-track RFC and registered with
     * IANA.
     */
    IETFToken = "ietf-token",
    /**
     * Lines are limited to 76 characters, and line breaks are represented using
     * special characters that are escaped.
     */
    QuotedPrintable = "quoted-printable",
    /**
     * The two characters "X-" or "x-" followed, with no intervening white space,
     * by any token.
     */
    XToken = "x-token"
}
/**
 * This enum provides well-known formats that apply to strings.
 */
export declare enum Format {
    /**
     * A string instance is valid against this attribute if it is a valid
     * representation according to the "full-date" production in
     * [RFC 3339][RFC3339].
     *
     * [RFC3339]: https://datatracker.ietf.org/doc/html/rfc3339
     */
    Date = "date",
    /**
     * A string instance is valid against this attribute if it is a valid
     * representation according to the "date-time" production in
     * [RFC 3339][RFC3339].
     *
     * [RFC3339]: https://datatracker.ietf.org/doc/html/rfc3339
     */
    DateTime = "date-time",
    /**
     * A string instance is valid against this attribute if it is a valid
     * representation according to the "duration" production.
     */
    Duration = "duration",
    /**
     * A string instance is valid against this attribute if it is a valid Internet
     * email address as defined by by the "Mailbox" ABNF rule in [RFC
     * 5321][RFC5322], section 4.1.2.
     *
     * [RFC5321]: https://datatracker.ietf.org/doc/html/rfc5321
     */
    Email = "email",
    /**
     * As defined by [RFC 1123, section 2.1][RFC1123], including host names
     * produced using the Punycode algorithm specified in
     * [RFC 5891, section 4.4][RFC5891].
     *
     * [RFC1123]: https://datatracker.ietf.org/doc/html/rfc1123
     * [RFC5891]: https://datatracker.ietf.org/doc/html/rfc5891
     */
    Hostname = "hostname",
    /**
     * A string instance is valid against this attribute if it is a valid Internet
     * email address as defined by the extended "Mailbox" ABNF rule in
     * [RFC 6531][RFC6531], section 3.3.
     *
     * [RFC6531]: https://datatracker.ietf.org/doc/html/rfc6531
     */
    IDNEmail = "idn-email",
    /**
     * As defined by either [RFC 1123, section 2.1][RFC1123] as for hostname, or
     * an internationalized hostname as defined by
     * [RFC 5890, section 2.3.2.3][RFC5890].
     *
     * [RFC1123]: https://datatracker.ietf.org/doc/html/rfc1123
     * [RFC5890]: https://datatracker.ietf.org/doc/html/rfc5890
     */
    IDNHostname = "idn-hostname",
    /**
     * An IPv4 address according to the "dotted-quad" ABNF syntax as defined in
     * [RFC 2673, section 3.2][RFC2673].
     *
     * [RFC2673]: https://datatracker.ietf.org/doc/html/rfc2673
     */
    IPv4 = "ipv4",
    /**
     * An IPv6 address as defined in [RFC 4291, section 2.2][RFC4291].
     *
     * [RFC4291]: https://datatracker.ietf.org/doc/html/rfc4291
     */
    IPv6 = "ipv6",
    /**
     * A string instance is valid against this attribute if it is a valid IRI,
     * according to [RFC 3987][RFC3987].
     *
     * [RFC3987]: https://datatracker.ietf.org/doc/html/rfc3987
     */
    IRI = "iri",
    /**
     * A string instance is valid against this attribute if it is a valid IRI
     * Reference (either an IRI or a relative-reference), according to
     * [RFC 3987][RFC3987].
     *
     * [RFC3987]: https://datatracker.ietf.org/doc/html/rfc3987
     */
    IRIReference = "iri-reference",
    /**
     * A string instance is valid against this attribute if it is a valid JSON
     * string representation of a JSON Pointer, according to
     * [RFC 6901, section 5][RFC6901].
     *
     * [RFC6901]: https://datatracker.ietf.org/doc/html/rfc6901
     */
    JSONPointer = "json-pointer",
    /**
     * A string instance is valid against this attribute if it is a valid JSON
     * string representation of a JSON Pointer fragment, according to
     * [RFC 6901, section 5][RFC6901].
     *
     * [RFC6901]: https://datatracker.ietf.org/doc/html/rfc6901
     */
    JSONPointerURIFragment = "json-pointer-uri-fragment",
    /**
     * This attribute applies to string instances.
     *
     * A regular expression, which SHOULD be valid according to the
     * [ECMA-262][ecma262] regular expression dialect.
     *
     * Implementations that validate formats MUST accept at least the subset of
     * [ECMA-262][ecma262] defined in the [Regular Expressions][regexInterop]
     * section of this specification, and SHOULD accept all valid
     * [ECMA-262][ecma262] expressions.
     *
     * [ecma262]: https://www.ecma-international.org/publications-and-standards/standards/ecma-262/
     * [regexInterop]: https://json-schema.org/draft/2020-12/json-schema-validation.html#regexInterop
     */
    RegEx = "regex",
    /**
     * A string instance is valid against this attribute if it is a valid
     * [Relative JSON Pointer][relative-json-pointer].
     *
     * [relative-json-pointer]: https://datatracker.ietf.org/doc/html/draft-handrews-relative-json-pointer-01
     */
    RelativeJSONPointer = "relative-json-pointer",
    /**
     * A string instance is valid against this attribute if it is a valid
     * representation according to the "time" production in [RFC 3339][RFC3339].
     *
     * [RFC3339]: https://datatracker.ietf.org/doc/html/rfc3339
     */
    Time = "time",
    /**
     * A string instance is valid against this attribute if it is a valid URI,
     * according to [RFC3986][RFC3986].
     *
     * [RFC3986]: https://datatracker.ietf.org/doc/html/rfc3986
     */
    URI = "uri",
    /**
     * A string instance is valid against this attribute if it is a valid URI
     * Reference (either a URI or a relative-reference), according to
     * [RFC3986][RFC3986].
     *
     * [RFC3986]: https://datatracker.ietf.org/doc/html/rfc3986
     */
    URIReference = "uri-reference",
    /**
     * A string instance is valid against this attribute if it is a valid URI
     * Template (of any level), according to [RFC 6570][RFC6570].
     *
     * Note that URI Templates may be used for IRIs; there is no separate IRI
     * Template specification.
     *
     * [RFC6570]: https://datatracker.ietf.org/doc/html/rfc6570
     */
    URITemplate = "uri-template",
    /**
     * A string instance is valid against this attribute if it is a valid string
     * representation of a UUID, according to [RFC 4122][RFC4122].
     *
     * [RFC4122]: https://datatracker.ietf.org/doc/html/rfc4122
     */
    UUID = "uuid"
}
/**
 * Enum consisting of simple type names for the `type` keyword
 */
export declare enum TypeName {
    /**
     * Value MUST be an array.
     */
    Array = "array",
    /**
     * Value MUST be a boolean.
     */
    Boolean = "boolean",
    /**
     * Value MUST be an integer, no floating point numbers are allowed. This is a
     * subset of the number type.
     */
    Integer = "integer",
    /**
     * Value MUST be null. Note this is mainly for purpose of being able use union
     * types to define nullability. If this type is not included in a union, null
     * values are not allowed (the primitives listed above do not allow nulls on
     * their own).
     */
    Null = "null",
    /**
     * Value MUST be a number, floating point numbers are allowed.
     */
    Number = "number",
    /**
     * Value MUST be an object.
     */
    Object = "object",
    /**
     * Value MUST be a string.
     */
    String = "string"
}
export declare const keywords: readonly ["$anchor", "$comment", "$defs", "$dynamicAnchor", "$dynamicRef", "$id", "$ref", "$schema", "$vocabulary", "additionalItems", "additionalProperties", "allOf", "anyOf", "const", "contains", "contentEncoding", "contentMediaType", "contentSchema", "default", "definitions", "dependencies", "dependentRequired", "dependentSchemas", "deprecated", "description", "else", "enum", "examples", "exclusiveMaximum", "exclusiveMinimum", "format", "if", "items", "maxContains", "maximum", "maxItems", "maxLength", "maxProperties", "minContains", "minimum", "minItems", "minLength", "minProperties", "multipleOf", "not", "oneOf", "pattern", "patternProperties", "prefixItems", "properties", "propertyNames", "readOnly", "required", "then", "title", "type", "unevaluatedItems", "unevaluatedProperties", "uniqueItems", "writeOnly"];
export {};
