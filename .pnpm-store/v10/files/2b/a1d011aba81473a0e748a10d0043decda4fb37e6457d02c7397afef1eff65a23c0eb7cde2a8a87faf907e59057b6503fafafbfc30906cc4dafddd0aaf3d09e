export type ProcessEntitiesOptions = {
  /**
   * Whether to enable entity processing
   * 
   * Defaults to `true`
   */
  enabled?: boolean;

  /**
   * Maximum size in characters for a single entity definition
   * 
   * Defaults to `10000`
   */
  maxEntitySize?: number;

  /**
   * Maximum depth for nested entity references (reserved for future use)
   * 
   * Defaults to `10`
   */
  maxExpansionDepth?: number;

  /**
   * Maximum total number of entity expansions allowed
   * 
   * Defaults to `1000`
   */
  maxTotalExpansions?: number;

  /**
   * Maximum total expanded content length in characters
   * 
   * Defaults to `100000`
   */
  maxExpandedLength?: number;

  /**
   * Array of tag names where entity replacement is allowed.
   * If null, entities are replaced in all tags.
   * 
   * Defaults to `null`
   */
  allowedTags?: string[] | null;

  /**
   * Custom filter function to determine if entities should be replaced in a tag
   * 
   * @param tagName - The name of the current tag
   * @param jPath - The jPath of the current tag
   * @returns `true` to allow entity replacement, `false` to skip
   * 
   * Defaults to `null`
   */
  tagFilter?: ((tagName: string, jPath: string) => boolean) | null;
};

