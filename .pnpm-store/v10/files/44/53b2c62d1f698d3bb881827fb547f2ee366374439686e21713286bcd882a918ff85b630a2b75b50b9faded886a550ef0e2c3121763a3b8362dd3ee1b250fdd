exports.readOptions = readOptions;


var _ = require("underscore");

var defaultStyleMap = exports._defaultStyleMap = [
    "p.Heading1 => h1:fresh",
    "p.Heading2 => h2:fresh",
    "p.Heading3 => h3:fresh",
    "p.Heading4 => h4:fresh",
    "p.Heading5 => h5:fresh",
    "p.Heading6 => h6:fresh",
    "p[style-name='Heading 1'] => h1:fresh",
    "p[style-name='Heading 2'] => h2:fresh",
    "p[style-name='Heading 3'] => h3:fresh",
    "p[style-name='Heading 4'] => h4:fresh",
    "p[style-name='Heading 5'] => h5:fresh",
    "p[style-name='Heading 6'] => h6:fresh",
    "p[style-name='heading 1'] => h1:fresh",
    "p[style-name='heading 2'] => h2:fresh",
    "p[style-name='heading 3'] => h3:fresh",
    "p[style-name='heading 4'] => h4:fresh",
    "p[style-name='heading 5'] => h5:fresh",
    "p[style-name='heading 6'] => h6:fresh",

    // Apple Pages
    "p.Heading => h1:fresh",
    "p[style-name='Heading'] => h1:fresh",

    "r[style-name='Strong'] => strong",

    "p[style-name='footnote text'] => p:fresh",
    "r[style-name='footnote reference'] =>",
    "p[style-name='endnote text'] => p:fresh",
    "r[style-name='endnote reference'] =>",
    "p[style-name='annotation text'] => p:fresh",
    "r[style-name='annotation reference'] =>",

    // LibreOffice
    "p[style-name='Footnote'] => p:fresh",
    "r[style-name='Footnote anchor'] =>",
    "p[style-name='Endnote'] => p:fresh",
    "r[style-name='Endnote anchor'] =>",

    "p:unordered-list(1) => ul > li:fresh",
    "p:unordered-list(2) => ul|ol > li > ul > li:fresh",
    "p:unordered-list(3) => ul|ol > li > ul|ol > li > ul > li:fresh",
    "p:unordered-list(4) => ul|ol > li > ul|ol > li > ul|ol > li > ul > li:fresh",
    "p:unordered-list(5) => ul|ol > li > ul|ol > li > ul|ol > li > ul|ol > li > ul > li:fresh",
    "p:ordered-list(1) => ol > li:fresh",
    "p:ordered-list(2) => ul|ol > li > ol > li:fresh",
    "p:ordered-list(3) => ul|ol > li > ul|ol > li > ol > li:fresh",
    "p:ordered-list(4) => ul|ol > li > ul|ol > li > ul|ol > li > ol > li:fresh",
    "p:ordered-list(5) => ul|ol > li > ul|ol > li > ul|ol > li > ul|ol > li > ol > li:fresh",

    "r[style-name='Hyperlink'] =>",

    "p[style-name='Normal'] => p:fresh",

    // Apple Pages
    "p.Body => p:fresh",
    "p[style-name='Body'] => p:fresh"
];

var standardOptions = exports._standardOptions = {
    externalFileAccess: false,
    transformDocument: identity,
    includeDefaultStyleMap: true,
    includeEmbeddedStyleMap: true
};

function readOptions(options) {
    options = options || {};
    return _.extend({}, standardOptions, options, {
        customStyleMap: readStyleMap(options.styleMap),
        readStyleMap: function() {
            var styleMap = this.customStyleMap;
            if (this.includeEmbeddedStyleMap) {
                styleMap = styleMap.concat(readStyleMap(this.embeddedStyleMap));
            }
            if (this.includeDefaultStyleMap) {
                styleMap = styleMap.concat(defaultStyleMap);
            }
            return styleMap;
        }
    });
}

function readStyleMap(styleMap) {
    if (!styleMap) {
        return [];
    } else if (_.isString(styleMap)) {
        return styleMap.split("\n")
            .map(function(line) {
                return line.trim();
            })
            .filter(function(line) {
                return line !== "" && line.charAt(0) !== "#";
            });
    } else {
        return styleMap;
    }
}

function identity(value) {
    return value;
}
