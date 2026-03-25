export const defaultOptions = {
  preserveOrder: false,
  attributeNamePrefix: '@_',
  attributesGroupName: false,
  textNodeName: '#text',
  ignoreAttributes: true,
  removeNSPrefix: false, // remove NS from tag name or attribute name if true
  allowBooleanAttributes: false, //a tag can have attributes without any value
  //ignoreRootElement : false,
  parseTagValue: true,
  parseAttributeValue: false,
  trimValues: true, //Trim string values of tag and attributes
  cdataPropName: false,
  numberParseOptions: {
    hex: true,
    leadingZeros: true,
    eNotation: true
  },
  tagValueProcessor: function (tagName, val) {
    return val;
  },
  attributeValueProcessor: function (attrName, val) {
    return val;
  },
  stopNodes: [], //nested tags will not be parsed even for errors
  alwaysCreateTextNode: false,
  isArray: () => false,
  commentPropName: false,
  unpairedTags: [],
  processEntities: true,
  htmlEntities: false,
  ignoreDeclaration: false,
  ignorePiTags: false,
  transformTagName: false,
  transformAttributeName: false,
  updateTag: function (tagName, jPath, attrs) {
    return tagName
  },
  // skipEmptyListItem: false
  captureMetaData: false,
  maxNestedTags: 100,
};

/**
 * Normalizes processEntities option for backward compatibility
 * @param {boolean|object} value 
 * @returns {object} Always returns normalized object
 */
function normalizeProcessEntities(value) {
  // Boolean backward compatibility
  if (typeof value === 'boolean') {
    return {
      enabled: value, // true or false
      maxEntitySize: 10000,
      maxExpansionDepth: 10,
      maxTotalExpansions: 1000,
      maxExpandedLength: 100000,
      allowedTags: null,
      tagFilter: null
    };
  }

  // Object config - merge with defaults
  if (typeof value === 'object' && value !== null) {
    return {
      enabled: value.enabled !== false, // default true if not specified
      maxEntitySize: value.maxEntitySize ?? 10000,
      maxExpansionDepth: value.maxExpansionDepth ?? 10,
      maxTotalExpansions: value.maxTotalExpansions ?? 1000,
      maxExpandedLength: value.maxExpandedLength ?? 100000,
      allowedTags: value.allowedTags ?? null,
      tagFilter: value.tagFilter ?? null
    };
  }

  // Default to enabled with limits
  return normalizeProcessEntities(true);
}

export const buildOptions = function (options) {
  const built = Object.assign({}, defaultOptions, options);

  // Always normalize processEntities for backward compatibility and validation
  built.processEntities = normalizeProcessEntities(built.processEntities);
  //console.debug(built.processEntities)
  return built;
};