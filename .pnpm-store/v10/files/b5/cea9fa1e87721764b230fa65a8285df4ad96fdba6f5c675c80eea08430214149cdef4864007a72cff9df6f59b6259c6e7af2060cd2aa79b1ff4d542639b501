/*
 Language: ArcGIS Arcade
 Category: scripting
 Author: John Foster <jfoster@esri.com>
 Website: https://developers.arcgis.com/arcade/
 Description: ArcGIS Arcade is an expression language used in many Esri ArcGIS products such as Pro, Online, Server, Runtime, JavaScript, and Python
*/

/** @type LanguageFn */
function arcade(hljs) {
  const IDENT_RE = '[A-Za-z_][0-9A-Za-z_]*';
  const KEYWORDS = {
    keyword: [
      "if",
      "for",
      "while",
      "var",
      "new",
      "function",
      "do",
      "return",
      "void",
      "else",
      "break"
    ],
    literal: [
      "BackSlash",
      "DoubleQuote",
      "false",
      "ForwardSlash",
      "Infinity",
      "NaN",
      "NewLine",
      "null",
      "PI",
      "SingleQuote",
      "Tab",
      "TextFormatting",
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
      "Clip",
      "Concatenate",
      "Console",
      "Constrain",
      "Contains",
      "ConvertDirection",
      "Cos",
      "Count",
      "Crosses",
      "Cut",
      "Date",
      "DateAdd",
      "DateDiff",
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
      "FeatureSet",
      "FeatureSetByAssociation",
      "FeatureSetById",
      "FeatureSetByName",
      "FeatureSetByPortalItem",
      "FeatureSetByRelationshipName",
      "Filter",
      "Find",
      "First",
      "Floor",
      "FromCharCode",
      "FromCodePoint",
      "FromJSON",
      "GdbVersion",
      "Generalize",
      "Geometry",
      "GetFeatureSet",
      "GetUser",
      "GroupBy",
      "Guid",
      "Hash",
      "HasKey",
      "Hour",
      "IIf",
      "Includes",
      "IndexOf",
      "Insert",
      "Intersection",
      "Intersects",
      "IsEmpty",
      "IsNan",
      "ISOMonth",
      "ISOWeek",
      "ISOWeekday",
      "ISOYear",
      "IsSelfIntersecting",
      "IsSimple",
      "Left|0",
      "Length",
      "Length3D",
      "LengthGeodetic",
      "Log",
      "Lower",
      "Map",
      "Max",
      "Mean",
      "Mid",
      "Millisecond",
      "Min",
      "Minute",
      "Month",
      "MultiPartToSinglePart",
      "Multipoint",
      "NextSequenceValue",
      "None",
      "Now",
      "Number",
      "Offset|0",
      "OrderBy",
      "Overlaps",
      "Point",
      "Polygon",
      "Polyline",
      "Pop",
      "Portal",
      "Pow",
      "Proper",
      "Push",
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
      "Stdev",
      "SubtypeCode",
      "SubtypeName",
      "Subtypes",
      "Sum",
      "SymmetricDifference",
      "Tan",
      "Text",
      "Timestamp",
      "ToCharCode",
      "ToCodePoint",
      "Today",
      "ToHex",
      "ToLocal",
      "Top|0",
      "Touches",
      "ToUTC",
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
      "When",
      "Within",
      "Year"
    ]
  };
  const SYMBOL = {
    className: 'symbol',
    begin: '\\$[datastore|feature|layer|map|measure|sourcefeature|sourcelayer|targetfeature|targetlayer|value|view]+'
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

export { arcade as default };
