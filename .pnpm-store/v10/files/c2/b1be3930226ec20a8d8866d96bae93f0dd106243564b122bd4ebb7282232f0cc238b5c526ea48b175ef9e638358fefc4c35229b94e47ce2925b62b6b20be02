/*
 Language: ArcGIS Arcade
 Category: scripting
 Website: https://developers.arcgis.com/arcade/
 Description: ArcGIS Arcade is an expression language used in many Esri ArcGIS products such as Pro, Online, Server, Runtime, JavaScript, and Python
*/

/** @type LanguageFn */
function arcade(hljs) {
  const regex = hljs.regex;
  const IDENT_RE = '[A-Za-z_][0-9A-Za-z_]*';
  const KEYWORDS = {
    keyword: [
      "break",
      "case",
      "catch",
      "continue",
      "debugger",
      "do",
      "else",
      "export",
      "for",
      "function",
      "if",
      "import",
      "in",
      "new",
      "of",
      "return",
      "switch",
      "try",
      "var",
      "void",
      "while"
    ],
    literal: [
      "BackSlash",
      "DoubleQuote",
      "ForwardSlash",
      "Infinity",
      "NaN",
      "NewLine",
      "PI",
      "SingleQuote",
      "Tab",
      "TextFormatting",
      "false",
      "null",
      "true",
      "undefined"
    ],
    built_in: [
      "Abs",
      "Acos",
      "All",
      "Angle",
      "Any",
      "Area",
      "AreaGeodetic",
      "Array",
      "Asin",
      "Atan",
      "Atan2",
      "Attachments",
      "Average",
      "Back",
      "Bearing",
      "Boolean",
      "Buffer",
      "BufferGeodetic",
      "Ceil",
      "Centroid",
      "ChangeTimeZone",
      "Clip",
      "Concatenate",
      "Console",
      "Constrain",
      "Contains",
      "ConvertDirection",
      "ConvexHull",
      "Cos",
      "Count",
      "Crosses",
      "Cut",
      "Date|0",
      "DateAdd",
      "DateDiff",
      "DateOnly",
      "Day",
      "Decode",
      "DefaultValue",
      "Densify",
      "DensifyGeodetic",
      "Dictionary",
      "Difference",
      "Disjoint",
      "Distance",
      "DistanceGeodetic",
      "DistanceToCoordinate",
      "Distinct",
      "Domain",
      "DomainCode",
      "DomainName",
      "EnvelopeIntersects",
      "Equals",
      "Erase",
      "Exp",
      "Expects",
      "Extent",
      "Feature",
      "FeatureInFilter",
      "FeatureSet",
      "FeatureSetByAssociation",
      "FeatureSetById",
      "FeatureSetByName",
      "FeatureSetByPortalItem",
      "FeatureSetByRelationshipClass",
      "FeatureSetByRelationshipName",
      "Filter",
      "FilterBySubtypeCode",
      "Find",
      "First|0",
      "Floor",
      "FromCharCode",
      "FromCodePoint",
      "FromJSON",
      "Front",
      "GdbVersion",
      "Generalize",
      "Geometry",
      "GetEnvironment",
      "GetFeatureSet",
      "GetFeatureSetInfo",
      "GetUser",
      "GroupBy",
      "Guid",
      "HasKey",
      "HasValue",
      "Hash",
      "Hour",
      "IIf",
      "ISOMonth",
      "ISOWeek",
      "ISOWeekday",
      "ISOYear",
      "Includes",
      "IndexOf",
      "Insert",
      "Intersection",
      "Intersects",
      "IsEmpty",
      "IsNan",
      "IsSelfIntersecting",
      "IsSimple",
      "KnowledgeGraphByPortalItem",
      "Left|0",
      "Length",
      "Length3D",
      "LengthGeodetic",
      "Log",
      "Lower",
      "Map",
      "Max",
      "Mean",
      "MeasureToCoordinate",
      "Mid",
      "Millisecond",
      "Min",
      "Minute",
      "Month",
      "MultiPartToSinglePart",
      "Multipoint",
      "NearestCoordinate",
      "NearestVertex",
      "NextSequenceValue",
      "None",
      "Now",
      "Number",
      "Offset",
      "OrderBy",
      "Overlaps",
      "Point",
      "PointToCoordinate",
      "Polygon",
      "Polyline",
      "Pop",
      "Portal",
      "Pow",
      "Proper",
      "Push",
      "QueryGraph",
      "Random",
      "Reduce",
      "Relate",
      "Replace",
      "Resize",
      "Reverse",
      "Right|0",
      "RingIsClockwise",
      "Rotate",
      "Round",
      "Schema",
      "Second",
      "SetGeometry",
      "Simplify",
      "Sin",
      "Slice",
      "Sort",
      "Splice",
      "Split",
      "Sqrt",
      "StandardizeFilename",
      "StandardizeGuid",
      "Stdev",
      "SubtypeCode",
      "SubtypeName",
      "Subtypes",
      "Sum",
      "SymmetricDifference",
      "Tan",
      "Text",
      "Time",
      "TimeZone",
      "TimeZoneOffset",
      "Timestamp",
      "ToCharCode",
      "ToCodePoint",
      "ToHex",
      "ToLocal",
      "ToUTC",
      "Today",
      "Top|0",
      "Touches",
      "TrackAccelerationAt",
      "TrackAccelerationWindow",
      "TrackCurrentAcceleration",
      "TrackCurrentDistance",
      "TrackCurrentSpeed",
      "TrackCurrentTime",
      "TrackDistanceAt",
      "TrackDistanceWindow",
      "TrackDuration",
      "TrackFieldWindow",
      "TrackGeometryWindow",
      "TrackIndex",
      "TrackSpeedAt",
      "TrackSpeedWindow",
      "TrackStartTime",
      "TrackWindow",
      "Trim",
      "TypeOf",
      "Union",
      "Upper",
      "UrlEncode",
      "Variance",
      "Week",
      "Weekday",
      "When|0",
      "Within",
      "Year|0",
    ]
  };
  const PROFILE_VARS = [
    "aggregatedFeatures",
    "analytic",
    "config",
    "datapoint",
    "datastore",
    "editcontext",
    "feature",
    "featureSet",
    "feedfeature",
    "fencefeature",
    "fencenotificationtype",
    "graph",
    "join",
    "layer",
    "locationupdate",
    "map",
    "measure",
    "measure",
    "originalFeature",
    "record",
    "reference",
    "rowindex",
    "sourcedatastore",
    "sourcefeature",
    "sourcelayer",
    "target",
    "targetdatastore",
    "targetfeature",
    "targetlayer",
    "userInput",
    "value",
    "variables",
    "view"
  ];
  const SYMBOL = {
    className: 'symbol',
    begin: '\\$' + regex.either(...PROFILE_VARS)
  };
  const NUMBER = {
    className: 'number',
    variants: [
      { begin: '\\b(0[bB][01]+)' },
      { begin: '\\b(0[oO][0-7]+)' },
      { begin: hljs.C_NUMBER_RE }
    ],
    relevance: 0
  };
  const SUBST = {
    className: 'subst',
    begin: '\\$\\{',
    end: '\\}',
    keywords: KEYWORDS,
    contains: [] // defined later
  };
  const TEMPLATE_STRING = {
    className: 'string',
    begin: '`',
    end: '`',
    contains: [
      hljs.BACKSLASH_ESCAPE,
      SUBST
    ]
  };
  SUBST.contains = [
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE,
    TEMPLATE_STRING,
    NUMBER,
    hljs.REGEXP_MODE
  ];
  const PARAMS_CONTAINS = SUBST.contains.concat([
    hljs.C_BLOCK_COMMENT_MODE,
    hljs.C_LINE_COMMENT_MODE
  ]);

  return {
    name: 'ArcGIS Arcade',
    case_insensitive: true,
    keywords: KEYWORDS,
    contains: [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      TEMPLATE_STRING,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      SYMBOL,
      NUMBER,
      { // object attr container
        begin: /[{,]\s*/,
        relevance: 0,
        contains: [
          {
            begin: IDENT_RE + '\\s*:',
            returnBegin: true,
            relevance: 0,
            contains: [
              {
                className: 'attr',
                begin: IDENT_RE,
                relevance: 0
              }
            ]
          }
        ]
      },
      { // "value" container
        begin: '(' + hljs.RE_STARTERS_RE + '|\\b(return)\\b)\\s*',
        keywords: 'return',
        contains: [
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          hljs.REGEXP_MODE,
          {
            className: 'function',
            begin: '(\\(.*?\\)|' + IDENT_RE + ')\\s*=>',
            returnBegin: true,
            end: '\\s*=>',
            contains: [
              {
                className: 'params',
                variants: [
                  { begin: IDENT_RE },
                  { begin: /\(\s*\)/ },
                  {
                    begin: /\(/,
                    end: /\)/,
                    excludeBegin: true,
                    excludeEnd: true,
                    keywords: KEYWORDS,
                    contains: PARAMS_CONTAINS
                  }
                ]
              }
            ]
          }
        ],
        relevance: 0
      },
      {
        beginKeywords: 'function',
        end: /\{/,
        excludeEnd: true,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {
            className: "title.function",
            begin: IDENT_RE
          }),
          {
            className: 'params',
            begin: /\(/,
            end: /\)/,
            excludeBegin: true,
            excludeEnd: true,
            contains: PARAMS_CONTAINS
          }
        ],
        illegal: /\[|%/
      },
      { begin: /\$[(.]/ }
    ],
    illegal: /#(?!!)/
  };
}

module.exports = arcade;
