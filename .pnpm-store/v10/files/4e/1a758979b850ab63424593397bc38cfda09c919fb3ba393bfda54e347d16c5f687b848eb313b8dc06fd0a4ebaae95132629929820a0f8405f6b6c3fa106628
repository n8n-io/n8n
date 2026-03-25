var createBodyReader = require("../../lib/docx/body-reader").createBodyReader;
var defaultNumbering = require("../../lib/docx/numbering-xml").defaultNumbering;
var Styles = require("../../lib/docx/styles-reader").Styles;

function createBodyReaderForTests(options) {
    options = Object.create(options || {});
    options.styles = options.styles || new Styles({}, {});
    options.numbering = options.numbering || defaultNumbering;
    return createBodyReader(options);
}

exports.createBodyReaderForTests = createBodyReaderForTests;