export type X2jOptions = {
  /**
   * Preserve the order of tags in resulting JS object
   * 
   * Defaults to `false`
   */
  preserveOrder?: boolean;

  /**
   * Give a prefix to the attribute name in the resulting JS object
   * 
   * Defaults to '@_'
   */
  attributeNamePrefix?: string;

  /**
   * A name to group all attributes of a tag under, or `false` to disable
   * 
   * Defaults to `false`
   */
  attributesGroupName?: false | string;

  /**
   * The name of the next node in the resulting JS
   * 
   * Defaults to `#text`
   */
  textNodeName?: string;

  /**
   * Whether to ignore attributes when parsing
   * 
   * When `true` - ignores all the attributes
   * 
   * When `false` - parses all the attributes
   * 
   * When `Array<string | RegExp>` - filters out attributes that match provided patterns
   * 
   * When `Function` - calls the function for each attribute and filters out those for which the function returned `true`
   * 
   * Defaults to `true`
   */
  ignoreAttributes?: boolean | (string | RegExp)[] | ((attrName: string, jPath: string) => boolean);

  /**
   * Whether to remove namespace string from tag and attribute names
   * 
   * Defaults to `false`
   */
  removeNSPrefix?: boolean;

  /**
   * Whether to allow attributes without value
   * 
   * Defaults to `false`
   */
  allowBooleanAttributes?: boolean;

  /**
   * Whether to parse tag value with `strnum` package
   * 
   * Defaults to `true`
   */
  parseTagValue?: boolean;

  /**
   * Whether to parse attribute value with `strnum` package
   * 
   * Defaults to `false`
   */
  parseAttributeValue?: boolean;

  /**
   * Whether to remove surrounding whitespace from tag or attribute value
   * 
   * Defaults to `true`
   */
  trimValues?: boolean;

  /**
   * Give a property name to set CDATA values to instead of merging to tag's text value
   * 
   * Defaults to `false`
   */
  cdataPropName?: false | string;

  /**
   * If set, parse comments and set as this property
   * 
   * Defaults to `false`
   */
  commentPropName?: false | string;

  /**
   * Control how tag value should be parsed. Called only if tag value is not empty
   * 
   * @returns {undefined|null} `undefined` or `null` to set original value.
   * @returns {unknown} 
   * 
   * 1. Different value or value with different data type to set new value.
   * 2. Same value to set parsed value if `parseTagValue: true`.
   * 
   * Defaults to `(tagName, val, jPath, hasAttributes, isLeafNode) => val`
   */
  tagValueProcessor?: (tagName: string, tagValue: string, jPath: string, hasAttributes: boolean, isLeafNode: boolean) => unknown;

  /**
   * Control how attribute value should be parsed
   * 
   * @param attrName 
   * @param attrValue 
   * @param jPath 
   * @returns {undefined|null} `undefined` or `null` to set original value
   * @returns {unknown}
   * 
   * Defaults to `(attrName, val, jPath) => val`
   */
  attributeValueProcessor?: (attrName: string, attrValue: string, jPath: string) => unknown;

  /**
   * Options to pass to `strnum` for parsing numbers
   * 
   * Defaults to `{ hex: true, leadingZeros: true, eNotation: true }`
   */
  numberParseOptions?: strnumOptions;

  /**
   * Nodes to stop parsing at
   * 
   * Defaults to `[]`
   */
  stopNodes?: string[];

  /**
   * List of tags without closing tags
   * 
   * Defaults to `[]`
   */
  unpairedTags?: string[];

  /**
   * Whether to always create a text node
   * 
   * Defaults to `false`
   */
  alwaysCreateTextNode?: boolean;

  /**
   * Determine whether a tag should be parsed as an array
   * 
   * @param tagName 
   * @param jPath 
   * @param isLeafNode 
   * @param isAttribute 
   * @returns {boolean}
   * 
   * Defaults to `() => false`
   */
  isArray?: (tagName: string, jPath: string, isLeafNode: boolean, isAttribute: boolean) => boolean;

  /**
   * Whether to process default and DOCTYPE entities
   * 
   * When `true` - enables entity processing with default limits
   * 
   * When `false` - disables all entity processing
   * 
   * When `ProcessEntitiesOptions` - enables entity processing with custom configuration
   * 
   * Defaults to `true`
   */
  processEntities?: boolean | ProcessEntitiesOptions;

  /**
   * Whether to process HTML entities
   * 
   * Defaults to `false`
   */
  htmlEntities?: boolean;

  /**
   * Whether to ignore the declaration tag from output
   * 
   * Defaults to `false`
   */
  ignoreDeclaration?: boolean;

  /**
   * Whether to ignore Pi tags
   * 
   * Defaults to `false`
   */
  ignorePiTags?: boolean;

  /**
   * Transform tag names
   * 
   * Defaults to `false`
   */
  transformTagName?: ((tagName: string) => string) | false;

  /**
   * Transform attribute names
   * 
   * Defaults to `false`
   */
  transformAttributeName?: ((attributeName: string) => string) | false;

  /**
   * Change the tag name when a different name is returned. Skip the tag from parsed result when false is returned.
   * Modify `attrs` object to control attributes for the given tag.
   * 
   * @returns {string} new tag name.
   * @returns false to skip the tag
   * 
   * Defaults to `(tagName, jPath, attrs) => tagName`
   */
  updateTag?: (tagName: string, jPath: string, attrs: { [k: string]: string }) => string | boolean;

  /**
   * If true, adds a Symbol to all object nodes, accessible by {@link XMLParser.getMetaDataSymbol} with
   * metadata about each the node in the XML file.
   */
  captureMetaData?: boolean;

  /**
   * Maximum number of nested tags
   * 
   * Defaults to `100`
   */
  maxNestedTags?: number;
};



export type strnumOptions = {
  hex: boolean;
  leadingZeros: boolean,
  skipLike?: RegExp,
  eNotation?: boolean
}

export type validationOptions = {
  /**
   * Whether to allow attributes without value
   * 
   * Defaults to `false`
   */
  allowBooleanAttributes?: boolean;

  /**
   * List of tags without closing tags
   * 
   * Defaults to `[]`
   */
  unpairedTags?: string[];
};

export type XmlBuilderOptions = {
  /**
   * Give a prefix to the attribute name in the resulting JS object
   * 
   * Defaults to '@_'
   */
  attributeNamePrefix?: string;

  /**
   * A name to group all attributes of a tag under, or `false` to disable
   * 
   * Defaults to `false`
   */
  attributesGroupName?: false | string;

  /**
   * The name of the next node in the resulting JS
   * 
   * Defaults to `#text`
   */
  textNodeName?: string;

  /**
   * Whether to ignore attributes when building
   * 
   * When `true` - ignores all the attributes
   * 
   * When `false` - builds all the attributes
   * 
   * When `Array<string | RegExp>` - filters out attributes that match provided patterns
   * 
   * When `Function` - calls the function for each attribute and filters out those for which the function returned `true`
   * 
   * Defaults to `true`
   */
  ignoreAttributes?: boolean | (string | RegExp)[] | ((attrName: string, jPath: string) => boolean);

  /**
   * Give a property name to set CDATA values to instead of merging to tag's text value
   * 
   * Defaults to `false`
   */
  cdataPropName?: false | string;

  /**
   * If set, parse comments and set as this property
   * 
   * Defaults to `false`
   */
  commentPropName?: false | string;

  /**
   * Whether to make output pretty instead of single line
   * 
   * Defaults to `false`
   */
  format?: boolean;


  /**
   * If `format` is set to `true`, sets the indent string
   * 
   * Defaults to `  `
   */
  indentBy?: string;

  /**
   * Give a name to a top-level array
   * 
   * Defaults to `undefined`
   */
  arrayNodeName?: string;

  /**
   * Create empty tags for tags with no text value
   * 
   * Defaults to `false`
   */
  suppressEmptyNode?: boolean;

  /**
   * Suppress an unpaired tag
   * 
   * Defaults to `true`
   */
  suppressUnpairedNode?: boolean;

  /**
   * Don't put a value for boolean attributes
   * 
   * Defaults to `true`
   */
  suppressBooleanAttributes?: boolean;

  /**
   * Preserve the order of tags in resulting JS object
   * 
   * Defaults to `false`
   */
  preserveOrder?: boolean;

  /**
   * List of tags without closing tags
   * 
   * Defaults to `[]`
   */
  unpairedTags?: string[];

  /**
   * Nodes to stop parsing at
   * 
   * Defaults to `[]`
   */
  stopNodes?: string[];

  /**
   * Control how tag value should be parsed. Called only if tag value is not empty
   * 
   * @returns {undefined|null} `undefined` or `null` to set original value.
   * @returns {unknown} 
   * 
   * 1. Different value or value with different data type to set new value.
   * 2. Same value to set parsed value if `parseTagValue: true`.
   * 
   * Defaults to `(tagName, val, jPath, hasAttributes, isLeafNode) => val`
   */
  tagValueProcessor?: (name: string, value: unknown) => unknown;

  /**
   * Control how attribute value should be parsed
   * 
   * @param attrName 
   * @param attrValue 
   * @param jPath 
   * @returns {undefined|null} `undefined` or `null` to set original value
   * @returns {unknown}
   * 
   * Defaults to `(attrName, val, jPath) => val`
   */
  attributeValueProcessor?: (name: string, value: unknown) => unknown;

  /**
   * Whether to process default and DOCTYPE entities
   * 
   * Defaults to `true`
   */
  processEntities?: boolean;


  oneListGroup?: boolean;
};

type ESchema = string | object | Array<string | object>;

export type ValidationError = {
  err: {
    code: string;
    msg: string,
    line: number,
    col: number
  };
};

export class XMLParser {
  constructor(options?: X2jOptions);
  parse(xmlData: string | Uint8Array, validationOptions?: validationOptions | boolean): any;
  /**
   * Add Entity which is not by default supported by this library
   * @param entityIdentifier {string} Eg: 'ent' for &ent;
   * @param entityValue {string} Eg: '\r'
   */
  addEntity(entityIdentifier: string, entityValue: string): void;

  /**
   * Returns a Symbol that can be used to access the {@link XMLMetaData}
   * property on a node.
   * 
   * If Symbol is not available in the environment, an ordinary property is used
   * and the name of the property is here returned.
   * 
   * The XMLMetaData property is only present when {@link X2jOptions.captureMetaData}
   * is true in the options.
   */
  static getMetaDataSymbol(): Symbol;
}

export class XMLValidator {
  static validate(xmlData: string, options?: validationOptions): true | ValidationError;
}
export class XMLBuilder {
  constructor(options?: XmlBuilderOptions);
  build(jObj: any): string;
}

/**
 * This object is available on nodes via the symbol {@link XMLParser.getMetaDataSymbol} 
 * when {@link X2jOptions.captureMetaData} is true.
 */
export interface XMLMetaData {
  /** The index, if available, of the character where the XML node began in the input stream. */
  startIndex?: number;
}