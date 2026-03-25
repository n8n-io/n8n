// Module: @xmldom/xmldom@0.8.6
// License: MIT
//
// Module: base64-js@1.5.1
// License: MIT
//
// Module: bluebird@3.4.7
// License: MIT
//
// Module: buffer@4.9.1
// License: MIT
//
// Module: dingbat-to-unicode@1.0.1
// License: BSD-2-Clause
//
// Module: ieee754@1.1.8
// License: BSD-3-Clause
//
// Module: isarray@1.0.0
// License: MIT
//
// Module: jszip@3.7.1
// License: (MIT OR GPL-3.0-or-later)
//
// Module: lop@0.4.2
// License: BSD-2-Clause
//
// Module: mammoth@1.11.0
// License: BSD-2-Clause
//
// Module: option@0.2.4
// License: BSD-2-Clause
//
// Module: process@0.11.9
// License: MIT
//
// Module: underscore@1.13.1
// License: MIT
//
// Module: xmlbuilder@10.0.0
// License: MIT
//
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.mammoth = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var promises = require("../../lib/promises");

exports.Files = Files;


function Files() {
    function read(uri) {
        return promises.reject(new Error("could not open external image: '" + uri + "'\ncannot open linked files from a web browser"));
    }
    
    return {
        read: read
    };
}

},{"../../lib/promises":23}],2:[function(require,module,exports){
var promises = require("../lib/promises");
var zipfile = require("../lib/zipfile");

exports.openZip = openZip;

function openZip(options) {
    if (options.arrayBuffer) {
        return promises.resolve(zipfile.openArrayBuffer(options.arrayBuffer));
    } else {
        return promises.reject(new Error("Could not find file in options"));
    }
}

},{"../lib/promises":23,"../lib/zipfile":40}],3:[function(require,module,exports){
var _ = require("underscore");

var promises = require("./promises");
var documents = require("./documents");
var htmlPaths = require("./styles/html-paths");
var results = require("./results");
var images = require("./images");
var Html = require("./html");
var writers = require("./writers");

exports.DocumentConverter = DocumentConverter;


function DocumentConverter(options) {
    return {
        convertToHtml: function(element) {
            var comments = _.indexBy(
                element.type === documents.types.document ? element.comments : [],
                "commentId"
            );
            var conversion = new DocumentConversion(options, comments);
            return conversion.convertToHtml(element);
        }
    };
}

function DocumentConversion(options, comments) {
    var noteNumber = 1;

    var noteReferences = [];

    var referencedComments = [];

    options = _.extend({ignoreEmptyParagraphs: true}, options);
    var idPrefix = options.idPrefix === undefined ? "" : options.idPrefix;
    var ignoreEmptyParagraphs = options.ignoreEmptyParagraphs;

    var defaultParagraphStyle = htmlPaths.topLevelElement("p");

    var styleMap = options.styleMap || [];

    function convertToHtml(document) {
        var messages = [];

        var html = elementToHtml(document, messages, {});

        var deferredNodes = [];
        walkHtml(html, function(node) {
            if (node.type === "deferred") {
                deferredNodes.push(node);
            }
        });
        var deferredValues = {};
        return promises.mapSeries(deferredNodes, function(deferred) {
            return deferred.value().then(function(value) {
                deferredValues[deferred.id] = value;
            });
        }).then(function() {
            function replaceDeferred(nodes) {
                return flatMap(nodes, function(node) {
                    if (node.type === "deferred") {
                        return deferredValues[node.id];
                    } else if (node.children) {
                        return [
                            _.extend({}, node, {
                                children: replaceDeferred(node.children)
                            })
                        ];
                    } else {
                        return [node];
                    }
                });
            }
            var writer = writers.writer({
                prettyPrint: options.prettyPrint,
                outputFormat: options.outputFormat
            });
            Html.write(writer, Html.simplify(replaceDeferred(html)));
            return new results.Result(writer.asString(), messages);
        });
    }

    function convertElements(elements, messages, options) {
        return flatMap(elements, function(element) {
            return elementToHtml(element, messages, options);
        });
    }

    function elementToHtml(element, messages, options) {
        if (!options) {
            throw new Error("options not set");
        }
        var handler = elementConverters[element.type];
        if (handler) {
            return handler(element, messages, options);
        } else {
            return [];
        }
    }

    function convertParagraph(element, messages, options) {
        return htmlPathForParagraph(element, messages).wrap(function() {
            var content = convertElements(element.children, messages, options);
            if (ignoreEmptyParagraphs) {
                return content;
            } else {
                return [Html.forceWrite].concat(content);
            }
        });
    }

    function htmlPathForParagraph(element, messages) {
        var style = findStyle(element);

        if (style) {
            return style.to;
        } else {
            if (element.styleId) {
                messages.push(unrecognisedStyleWarning("paragraph", element));
            }
            return defaultParagraphStyle;
        }
    }

    function convertRun(run, messages, options) {
        var nodes = function() {
            return convertElements(run.children, messages, options);
        };
        var paths = [];
        if (run.highlight !== null) {
            var path = findHtmlPath({type: "highlight", color: run.highlight});
            if (path) {
                paths.push(path);
            }
        }
        if (run.isSmallCaps) {
            paths.push(findHtmlPathForRunProperty("smallCaps"));
        }
        if (run.isAllCaps) {
            paths.push(findHtmlPathForRunProperty("allCaps"));
        }
        if (run.isStrikethrough) {
            paths.push(findHtmlPathForRunProperty("strikethrough", "s"));
        }
        if (run.isUnderline) {
            paths.push(findHtmlPathForRunProperty("underline"));
        }
        if (run.verticalAlignment === documents.verticalAlignment.subscript) {
            paths.push(htmlPaths.element("sub", {}, {fresh: false}));
        }
        if (run.verticalAlignment === documents.verticalAlignment.superscript) {
            paths.push(htmlPaths.element("sup", {}, {fresh: false}));
        }
        if (run.isItalic) {
            paths.push(findHtmlPathForRunProperty("italic", "em"));
        }
        if (run.isBold) {
            paths.push(findHtmlPathForRunProperty("bold", "strong"));
        }
        var stylePath = htmlPaths.empty;
        var style = findStyle(run);
        if (style) {
            stylePath = style.to;
        } else if (run.styleId) {
            messages.push(unrecognisedStyleWarning("run", run));
        }
        paths.push(stylePath);

        paths.forEach(function(path) {
            nodes = path.wrap.bind(path, nodes);
        });

        return nodes();
    }

    function findHtmlPathForRunProperty(elementType, defaultTagName) {
        var path = findHtmlPath({type: elementType});
        if (path) {
            return path;
        } else if (defaultTagName) {
            return htmlPaths.element(defaultTagName, {}, {fresh: false});
        } else {
            return htmlPaths.empty;
        }
    }

    function findHtmlPath(element, defaultPath) {
        var style = findStyle(element);
        return style ? style.to : defaultPath;
    }

    function findStyle(element) {
        for (var i = 0; i < styleMap.length; i++) {
            if (styleMap[i].from.matches(element)) {
                return styleMap[i];
            }
        }
    }

    function recoveringConvertImage(convertImage) {
        return function(image, messages) {
            return promises.attempt(function() {
                return convertImage(image, messages);
            }).caught(function(error) {
                messages.push(results.error(error));
                return [];
            });
        };
    }

    function noteHtmlId(note) {
        return referentHtmlId(note.noteType, note.noteId);
    }

    function noteRefHtmlId(note) {
        return referenceHtmlId(note.noteType, note.noteId);
    }

    function referentHtmlId(referenceType, referenceId) {
        return htmlId(referenceType + "-" + referenceId);
    }

    function referenceHtmlId(referenceType, referenceId) {
        return htmlId(referenceType + "-ref-" + referenceId);
    }

    function htmlId(suffix) {
        return idPrefix + suffix;
    }

    var defaultTablePath = htmlPaths.elements([
        htmlPaths.element("table", {}, {fresh: true})
    ]);

    function convertTable(element, messages, options) {
        return findHtmlPath(element, defaultTablePath).wrap(function() {
            return convertTableChildren(element, messages, options);
        });
    }

    function convertTableChildren(element, messages, options) {
        var bodyIndex = _.findIndex(element.children, function(child) {
            return !child.type === documents.types.tableRow || !child.isHeader;
        });
        if (bodyIndex === -1) {
            bodyIndex = element.children.length;
        }
        var children;
        if (bodyIndex === 0) {
            children = convertElements(
                element.children,
                messages,
                _.extend({}, options, {isTableHeader: false})
            );
        } else {
            var headRows = convertElements(
                element.children.slice(0, bodyIndex),
                messages,
                _.extend({}, options, {isTableHeader: true})
            );
            var bodyRows = convertElements(
                element.children.slice(bodyIndex),
                messages,
                _.extend({}, options, {isTableHeader: false})
            );
            children = [
                Html.freshElement("thead", {}, headRows),
                Html.freshElement("tbody", {}, bodyRows)
            ];
        }
        return [Html.forceWrite].concat(children);
    }

    function convertTableRow(element, messages, options) {
        var children = convertElements(element.children, messages, options);
        return [
            Html.freshElement("tr", {}, [Html.forceWrite].concat(children))
        ];
    }

    function convertTableCell(element, messages, options) {
        var tagName = options.isTableHeader ? "th" : "td";
        var children = convertElements(element.children, messages, options);
        var attributes = {};
        if (element.colSpan !== 1) {
            attributes.colspan = element.colSpan.toString();
        }
        if (element.rowSpan !== 1) {
            attributes.rowspan = element.rowSpan.toString();
        }

        return [
            Html.freshElement(tagName, attributes, [Html.forceWrite].concat(children))
        ];
    }

    function convertCommentReference(reference, messages, options) {
        return findHtmlPath(reference, htmlPaths.ignore).wrap(function() {
            var comment = comments[reference.commentId];
            var count = referencedComments.length + 1;
            var label = "[" + commentAuthorLabel(comment) + count + "]";
            referencedComments.push({label: label, comment: comment});
            // TODO: remove duplication with note references
            return [
                Html.freshElement("a", {
                    href: "#" + referentHtmlId("comment", reference.commentId),
                    id: referenceHtmlId("comment", reference.commentId)
                }, [Html.text(label)])
            ];
        });
    }

    function convertComment(referencedComment, messages, options) {
        // TODO: remove duplication with note references

        var label = referencedComment.label;
        var comment = referencedComment.comment;
        var body = convertElements(comment.body, messages, options).concat([
            Html.nonFreshElement("p", {}, [
                Html.text(" "),
                Html.freshElement("a", {"href": "#" + referenceHtmlId("comment", comment.commentId)}, [
                    Html.text("↑")
                ])
            ])
        ]);

        return [
            Html.freshElement(
                "dt",
                {"id": referentHtmlId("comment", comment.commentId)},
                [Html.text("Comment " + label)]
            ),
            Html.freshElement("dd", {}, body)
        ];
    }

    function convertBreak(element, messages, options) {
        return htmlPathForBreak(element).wrap(function() {
            return [];
        });
    }

    function htmlPathForBreak(element) {
        var style = findStyle(element);
        if (style) {
            return style.to;
        } else if (element.breakType === "line") {
            return htmlPaths.topLevelElement("br");
        } else {
            return htmlPaths.empty;
        }
    }

    var elementConverters = {
        "document": function(document, messages, options) {
            var children = convertElements(document.children, messages, options);
            var notes = noteReferences.map(function(noteReference) {
                return document.notes.resolve(noteReference);
            });
            var notesNodes = convertElements(notes, messages, options);
            return children.concat([
                Html.freshElement("ol", {}, notesNodes),
                Html.freshElement("dl", {}, flatMap(referencedComments, function(referencedComment) {
                    return convertComment(referencedComment, messages, options);
                }))
            ]);
        },
        "paragraph": convertParagraph,
        "run": convertRun,
        "text": function(element, messages, options) {
            return [Html.text(element.value)];
        },
        "tab": function(element, messages, options) {
            return [Html.text("\t")];
        },
        "hyperlink": function(element, messages, options) {
            var href = element.anchor ? "#" + htmlId(element.anchor) : element.href;
            var attributes = {href: href};
            if (element.targetFrame != null) {
                attributes.target = element.targetFrame;
            }

            var children = convertElements(element.children, messages, options);
            return [Html.nonFreshElement("a", attributes, children)];
        },
        "checkbox": function(element) {
            var attributes = {type: "checkbox"};
            if (element.checked) {
                attributes["checked"] = "checked";
            }
            return [Html.freshElement("input", attributes)];
        },
        "bookmarkStart": function(element, messages, options) {
            var anchor = Html.freshElement("a", {
                id: htmlId(element.name)
            }, [Html.forceWrite]);
            return [anchor];
        },
        "noteReference": function(element, messages, options) {
            noteReferences.push(element);
            var anchor = Html.freshElement("a", {
                href: "#" + noteHtmlId(element),
                id: noteRefHtmlId(element)
            }, [Html.text("[" + (noteNumber++) + "]")]);

            return [Html.freshElement("sup", {}, [anchor])];
        },
        "note": function(element, messages, options) {
            var children = convertElements(element.body, messages, options);
            var backLink = Html.elementWithTag(htmlPaths.element("p", {}, {fresh: false}), [
                Html.text(" "),
                Html.freshElement("a", {href: "#" + noteRefHtmlId(element)}, [Html.text("↑")])
            ]);
            var body = children.concat([backLink]);

            return Html.freshElement("li", {id: noteHtmlId(element)}, body);
        },
        "commentReference": convertCommentReference,
        "comment": convertComment,
        "image": deferredConversion(recoveringConvertImage(options.convertImage || images.dataUri)),
        "table": convertTable,
        "tableRow": convertTableRow,
        "tableCell": convertTableCell,
        "break": convertBreak
    };
    return {
        convertToHtml: convertToHtml
    };
}

var deferredId = 1;

function deferredConversion(func) {
    return function(element, messages, options) {
        return [
            {
                type: "deferred",
                id: deferredId++,
                value: function() {
                    return func(element, messages, options);
                }
            }
        ];
    };
}

function unrecognisedStyleWarning(type, element) {
    return results.warning(
        "Unrecognised " + type + " style: '" + element.styleName + "'" +
        " (Style ID: " + element.styleId + ")"
    );
}

function flatMap(values, func) {
    return _.flatten(values.map(func), true);
}

function walkHtml(nodes, callback) {
    nodes.forEach(function(node) {
        callback(node);
        if (node.children) {
            walkHtml(node.children, callback);
        }
    });
}

var commentAuthorLabel = exports.commentAuthorLabel = function commentAuthorLabel(comment) {
    return comment.authorInitials || "";
};

},{"./documents":4,"./html":18,"./images":20,"./promises":23,"./results":25,"./styles/html-paths":28,"./writers":33,"underscore":102}],4:[function(require,module,exports){
(function (Buffer){
var _ = require("underscore");

var types = exports.types = {
    document: "document",
    paragraph: "paragraph",
    run: "run",
    text: "text",
    tab: "tab",
    checkbox: "checkbox",
    hyperlink: "hyperlink",
    noteReference: "noteReference",
    image: "image",
    note: "note",
    commentReference: "commentReference",
    comment: "comment",
    table: "table",
    tableRow: "tableRow",
    tableCell: "tableCell",
    "break": "break",
    bookmarkStart: "bookmarkStart"
};

function Document(children, options) {
    options = options || {};
    return {
        type: types.document,
        children: children,
        notes: options.notes || new Notes({}),
        comments: options.comments || []
    };
}

function Paragraph(children, properties) {
    properties = properties || {};
    var indent = properties.indent || {};
    return {
        type: types.paragraph,
        children: children,
        styleId: properties.styleId || null,
        styleName: properties.styleName || null,
        numbering: properties.numbering || null,
        alignment: properties.alignment || null,
        indent: {
            start: indent.start || null,
            end: indent.end || null,
            firstLine: indent.firstLine || null,
            hanging: indent.hanging || null
        }
    };
}

function Run(children, properties) {
    properties = properties || {};
    return {
        type: types.run,
        children: children,
        styleId: properties.styleId || null,
        styleName: properties.styleName || null,
        isBold: !!properties.isBold,
        isUnderline: !!properties.isUnderline,
        isItalic: !!properties.isItalic,
        isStrikethrough: !!properties.isStrikethrough,
        isAllCaps: !!properties.isAllCaps,
        isSmallCaps: !!properties.isSmallCaps,
        verticalAlignment: properties.verticalAlignment || verticalAlignment.baseline,
        font: properties.font || null,
        fontSize: properties.fontSize || null,
        highlight: properties.highlight || null
    };
}

var verticalAlignment = {
    baseline: "baseline",
    superscript: "superscript",
    subscript: "subscript"
};

function Text(value) {
    return {
        type: types.text,
        value: value
    };
}

function Tab() {
    return {
        type: types.tab
    };
}

function Checkbox(options) {
    return {
        type: types.checkbox,
        checked: options.checked
    };
}

function Hyperlink(children, options) {
    return {
        type: types.hyperlink,
        children: children,
        href: options.href,
        anchor: options.anchor,
        targetFrame: options.targetFrame
    };
}

function NoteReference(options) {
    return {
        type: types.noteReference,
        noteType: options.noteType,
        noteId: options.noteId
    };
}

function Notes(notes) {
    this._notes = _.indexBy(notes, function(note) {
        return noteKey(note.noteType, note.noteId);
    });
}

Notes.prototype.resolve = function(reference) {
    return this.findNoteByKey(noteKey(reference.noteType, reference.noteId));
};

Notes.prototype.findNoteByKey = function(key) {
    return this._notes[key] || null;
};

function Note(options) {
    return {
        type: types.note,
        noteType: options.noteType,
        noteId: options.noteId,
        body: options.body
    };
}

function commentReference(options) {
    return {
        type: types.commentReference,
        commentId: options.commentId
    };
}

function comment(options) {
    return {
        type: types.comment,
        commentId: options.commentId,
        body: options.body,
        authorName: options.authorName,
        authorInitials: options.authorInitials
    };
}

function noteKey(noteType, id) {
    return noteType + "-" + id;
}

function Image(options) {
    return {
        type: types.image,
        // `read` is retained for backwards compatibility, but other read
        // methods should be preferred.
        read: function(encoding) {
            if (encoding) {
                return options.readImage(encoding);
            } else {
                return options.readImage().then(function(arrayBuffer) {
                    return Buffer.from(arrayBuffer);
                });
            }
        },
        readAsArrayBuffer: function() {
            return options.readImage();
        },
        readAsBase64String: function() {
            return options.readImage("base64");
        },
        readAsBuffer: function() {
            return options.readImage().then(function(arrayBuffer) {
                return Buffer.from(arrayBuffer);
            });
        },
        altText: options.altText,
        contentType: options.contentType
    };
}

function Table(children, properties) {
    properties = properties || {};
    return {
        type: types.table,
        children: children,
        styleId: properties.styleId || null,
        styleName: properties.styleName || null
    };
}

function TableRow(children, options) {
    options = options || {};
    return {
        type: types.tableRow,
        children: children,
        isHeader: options.isHeader || false
    };
}

function TableCell(children, options) {
    options = options || {};
    return {
        type: types.tableCell,
        children: children,
        colSpan: options.colSpan == null ? 1 : options.colSpan,
        rowSpan: options.rowSpan == null ? 1 : options.rowSpan
    };
}

function Break(breakType) {
    return {
        type: types["break"],
        breakType: breakType
    };
}

function BookmarkStart(options) {
    return {
        type: types.bookmarkStart,
        name: options.name
    };
}

exports.document = exports.Document = Document;
exports.paragraph = exports.Paragraph = Paragraph;
exports.run = exports.Run = Run;
exports.text = exports.Text = Text;
exports.tab = exports.Tab = Tab;
exports.checkbox = exports.Checkbox = Checkbox;
exports.Hyperlink = Hyperlink;
exports.noteReference = exports.NoteReference = NoteReference;
exports.Notes = Notes;
exports.Note = Note;
exports.commentReference = commentReference;
exports.comment = comment;
exports.Image = Image;
exports.Table = Table;
exports.TableRow = TableRow;
exports.TableCell = TableCell;
exports.lineBreak = Break("line");
exports.pageBreak = Break("page");
exports.columnBreak = Break("column");
exports.BookmarkStart = BookmarkStart;

exports.verticalAlignment = verticalAlignment;

}).call(this,require("buffer").Buffer)
},{"buffer":83,"underscore":102}],5:[function(require,module,exports){
exports.createBodyReader = createBodyReader;
exports._readNumberingProperties = readNumberingProperties;

var dingbatToUnicode = require("dingbat-to-unicode");
var _ = require("underscore");

var documents = require("../documents");
var Result = require("../results").Result;
var warning = require("../results").warning;
var xml = require("../xml");
var transforms = require("../transforms");
var uris = require("./uris");

function createBodyReader(options) {
    return {
        readXmlElement: function(element) {
            return new BodyReader(options).readXmlElement(element);
        },
        readXmlElements: function(elements) {
            return new BodyReader(options).readXmlElements(elements);
        }
    };
}

function BodyReader(options) {
    var complexFieldStack = [];
    var currentInstrText = [];

    // When a paragraph is marked as deleted, its contents should be combined
    // with the following paragraph. See 17.13.5.15 del (Deleted Paragraph) of
    // ECMA-376 4th edition Part 1.
    var deletedParagraphContents = [];

    var relationships = options.relationships;
    var contentTypes = options.contentTypes;
    var docxFile = options.docxFile;
    var files = options.files;
    var numbering = options.numbering;
    var styles = options.styles;

    function readXmlElements(elements) {
        var results = elements.map(readXmlElement);
        return combineResults(results);
    }

    function readXmlElement(element) {
        if (element.type === "element") {
            var handler = xmlElementReaders[element.name];
            if (handler) {
                return handler(element);
            } else if (!Object.prototype.hasOwnProperty.call(ignoreElements, element.name)) {
                var message = warning("An unrecognised element was ignored: " + element.name);
                return emptyResultWithMessages([message]);
            }
        }
        return emptyResult();
    }

    function readParagraphProperties(element) {
        return readParagraphStyle(element).map(function(style) {
            return {
                type: "paragraphProperties",
                styleId: style.styleId,
                styleName: style.name,
                alignment: element.firstOrEmpty("w:jc").attributes["w:val"],
                numbering: readNumberingProperties(style.styleId, element.firstOrEmpty("w:numPr"), numbering),
                indent: readParagraphIndent(element.firstOrEmpty("w:ind"))
            };
        });
    }

    function readParagraphIndent(element) {
        return {
            start: element.attributes["w:start"] || element.attributes["w:left"],
            end: element.attributes["w:end"] || element.attributes["w:right"],
            firstLine: element.attributes["w:firstLine"],
            hanging: element.attributes["w:hanging"]
        };
    }

    function readRunProperties(element) {
        return readRunStyle(element).map(function(style) {
            var fontSizeString = element.firstOrEmpty("w:sz").attributes["w:val"];
            // w:sz gives the font size in half points, so halve the value to get the size in points
            var fontSize = /^[0-9]+$/.test(fontSizeString) ? parseInt(fontSizeString, 10) / 2 : null;

            return {
                type: "runProperties",
                styleId: style.styleId,
                styleName: style.name,
                verticalAlignment: element.firstOrEmpty("w:vertAlign").attributes["w:val"],
                font: element.firstOrEmpty("w:rFonts").attributes["w:ascii"],
                fontSize: fontSize,
                isBold: readBooleanElement(element.first("w:b")),
                isUnderline: readUnderline(element.first("w:u")),
                isItalic: readBooleanElement(element.first("w:i")),
                isStrikethrough: readBooleanElement(element.first("w:strike")),
                isAllCaps: readBooleanElement(element.first("w:caps")),
                isSmallCaps: readBooleanElement(element.first("w:smallCaps")),
                highlight: readHighlightValue(element.firstOrEmpty("w:highlight").attributes["w:val"])
            };
        });
    }

    function readUnderline(element) {
        if (element) {
            var value = element.attributes["w:val"];
            return value !== undefined && value !== "false" && value !== "0" && value !== "none";
        } else {
            return false;
        }
    }

    function readBooleanElement(element) {
        if (element) {
            var value = element.attributes["w:val"];
            return value !== "false" && value !== "0";
        } else {
            return false;
        }
    }

    function readBooleanAttributeValue(value) {
        return value !== "false" && value !== "0";
    }

    function readHighlightValue(value) {
        if (!value || value === "none") {
            return null;
        } else {
            return value;
        }
    }

    function readParagraphStyle(element) {
        return readStyle(element, "w:pStyle", "Paragraph", styles.findParagraphStyleById);
    }

    function readRunStyle(element) {
        return readStyle(element, "w:rStyle", "Run", styles.findCharacterStyleById);
    }

    function readTableStyle(element) {
        return readStyle(element, "w:tblStyle", "Table", styles.findTableStyleById);
    }

    function readStyle(element, styleTagName, styleType, findStyleById) {
        var messages = [];
        var styleElement = element.first(styleTagName);
        var styleId = null;
        var name = null;
        if (styleElement) {
            styleId = styleElement.attributes["w:val"];
            if (styleId) {
                var style = findStyleById(styleId);
                if (style) {
                    name = style.name;
                } else {
                    messages.push(undefinedStyleWarning(styleType, styleId));
                }
            }
        }
        return elementResultWithMessages({styleId: styleId, name: name}, messages);
    }

    function readFldChar(element) {
        var type = element.attributes["w:fldCharType"];
        if (type === "begin") {
            complexFieldStack.push({type: "begin", fldChar: element});
            currentInstrText = [];
        } else if (type === "end") {
            var complexFieldEnd = complexFieldStack.pop();
            if (complexFieldEnd.type === "begin") {
                complexFieldEnd = parseCurrentInstrText(complexFieldEnd);
            }
            if (complexFieldEnd.type === "checkbox") {
                return elementResult(documents.checkbox({
                    checked: complexFieldEnd.checked
                }));
            }
        } else if (type === "separate") {
            var complexFieldSeparate = complexFieldStack.pop();
            var complexField = parseCurrentInstrText(complexFieldSeparate);
            complexFieldStack.push(complexField);
        }
        return emptyResult();
    }

    function currentHyperlinkOptions() {
        var topHyperlink = _.last(complexFieldStack.filter(function(complexField) {
            return complexField.type === "hyperlink";
        }));
        return topHyperlink ? topHyperlink.options : null;
    }

    function parseCurrentInstrText(complexField) {
        return parseInstrText(
            currentInstrText.join(''),
            complexField.type === "begin"
                ? complexField.fldChar
                : xml.emptyElement
        );
    }

    function parseInstrText(instrText, fldChar) {
        var externalLinkResult = /\s*HYPERLINK "(.*)"/.exec(instrText);
        if (externalLinkResult) {
            return {type: "hyperlink", options: {href: externalLinkResult[1]}};
        }

        var internalLinkResult = /\s*HYPERLINK\s+\\l\s+"(.*)"/.exec(instrText);
        if (internalLinkResult) {
            return {type: "hyperlink", options: {anchor: internalLinkResult[1]}};
        }

        var checkboxResult = /\s*FORMCHECKBOX\s*/.exec(instrText);
        if (checkboxResult) {
            var checkboxElement = fldChar
                .firstOrEmpty("w:ffData")
                .firstOrEmpty("w:checkBox");
            var checkedElement = checkboxElement.first("w:checked");
            var checked = checkedElement == null
                ? readBooleanElement(checkboxElement.first("w:default"))
                : readBooleanElement(checkedElement);
            return {type: "checkbox", checked: checked};
        }

        return {type: "unknown"};
    }

    function readInstrText(element) {
        currentInstrText.push(element.text());
        return emptyResult();
    }

    function readSymbol(element) {
        // See 17.3.3.30 sym (Symbol Character) of ECMA-376 4th edition Part 1
        var font = element.attributes["w:font"];
        var char = element.attributes["w:char"];
        var unicodeCharacter = dingbatToUnicode.hex(font, char);
        if (unicodeCharacter == null && /^F0..$/.test(char)) {
            unicodeCharacter = dingbatToUnicode.hex(font, char.substring(2));
        }

        if (unicodeCharacter == null) {
            return emptyResultWithMessages([warning(
                "A w:sym element with an unsupported character was ignored: char " +  char + " in font " + font
            )]);
        } else {
            return elementResult(new documents.Text(unicodeCharacter.string));
        }
    }

    function noteReferenceReader(noteType) {
        return function(element) {
            var noteId = element.attributes["w:id"];
            return elementResult(new documents.NoteReference({
                noteType: noteType,
                noteId: noteId
            }));
        };
    }

    function readCommentReference(element) {
        return elementResult(documents.commentReference({
            commentId: element.attributes["w:id"]
        }));
    }

    function readChildElements(element) {
        return readXmlElements(element.children);
    }

    var xmlElementReaders = {
        "w:p": function(element) {
            var paragraphPropertiesElement = element.firstOrEmpty("w:pPr");

            var isDeleted = !!paragraphPropertiesElement
                .firstOrEmpty("w:rPr")
                .first("w:del");

            if (isDeleted) {
                element.children.forEach(function(child) {
                    deletedParagraphContents.push(child);
                });
                return emptyResult();
            } else {
                var childrenXml = element.children;
                if (deletedParagraphContents.length > 0) {
                    childrenXml = deletedParagraphContents.concat(childrenXml);
                    deletedParagraphContents = [];
                }
                return ReadResult.map(
                    readParagraphProperties(paragraphPropertiesElement),
                    readXmlElements(childrenXml),
                    function(properties, children) {
                        return new documents.Paragraph(children, properties);
                    }
                ).insertExtra();
            }
        },
        "w:r": function(element) {
            return ReadResult.map(
                readRunProperties(element.firstOrEmpty("w:rPr")),
                readXmlElements(element.children),
                function(properties, children) {
                    var hyperlinkOptions = currentHyperlinkOptions();
                    if (hyperlinkOptions !== null) {
                        children = [new documents.Hyperlink(children, hyperlinkOptions)];
                    }

                    return new documents.Run(children, properties);
                }
            );
        },
        "w:fldChar": readFldChar,
        "w:instrText": readInstrText,
        "w:t": function(element) {
            return elementResult(new documents.Text(element.text()));
        },
        "w:tab": function(element) {
            return elementResult(new documents.Tab());
        },
        "w:noBreakHyphen": function() {
            return elementResult(new documents.Text("\u2011"));
        },
        "w:softHyphen": function(element) {
            return elementResult(new documents.Text("\u00AD"));
        },
        "w:sym": readSymbol,
        "w:hyperlink": function(element) {
            var relationshipId = element.attributes["r:id"];
            var anchor = element.attributes["w:anchor"];
            return readXmlElements(element.children).map(function(children) {
                function create(options) {
                    var targetFrame = element.attributes["w:tgtFrame"] || null;

                    return new documents.Hyperlink(
                        children,
                        _.extend({targetFrame: targetFrame}, options)
                    );
                }

                if (relationshipId) {
                    var href = relationships.findTargetByRelationshipId(relationshipId);
                    if (anchor) {
                        href = uris.replaceFragment(href, anchor);
                    }
                    return create({href: href});
                } else if (anchor) {
                    return create({anchor: anchor});
                } else {
                    return children;
                }
            });
        },
        "w:tbl": readTable,
        "w:tr": readTableRow,
        "w:tc": readTableCell,
        "w:footnoteReference": noteReferenceReader("footnote"),
        "w:endnoteReference": noteReferenceReader("endnote"),
        "w:commentReference": readCommentReference,
        "w:br": function(element) {
            var breakType = element.attributes["w:type"];
            if (breakType == null || breakType === "textWrapping") {
                return elementResult(documents.lineBreak);
            } else if (breakType === "page") {
                return elementResult(documents.pageBreak);
            } else if (breakType === "column") {
                return elementResult(documents.columnBreak);
            } else {
                return emptyResultWithMessages([warning("Unsupported break type: " + breakType)]);
            }
        },
        "w:bookmarkStart": function(element){
            var name = element.attributes["w:name"];
            if (name === "_GoBack") {
                return emptyResult();
            } else {
                return elementResult(new documents.BookmarkStart({name: name}));
            }
        },

        "mc:AlternateContent": function(element) {
            return readChildElements(element.firstOrEmpty("mc:Fallback"));
        },

        "w:sdt": function(element) {
            var contentResult = readXmlElements(element.firstOrEmpty("w:sdtContent").children);
            return contentResult.map(function(content) {
                // From the WordML standard: https://learn.microsoft.com/en-us/openspecs/office_standards/ms-docx/3350cb64-931f-41f7-8824-f18b2568ce66
                //
                // > A CT_SdtCheckbox element that specifies that the parent
                // > structured document tag is a checkbox when displayed in the
                // > document. The parent structured document tag contents MUST
                // > contain a single character and optionally an additional
                // > character in a deleted run.

                var checkbox = element
                    .firstOrEmpty("w:sdtPr")
                    .first("wordml:checkbox");

                if (checkbox) {
                    var checkedElement = checkbox.first("wordml:checked");
                    var isChecked = !!checkedElement && readBooleanAttributeValue(
                        checkedElement.attributes["wordml:val"]
                    );
                    var documentCheckbox = documents.checkbox({
                        checked: isChecked
                    });

                    var hasCheckbox = false;
                    var replacedContent = content.map(transforms._elementsOfType(
                        documents.types.text,
                        function(text) {
                            if (text.value.length > 0 && !hasCheckbox) {
                                hasCheckbox = true;
                                return documentCheckbox;
                            } else {
                                return text;
                            }
                        }
                    ));

                    if (hasCheckbox) {
                        return replacedContent;
                    } else {
                        return documentCheckbox;
                    }

                } else {
                    return content;
                }
            });
        },

        "w:ins": readChildElements,
        "w:object": readChildElements,
        "w:smartTag": readChildElements,
        "w:drawing": readChildElements,
        "w:pict": function(element) {
            return readChildElements(element).toExtra();
        },
        "v:roundrect": readChildElements,
        "v:shape": readChildElements,
        "v:textbox": readChildElements,
        "w:txbxContent": readChildElements,
        "wp:inline": readDrawingElement,
        "wp:anchor": readDrawingElement,
        "v:imagedata": readImageData,
        "v:group": readChildElements,
        "v:rect": readChildElements
    };

    return {
        readXmlElement: readXmlElement,
        readXmlElements: readXmlElements
    };


    function readTable(element) {
        var propertiesResult = readTableProperties(element.firstOrEmpty("w:tblPr"));
        return readXmlElements(element.children)
            .flatMap(calculateRowSpans)
            .flatMap(function(children) {
                return propertiesResult.map(function(properties) {
                    return documents.Table(children, properties);
                });
            });
    }

    function readTableProperties(element) {
        return readTableStyle(element).map(function(style) {
            return {
                styleId: style.styleId,
                styleName: style.name
            };
        });
    }

    function readTableRow(element) {
        var properties = element.firstOrEmpty("w:trPr");

        // See 17.13.5.12 del (Deleted Table Row) of ECMA-376 4th edition Part 1
        var isDeleted = !!properties.first("w:del");
        if (isDeleted) {
            return emptyResult();
        }

        var isHeader = !!properties.first("w:tblHeader");
        return readXmlElements(element.children).map(function(children) {
            return documents.TableRow(children, {isHeader: isHeader});
        });
    }

    function readTableCell(element) {
        return readXmlElements(element.children).map(function(children) {
            var properties = element.firstOrEmpty("w:tcPr");

            var gridSpan = properties.firstOrEmpty("w:gridSpan").attributes["w:val"];
            var colSpan = gridSpan ? parseInt(gridSpan, 10) : 1;

            var cell = documents.TableCell(children, {colSpan: colSpan});
            cell._vMerge = readVMerge(properties);
            return cell;
        });
    }

    function readVMerge(properties) {
        var element = properties.first("w:vMerge");
        if (element) {
            var val = element.attributes["w:val"];
            return val === "continue" || !val;
        } else {
            return null;
        }
    }

    function calculateRowSpans(rows) {
        var unexpectedNonRows = _.any(rows, function(row) {
            return row.type !== documents.types.tableRow;
        });
        if (unexpectedNonRows) {
            removeVMergeProperties(rows);
            return elementResultWithMessages(rows, [warning(
                "unexpected non-row element in table, cell merging may be incorrect"
            )]);
        }
        var unexpectedNonCells = _.any(rows, function(row) {
            return _.any(row.children, function(cell) {
                return cell.type !== documents.types.tableCell;
            });
        });
        if (unexpectedNonCells) {
            removeVMergeProperties(rows);
            return elementResultWithMessages(rows, [warning(
                "unexpected non-cell element in table row, cell merging may be incorrect"
            )]);
        }

        var columns = {};

        rows.forEach(function(row) {
            var cellIndex = 0;
            row.children.forEach(function(cell) {
                if (cell._vMerge && columns[cellIndex]) {
                    columns[cellIndex].rowSpan++;
                } else {
                    columns[cellIndex] = cell;
                    cell._vMerge = false;
                }
                cellIndex += cell.colSpan;
            });
        });

        rows.forEach(function(row) {
            row.children = row.children.filter(function(cell) {
                return !cell._vMerge;
            });
            row.children.forEach(function(cell) {
                delete cell._vMerge;
            });
        });

        return elementResult(rows);
    }

    function removeVMergeProperties(rows) {
        rows.forEach(function(row) {
            var cells = transforms.getDescendantsOfType(row, documents.types.tableCell);
            cells.forEach(function(cell) {
                delete cell._vMerge;
            });
        });
    }

    function readDrawingElement(element) {
        var blips = element
            .getElementsByTagName("a:graphic")
            .getElementsByTagName("a:graphicData")
            .getElementsByTagName("pic:pic")
            .getElementsByTagName("pic:blipFill")
            .getElementsByTagName("a:blip");

        return combineResults(blips.map(readBlip.bind(null, element)));
    }

    function readBlip(element, blip) {
        var properties = element.first("wp:docPr").attributes;
        var altText = isBlank(properties.descr) ? properties.title : properties.descr;
        var blipImageFile = findBlipImageFile(blip);
        if (blipImageFile === null) {
            return emptyResultWithMessages([warning("Could not find image file for a:blip element")]);
        } else {
            return readImage(blipImageFile, altText);
        }
    }

    function isBlank(value) {
        return value == null || /^\s*$/.test(value);
    }

    function findBlipImageFile(blip) {
        var embedRelationshipId = blip.attributes["r:embed"];
        var linkRelationshipId = blip.attributes["r:link"];
        if (embedRelationshipId) {
            return findEmbeddedImageFile(embedRelationshipId);
        } else if (linkRelationshipId) {
            var imagePath = relationships.findTargetByRelationshipId(linkRelationshipId);
            return {
                path: imagePath,
                read: files.read.bind(files, imagePath)
            };
        } else {
            return null;
        }
    }

    function readImageData(element) {
        var relationshipId = element.attributes['r:id'];

        if (relationshipId) {
            return readImage(
                findEmbeddedImageFile(relationshipId),
                element.attributes["o:title"]);
        } else {
            return emptyResultWithMessages([warning("A v:imagedata element without a relationship ID was ignored")]);
        }
    }

    function findEmbeddedImageFile(relationshipId) {
        var path = uris.uriToZipEntryName("word", relationships.findTargetByRelationshipId(relationshipId));
        return {
            path: path,
            read: docxFile.read.bind(docxFile, path)
        };
    }

    function readImage(imageFile, altText) {
        var contentType = contentTypes.findContentType(imageFile.path);

        var image = documents.Image({
            readImage: imageFile.read,
            altText: altText,
            contentType: contentType
        });
        var warnings = supportedImageTypes[contentType] ?
            [] : warning("Image of type " + contentType + " is unlikely to display in web browsers");
        return elementResultWithMessages(image, warnings);
    }

    function undefinedStyleWarning(type, styleId) {
        return warning(
            type + " style with ID " + styleId + " was referenced but not defined in the document");
    }
}


function readNumberingProperties(styleId, element, numbering) {
    var level = element.firstOrEmpty("w:ilvl").attributes["w:val"];
    var numId = element.firstOrEmpty("w:numId").attributes["w:val"];
    if (level !== undefined && numId !== undefined) {
        return numbering.findLevel(numId, level);
    }

    if (styleId != null) {
        var levelByStyleId = numbering.findLevelByParagraphStyleId(styleId);
        if (levelByStyleId != null) {
            return levelByStyleId;
        }
    }

    // Some malformed documents define numbering levels without an index, and
    // reference the numbering using a w:numPr element without a w:ilvl child.
    // To handle such cases, we assume a level of 0 as a fallback.
    if (numId !== undefined) {
        return numbering.findLevel(numId, "0");
    }

    return null;
}

var supportedImageTypes = {
    "image/png": true,
    "image/gif": true,
    "image/jpeg": true,
    "image/svg+xml": true,
    "image/tiff": true
};

var ignoreElements = {
    "office-word:wrap": true,
    "v:shadow": true,
    "v:shapetype": true,
    "w:annotationRef": true,
    "w:bookmarkEnd": true,
    "w:sectPr": true,
    "w:proofErr": true,
    "w:lastRenderedPageBreak": true,
    "w:commentRangeStart": true,
    "w:commentRangeEnd": true,
    "w:del": true,
    "w:footnoteRef": true,
    "w:endnoteRef": true,
    "w:pPr": true,
    "w:rPr": true,
    "w:tblPr": true,
    "w:tblGrid": true,
    "w:trPr": true,
    "w:tcPr": true
};

function emptyResultWithMessages(messages) {
    return new ReadResult(null, null, messages);
}

function emptyResult() {
    return new ReadResult(null);
}

function elementResult(element) {
    return new ReadResult(element);
}

function elementResultWithMessages(element, messages) {
    return new ReadResult(element, null, messages);
}

function ReadResult(element, extra, messages) {
    this.value = element || [];
    this.extra = extra || [];
    this._result = new Result({
        element: this.value,
        extra: extra
    }, messages);
    this.messages = this._result.messages;
}

ReadResult.prototype.toExtra = function() {
    return new ReadResult(null, joinElements(this.extra, this.value), this.messages);
};

ReadResult.prototype.insertExtra = function() {
    var extra = this.extra;
    if (extra && extra.length) {
        return new ReadResult(joinElements(this.value, extra), null, this.messages);
    } else {
        return this;
    }
};

ReadResult.prototype.map = function(func) {
    var result = this._result.map(function(value) {
        return func(value.element);
    });
    return new ReadResult(result.value, this.extra, result.messages);
};

ReadResult.prototype.flatMap = function(func) {
    var result = this._result.flatMap(function(value) {
        return func(value.element)._result;
    });
    return new ReadResult(result.value.element, joinElements(this.extra, result.value.extra), result.messages);
};

ReadResult.map = function(first, second, func) {
    return new ReadResult(
        func(first.value, second.value),
        joinElements(first.extra, second.extra),
        first.messages.concat(second.messages)
    );
};

function combineResults(results) {
    var result = Result.combine(_.pluck(results, "_result"));
    return new ReadResult(
        _.flatten(_.pluck(result.value, "element")),
        _.filter(_.flatten(_.pluck(result.value, "extra")), identity),
        result.messages
    );
}

function joinElements(first, second) {
    return _.flatten([first, second]);
}

function identity(value) {
    return value;
}

},{"../documents":4,"../results":25,"../transforms":30,"../xml":35,"./uris":16,"dingbat-to-unicode":85,"underscore":102}],6:[function(require,module,exports){
var documents = require("../documents");
var Result = require("../results").Result;

function createCommentsReader(bodyReader) {
    function readCommentsXml(element) {
        return Result.combine(element.getElementsByTagName("w:comment")
            .map(readCommentElement));
    }

    function readCommentElement(element) {
        var id = element.attributes["w:id"];

        function readOptionalAttribute(name) {
            return (element.attributes[name] || "").trim() || null;
        }

        return bodyReader.readXmlElements(element.children)
            .map(function(body) {
                return documents.comment({
                    commentId: id,
                    body: body,
                    authorName: readOptionalAttribute("w:author"),
                    authorInitials: readOptionalAttribute("w:initials")
                });
            });
    }
    
    return readCommentsXml;
}

exports.createCommentsReader = createCommentsReader;

},{"../documents":4,"../results":25}],7:[function(require,module,exports){
exports.readContentTypesFromXml = readContentTypesFromXml;

var fallbackContentTypes = {
    "png": "png",
    "gif": "gif",
    "jpeg": "jpeg",
    "jpg": "jpeg",
    "tif": "tiff",
    "tiff": "tiff",
    "bmp": "bmp"
};

exports.defaultContentTypes = contentTypes({}, {});


function readContentTypesFromXml(element) {
    var extensionDefaults = {};
    var overrides = {};
    
    element.children.forEach(function(child) {
        if (child.name === "content-types:Default") {
            extensionDefaults[child.attributes.Extension] = child.attributes.ContentType;
        }
        if (child.name === "content-types:Override") {
            var name = child.attributes.PartName;
            if (name.charAt(0) === "/") {
                name = name.substring(1);
            }
            overrides[name] = child.attributes.ContentType;
        }
    });
    return contentTypes(overrides, extensionDefaults);
}

function contentTypes(overrides, extensionDefaults) {
    return {
        findContentType: function(path) {
            var overrideContentType = overrides[path];
            if (overrideContentType) {
                return overrideContentType;
            } else {
                var pathParts = path.split(".");
                var extension = pathParts[pathParts.length - 1];
                if (extensionDefaults.hasOwnProperty(extension)) {
                    return extensionDefaults[extension];
                } else {
                    var fallback = fallbackContentTypes[extension.toLowerCase()];
                    if (fallback) {
                        return "image/" + fallback;
                    } else {
                        return null;
                    }
                }
            }
        }
    };
    
}

},{}],8:[function(require,module,exports){
exports.DocumentXmlReader = DocumentXmlReader;

var documents = require("../documents");
var Result = require("../results").Result;


function DocumentXmlReader(options) {
    var bodyReader = options.bodyReader;

    function convertXmlToDocument(element) {
        var body = element.first("w:body");

        if (body == null) {
            throw new Error("Could not find the body element: are you sure this is a docx file?");
        }

        var result = bodyReader.readXmlElements(body.children)
            .map(function(children) {
                return new documents.Document(children, {
                    notes: options.notes,
                    comments: options.comments
                });
            });
        return new Result(result.value, result.messages);
    }

    return {
        convertXmlToDocument: convertXmlToDocument
    };
}

},{"../documents":4,"../results":25}],9:[function(require,module,exports){
exports.read = read;
exports._findPartPaths = findPartPaths;

var promises = require("../promises");
var documents = require("../documents");
var Result = require("../results").Result;
var zipfile = require("../zipfile");

var readXmlFromZipFile = require("./office-xml-reader").readXmlFromZipFile;
var createBodyReader = require("./body-reader").createBodyReader;
var DocumentXmlReader = require("./document-xml-reader").DocumentXmlReader;
var relationshipsReader = require("./relationships-reader");
var contentTypesReader = require("./content-types-reader");
var numberingXml = require("./numbering-xml");
var stylesReader = require("./styles-reader");
var notesReader = require("./notes-reader");
var commentsReader = require("./comments-reader");
var Files = require("./files").Files;


function read(docxFile, input, options) {
    input = input || {};
    options = options || {};

    var files = new Files({
        externalFileAccess: options.externalFileAccess,
        relativeToFile: input.path
    });

    return promises.props({
        contentTypes: readContentTypesFromZipFile(docxFile),
        partPaths: findPartPaths(docxFile),
        docxFile: docxFile,
        files: files
    }).also(function(result) {
        return {
            styles: readStylesFromZipFile(docxFile, result.partPaths.styles)
        };
    }).also(function(result) {
        return {
            numbering: readNumberingFromZipFile(docxFile, result.partPaths.numbering, result.styles)
        };
    }).also(function(result) {
        return {
            footnotes: readXmlFileWithBody(result.partPaths.footnotes, result, function(bodyReader, xml) {
                if (xml) {
                    return notesReader.createFootnotesReader(bodyReader)(xml);
                } else {
                    return new Result([]);
                }
            }),
            endnotes: readXmlFileWithBody(result.partPaths.endnotes, result, function(bodyReader, xml) {
                if (xml) {
                    return notesReader.createEndnotesReader(bodyReader)(xml);
                } else {
                    return new Result([]);
                }
            }),
            comments: readXmlFileWithBody(result.partPaths.comments, result, function(bodyReader, xml) {
                if (xml) {
                    return commentsReader.createCommentsReader(bodyReader)(xml);
                } else {
                    return new Result([]);
                }
            })
        };
    }).also(function(result) {
        return {
            notes: result.footnotes.flatMap(function(footnotes) {
                return result.endnotes.map(function(endnotes) {
                    return new documents.Notes(footnotes.concat(endnotes));
                });
            })
        };
    }).then(function(result) {
        return readXmlFileWithBody(result.partPaths.mainDocument, result, function(bodyReader, xml) {
            return result.notes.flatMap(function(notes) {
                return result.comments.flatMap(function(comments) {
                    var reader = new DocumentXmlReader({
                        bodyReader: bodyReader,
                        notes: notes,
                        comments: comments
                    });
                    return reader.convertXmlToDocument(xml);
                });
            });
        });
    });
}

function findPartPaths(docxFile) {
    return readPackageRelationships(docxFile).then(function(packageRelationships) {
        var mainDocumentPath = findPartPath({
            docxFile: docxFile,
            relationships: packageRelationships,
            relationshipType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
            basePath: "",
            fallbackPath: "word/document.xml"
        });

        if (!docxFile.exists(mainDocumentPath)) {
            throw new Error("Could not find main document part. Are you sure this is a valid .docx file?");
        }

        return xmlFileReader({
            filename: relationshipsFilename(mainDocumentPath),
            readElement: relationshipsReader.readRelationships,
            defaultValue: relationshipsReader.defaultValue
        })(docxFile).then(function(documentRelationships) {
            function findPartRelatedToMainDocument(name) {
                return findPartPath({
                    docxFile: docxFile,
                    relationships: documentRelationships,
                    relationshipType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/" + name,
                    basePath: zipfile.splitPath(mainDocumentPath).dirname,
                    fallbackPath: "word/" + name + ".xml"
                });
            }

            return {
                mainDocument: mainDocumentPath,
                comments: findPartRelatedToMainDocument("comments"),
                endnotes: findPartRelatedToMainDocument("endnotes"),
                footnotes: findPartRelatedToMainDocument("footnotes"),
                numbering: findPartRelatedToMainDocument("numbering"),
                styles: findPartRelatedToMainDocument("styles")
            };
        });
    });
}

function findPartPath(options) {
    var docxFile = options.docxFile;
    var relationships = options.relationships;
    var relationshipType = options.relationshipType;
    var basePath = options.basePath;
    var fallbackPath = options.fallbackPath;

    var targets = relationships.findTargetsByType(relationshipType);
    var normalisedTargets = targets.map(function(target) {
        return stripPrefix(zipfile.joinPath(basePath, target), "/");
    });
    var validTargets = normalisedTargets.filter(function(target) {
        return docxFile.exists(target);
    });
    if (validTargets.length === 0) {
        return fallbackPath;
    } else {
        return validTargets[0];
    }
}

function stripPrefix(value, prefix) {
    if (value.substring(0, prefix.length) === prefix) {
        return value.substring(prefix.length);
    } else {
        return value;
    }
}

function xmlFileReader(options) {
    return function(zipFile) {
        return readXmlFromZipFile(zipFile, options.filename)
            .then(function(element) {
                return element ? options.readElement(element) : options.defaultValue;
            });
    };
}

function readXmlFileWithBody(filename, options, func) {
    var readRelationshipsFromZipFile = xmlFileReader({
        filename: relationshipsFilename(filename),
        readElement: relationshipsReader.readRelationships,
        defaultValue: relationshipsReader.defaultValue
    });

    return readRelationshipsFromZipFile(options.docxFile).then(function(relationships) {
        var bodyReader = new createBodyReader({
            relationships: relationships,
            contentTypes: options.contentTypes,
            docxFile: options.docxFile,
            numbering: options.numbering,
            styles: options.styles,
            files: options.files
        });
        return readXmlFromZipFile(options.docxFile, filename)
            .then(function(xml) {
                return func(bodyReader, xml);
            });
    });
}

function relationshipsFilename(filename) {
    var split = zipfile.splitPath(filename);
    return zipfile.joinPath(split.dirname, "_rels", split.basename + ".rels");
}

var readContentTypesFromZipFile = xmlFileReader({
    filename: "[Content_Types].xml",
    readElement: contentTypesReader.readContentTypesFromXml,
    defaultValue: contentTypesReader.defaultContentTypes
});

function readNumberingFromZipFile(zipFile, path, styles) {
    return xmlFileReader({
        filename: path,
        readElement: function(element) {
            return numberingXml.readNumberingXml(element, {styles: styles});
        },
        defaultValue: numberingXml.defaultNumbering
    })(zipFile);
}

function readStylesFromZipFile(zipFile, path) {
    return xmlFileReader({
        filename: path,
        readElement: stylesReader.readStylesXml,
        defaultValue: stylesReader.defaultStyles
    })(zipFile);
}

var readPackageRelationships = xmlFileReader({
    filename: "_rels/.rels",
    readElement: relationshipsReader.readRelationships,
    defaultValue: relationshipsReader.defaultValue
});

},{"../documents":4,"../promises":23,"../results":25,"../zipfile":40,"./body-reader":5,"./comments-reader":6,"./content-types-reader":7,"./document-xml-reader":8,"./files":1,"./notes-reader":10,"./numbering-xml":11,"./office-xml-reader":12,"./relationships-reader":13,"./styles-reader":15}],10:[function(require,module,exports){
var documents = require("../documents");
var Result = require("../results").Result;

exports.createFootnotesReader = createReader.bind(this, "footnote");
exports.createEndnotesReader = createReader.bind(this, "endnote");

function createReader(noteType, bodyReader) {
    function readNotesXml(element) {
        return Result.combine(element.getElementsByTagName("w:" + noteType)
            .filter(isFootnoteElement)
            .map(readFootnoteElement));
    }

    function isFootnoteElement(element) {
        var type = element.attributes["w:type"];
        return type !== "continuationSeparator" && type !== "separator";
    }

    function readFootnoteElement(footnoteElement) {
        var id = footnoteElement.attributes["w:id"];
        return bodyReader.readXmlElements(footnoteElement.children)
            .map(function(body) {
                return documents.Note({noteType: noteType, noteId: id, body: body});
            });
    }
    
    return readNotesXml;
}

},{"../documents":4,"../results":25}],11:[function(require,module,exports){
var _ = require("underscore");

exports.readNumberingXml = readNumberingXml;
exports.Numbering = Numbering;
exports.defaultNumbering = new Numbering({}, {});

function Numbering(nums, abstractNums, styles) {
    var allLevels = _.flatten(_.values(abstractNums).map(function(abstractNum) {
        return _.values(abstractNum.levels);
    }));

    var levelsByParagraphStyleId = _.indexBy(
        allLevels.filter(function(level) {
            return level.paragraphStyleId != null;
        }),
        "paragraphStyleId"
    );

    function findLevel(numId, level) {
        var num = nums[numId];
        if (num) {
            var abstractNum = abstractNums[num.abstractNumId];
            if (!abstractNum) {
                return null;
            } else if (abstractNum.numStyleLink == null) {
                return abstractNums[num.abstractNumId].levels[level];
            } else {
                var style = styles.findNumberingStyleById(abstractNum.numStyleLink);
                return findLevel(style.numId, level);
            }
        } else {
            return null;
        }
    }

    function findLevelByParagraphStyleId(styleId) {
        return levelsByParagraphStyleId[styleId] || null;
    }

    return {
        findLevel: findLevel,
        findLevelByParagraphStyleId: findLevelByParagraphStyleId
    };
}

function readNumberingXml(root, options) {
    if (!options || !options.styles) {
        throw new Error("styles is missing");
    }

    var abstractNums = readAbstractNums(root);
    var nums = readNums(root, abstractNums);
    return new Numbering(nums, abstractNums, options.styles);
}

function readAbstractNums(root) {
    var abstractNums = {};
    root.getElementsByTagName("w:abstractNum").forEach(function(element) {
        var id = element.attributes["w:abstractNumId"];
        abstractNums[id] = readAbstractNum(element);
    });
    return abstractNums;
}

function readAbstractNum(element) {
    var levels = {};

    // Some malformed documents define numbering levels without an index, and
    // reference the numbering using a w:numPr element without a w:ilvl child.
    // To handle such cases, we assume a level of 0 as a fallback.
    var levelWithoutIndex = null;

    element.getElementsByTagName("w:lvl").forEach(function(levelElement) {
        var levelIndex = levelElement.attributes["w:ilvl"];
        var numFmt = levelElement.firstOrEmpty("w:numFmt").attributes["w:val"];
        var isOrdered = numFmt !== "bullet";
        var paragraphStyleId = levelElement.firstOrEmpty("w:pStyle").attributes["w:val"];

        if (levelIndex === undefined) {
            levelWithoutIndex = {
                isOrdered: isOrdered,
                level: "0",
                paragraphStyleId: paragraphStyleId
            };
        } else {
            levels[levelIndex] = {
                isOrdered: isOrdered,
                level: levelIndex,
                paragraphStyleId: paragraphStyleId
            };
        }
    });

    if (levelWithoutIndex !== null && levels[levelWithoutIndex.level] === undefined) {
        levels[levelWithoutIndex.level] = levelWithoutIndex;
    }

    var numStyleLink = element.firstOrEmpty("w:numStyleLink").attributes["w:val"];

    return {levels: levels, numStyleLink: numStyleLink};
}

function readNums(root) {
    var nums = {};
    root.getElementsByTagName("w:num").forEach(function(element) {
        var numId = element.attributes["w:numId"];
        var abstractNumId = element.first("w:abstractNumId").attributes["w:val"];
        nums[numId] = {abstractNumId: abstractNumId};
    });
    return nums;
}

},{"underscore":102}],12:[function(require,module,exports){
var _ = require("underscore");

var promises = require("../promises");
var xml = require("../xml");


exports.read = read;
exports.readXmlFromZipFile = readXmlFromZipFile;

var xmlNamespaceMap = {
    // Transitional format
    "http://schemas.openxmlformats.org/wordprocessingml/2006/main": "w",
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships": "r",
    "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing": "wp",
    "http://schemas.openxmlformats.org/drawingml/2006/main": "a",
    "http://schemas.openxmlformats.org/drawingml/2006/picture": "pic",

    // Strict format
    "http://purl.oclc.org/ooxml/wordprocessingml/main": "w",
    "http://purl.oclc.org/ooxml/officeDocument/relationships": "r",
    "http://purl.oclc.org/ooxml/drawingml/wordprocessingDrawing": "wp",
    "http://purl.oclc.org/ooxml/drawingml/main": "a",
    "http://purl.oclc.org/ooxml/drawingml/picture": "pic",

    // Common
    "http://schemas.openxmlformats.org/package/2006/content-types": "content-types",
    "http://schemas.openxmlformats.org/package/2006/relationships": "relationships",
    "http://schemas.openxmlformats.org/markup-compatibility/2006": "mc",
    "urn:schemas-microsoft-com:vml": "v",
    "urn:schemas-microsoft-com:office:word": "office-word",

    // [MS-DOCX]: Word Extensions to the Office Open XML (.docx) File Format
    // https://learn.microsoft.com/en-us/openspecs/office_standards/ms-docx/b839fe1f-e1ca-4fa6-8c26-5954d0abbccd
    "http://schemas.microsoft.com/office/word/2010/wordml": "wordml"
};


function read(xmlString) {
    return xml.readString(xmlString, xmlNamespaceMap)
        .then(function(document) {
            return collapseAlternateContent(document)[0];
        });
}


function readXmlFromZipFile(docxFile, path) {
    if (docxFile.exists(path)) {
        return docxFile.read(path, "utf-8")
            .then(stripUtf8Bom)
            .then(read);
    } else {
        return promises.resolve(null);
    }
}


function stripUtf8Bom(xmlString) {
    return xmlString.replace(/^\uFEFF/g, '');
}


function collapseAlternateContent(node) {
    if (node.type === "element") {
        if (node.name === "mc:AlternateContent") {
            return node.firstOrEmpty("mc:Fallback").children;
        } else {
            node.children = _.flatten(node.children.map(collapseAlternateContent, true));
            return [node];
        }
    } else {
        return [node];
    }
}

},{"../promises":23,"../xml":35,"underscore":102}],13:[function(require,module,exports){
exports.readRelationships = readRelationships;
exports.defaultValue = new Relationships([]);
exports.Relationships = Relationships;


function readRelationships(element) {
    var relationships = [];
    element.children.forEach(function(child) {
        if (child.name === "relationships:Relationship") {
            var relationship = {
                relationshipId: child.attributes.Id,
                target: child.attributes.Target,
                type: child.attributes.Type
            };
            relationships.push(relationship);
        }
    });
    return new Relationships(relationships);
}

function Relationships(relationships) {
    var targetsByRelationshipId = {};
    relationships.forEach(function(relationship) {
        targetsByRelationshipId[relationship.relationshipId] = relationship.target;
    });

    var targetsByType = {};
    relationships.forEach(function(relationship) {
        if (!targetsByType[relationship.type]) {
            targetsByType[relationship.type] = [];
        }
        targetsByType[relationship.type].push(relationship.target);
    });

    return {
        findTargetByRelationshipId: function(relationshipId) {
            return targetsByRelationshipId[relationshipId];
        },
        findTargetsByType: function(type) {
            return targetsByType[type] || [];
        }
    };
}

},{}],14:[function(require,module,exports){
var _ = require("underscore");

var promises = require("../promises");
var xml = require("../xml");

exports.writeStyleMap = writeStyleMap;
exports.readStyleMap = readStyleMap;


var schema = "http://schemas.zwobble.org/mammoth/style-map";
var styleMapPath = "mammoth/style-map";
var styleMapAbsolutePath = "/" + styleMapPath;

function writeStyleMap(docxFile, styleMap) {
    docxFile.write(styleMapPath, styleMap);
    return updateRelationships(docxFile).then(function() {
        return updateContentTypes(docxFile);
    });
}

function updateRelationships(docxFile) {
    var path = "word/_rels/document.xml.rels";
    var relationshipsUri = "http://schemas.openxmlformats.org/package/2006/relationships";
    var relationshipElementName = "{" + relationshipsUri + "}Relationship";
    return docxFile.read(path, "utf8")
        .then(xml.readString)
        .then(function(relationshipsContainer) {
            var relationships = relationshipsContainer.children;
            addOrUpdateElement(relationships, relationshipElementName, "Id", {
                "Id": "rMammothStyleMap",
                "Type": schema,
                "Target": styleMapAbsolutePath
            });
            
            var namespaces = {"": relationshipsUri};
            return docxFile.write(path, xml.writeString(relationshipsContainer, namespaces));
        });
}

function updateContentTypes(docxFile) {
    var path = "[Content_Types].xml";
    var contentTypesUri = "http://schemas.openxmlformats.org/package/2006/content-types";
    var overrideName = "{" + contentTypesUri + "}Override";
    return docxFile.read(path, "utf8")
        .then(xml.readString)
        .then(function(typesElement) {
            var children = typesElement.children;
            addOrUpdateElement(children, overrideName, "PartName", {
                "PartName": styleMapAbsolutePath,
                "ContentType": "text/prs.mammoth.style-map"
            });
            var namespaces = {"": contentTypesUri};
            return docxFile.write(path, xml.writeString(typesElement, namespaces));
        });
}

function addOrUpdateElement(elements, name, identifyingAttribute, attributes) {
    var existingElement = _.find(elements, function(element) {
        return element.name === name &&
            element.attributes[identifyingAttribute] === attributes[identifyingAttribute];
    });
    if (existingElement) {
        existingElement.attributes = attributes;
    } else {
        elements.push(xml.element(name, attributes));
    }
}

function readStyleMap(docxFile) {
    if (docxFile.exists(styleMapPath)) {
        return docxFile.read(styleMapPath, "utf8");
    } else {
        return promises.resolve(null);
    }
}

},{"../promises":23,"../xml":35,"underscore":102}],15:[function(require,module,exports){
exports.readStylesXml = readStylesXml;
exports.Styles = Styles;
exports.defaultStyles = new Styles({}, {});

function Styles(paragraphStyles, characterStyles, tableStyles, numberingStyles) {
    return {
        findParagraphStyleById: function(styleId) {
            return paragraphStyles[styleId];
        },
        findCharacterStyleById: function(styleId) {
            return characterStyles[styleId];
        },
        findTableStyleById: function(styleId) {
            return tableStyles[styleId];
        },
        findNumberingStyleById: function(styleId) {
            return numberingStyles[styleId];
        }
    };
}

Styles.EMPTY = new Styles({}, {}, {}, {});

function readStylesXml(root) {
    var paragraphStyles = {};
    var characterStyles = {};
    var tableStyles = {};
    var numberingStyles = {};

    var styles = {
        "paragraph": paragraphStyles,
        "character": characterStyles,
        "table": tableStyles,
        "numbering": numberingStyles
    };

    root.getElementsByTagName("w:style").forEach(function(styleElement) {
        var style = readStyleElement(styleElement);
        var styleSet = styles[style.type];

        // Per 17.7.4.17 style (Style Definition) of ECMA-376 4th edition Part 1:
        //
        // > If multiple style definitions each declare the same value for their
        // > styleId, then the first such instance shall keep its current
        // > identifier with all other instances being reassigned in any manner
        // > desired.
        //
        // For the purpose of conversion, there's no point holding onto styles
        // with reassigned style IDs, so we ignore such style definitions.

        if (styleSet && styleSet[style.styleId] === undefined) {
            styleSet[style.styleId] = style;
        }
    });

    return new Styles(paragraphStyles, characterStyles, tableStyles, numberingStyles);
}

function readStyleElement(styleElement) {
    var type = styleElement.attributes["w:type"];

    if (type === "numbering") {
        return readNumberingStyleElement(type, styleElement);
    } else {
        var styleId = readStyleId(styleElement);
        var name = styleName(styleElement);
        return {type: type, styleId: styleId, name: name};
    }
}

function styleName(styleElement) {
    var nameElement = styleElement.first("w:name");
    return nameElement ? nameElement.attributes["w:val"] : null;
}

function readNumberingStyleElement(type, styleElement) {
    var styleId = readStyleId(styleElement);

    var numId = styleElement
        .firstOrEmpty("w:pPr")
        .firstOrEmpty("w:numPr")
        .firstOrEmpty("w:numId")
        .attributes["w:val"];

    return {type: type, numId: numId, styleId: styleId};
}

function readStyleId(styleElement) {
    return styleElement.attributes["w:styleId"];
}

},{}],16:[function(require,module,exports){
exports.uriToZipEntryName = uriToZipEntryName;
exports.replaceFragment = replaceFragment;

function uriToZipEntryName(base, uri) {
    if (uri.charAt(0) === "/") {
        return uri.substr(1);
    } else {
        // In general, we should check first and second for trailing and leading slashes,
        // but in our specific case this seems to be sufficient
        return base + "/" + uri;
    }
}


function replaceFragment(uri, fragment) {
    var hashIndex = uri.indexOf("#");
    if (hashIndex !== -1) {
        uri = uri.substring(0, hashIndex);
    }
    return uri + "#" + fragment;
}

},{}],17:[function(require,module,exports){
var htmlPaths = require("../styles/html-paths");


function nonFreshElement(tagName, attributes, children) {
    return elementWithTag(
        htmlPaths.element(tagName, attributes, {fresh: false}),
        children);
}

function freshElement(tagName, attributes, children) {
    var tag = htmlPaths.element(tagName, attributes, {fresh: true});
    return elementWithTag(tag, children);
}

function elementWithTag(tag, children) {
    return {
        type: "element",
        tag: tag,
        children: children || []
    };
}

function text(value) {
    return {
        type: "text",
        value: value
    };
}

var forceWrite = {
    type: "forceWrite"
};

exports.freshElement = freshElement;
exports.nonFreshElement = nonFreshElement;
exports.elementWithTag = elementWithTag;
exports.text = text;
exports.forceWrite = forceWrite;

var voidTagNames = {
    "br": true,
    "hr": true,
    "img": true,
    "input": true
};

function isVoidElement(node) {
    return (node.children.length === 0) && voidTagNames[node.tag.tagName];
}

exports.isVoidElement = isVoidElement;

},{"../styles/html-paths":28}],18:[function(require,module,exports){
var ast = require("./ast");

exports.freshElement = ast.freshElement;
exports.nonFreshElement = ast.nonFreshElement;
exports.elementWithTag = ast.elementWithTag;
exports.text = ast.text;
exports.forceWrite = ast.forceWrite;

exports.simplify = require("./simplify");

function write(writer, nodes) {
    nodes.forEach(function(node) {
        writeNode(writer, node);
    });
}

function writeNode(writer, node) {
    toStrings[node.type](writer, node);
}

var toStrings = {
    element: generateElementString,
    text: generateTextString,
    forceWrite: function() { }
};

function generateElementString(writer, node) {
    if (ast.isVoidElement(node)) {
        writer.selfClosing(node.tag.tagName, node.tag.attributes);
    } else {
        writer.open(node.tag.tagName, node.tag.attributes);
        write(writer, node.children);
        writer.close(node.tag.tagName);
    }
}

function generateTextString(writer, node) {
    writer.text(node.value);
}

exports.write = write;

},{"./ast":17,"./simplify":19}],19:[function(require,module,exports){
var _ = require("underscore");

var ast = require("./ast");

function simplify(nodes) {
    return collapse(removeEmpty(nodes));
}

function collapse(nodes) {
    var children = [];
    
    nodes.map(collapseNode).forEach(function(child) {
        appendChild(children, child);
    });
    return children;
}

function collapseNode(node) {
    return collapsers[node.type](node);
}

var collapsers = {
    element: collapseElement,
    text: identity,
    forceWrite: identity
};

function collapseElement(node) {
    return ast.elementWithTag(node.tag, collapse(node.children));
}

function identity(value) {
    return value;
}

function appendChild(children, child) {
    var lastChild = children[children.length - 1];
    if (child.type === "element" && !child.tag.fresh && lastChild && lastChild.type === "element" && child.tag.matchesElement(lastChild.tag)) {
        if (child.tag.separator) {
            appendChild(lastChild.children, ast.text(child.tag.separator));
        }
        child.children.forEach(function(grandChild) {
            // Mutation is fine since simplifying elements create a copy of the children.
            appendChild(lastChild.children, grandChild);
        });
    } else {
        children.push(child);
    }
}

function removeEmpty(nodes) {
    return flatMap(nodes, function(node) {
        return emptiers[node.type](node);
    });
}

function flatMap(values, func) {
    return _.flatten(_.map(values, func), true);
}

var emptiers = {
    element: elementEmptier,
    text: textEmptier,
    forceWrite: neverEmpty
};

function neverEmpty(node) {
    return [node];
}

function elementEmptier(element) {
    var children = removeEmpty(element.children);
    if (children.length === 0 && !ast.isVoidElement(element)) {
        return [];
    } else {
        return [ast.elementWithTag(element.tag, children)];
    }
}

function textEmptier(node) {
    if (node.value.length === 0) {
        return [];
    } else {
        return [node];
    }
}

module.exports = simplify;

},{"./ast":17,"underscore":102}],20:[function(require,module,exports){
var _ = require("underscore");

var promises = require("./promises");
var Html = require("./html");

exports.imgElement = imgElement;

function imgElement(func) {
    return function(element, messages) {
        return promises.when(func(element)).then(function(result) {
            var attributes = {};
            if (element.altText) {
                attributes.alt = element.altText;
            }
            _.extend(attributes, result);

            return [Html.freshElement("img", attributes)];
        });
    };
}

// Undocumented, but retained for backwards-compatibility with 0.3.x
exports.inline = exports.imgElement;

exports.dataUri = imgElement(function(element) {
    return element.readAsBase64String().then(function(imageBuffer) {
        return {
            src: "data:" + element.contentType + ";base64," + imageBuffer
        };
    });
});

},{"./html":18,"./promises":23,"underscore":102}],21:[function(require,module,exports){
(function (Buffer){
var _ = require("underscore");

var docxReader = require("./docx/docx-reader");
var docxStyleMap = require("./docx/style-map");
var DocumentConverter = require("./document-to-html").DocumentConverter;
var convertElementToRawText = require("./raw-text").convertElementToRawText;
var readStyle = require("./style-reader").readStyle;
var readOptions = require("./options-reader").readOptions;
var unzip = require("./unzip");
var Result = require("./results").Result;

exports.convertToHtml = convertToHtml;
exports.convertToMarkdown = convertToMarkdown;
exports.convert = convert;
exports.extractRawText = extractRawText;
exports.images = require("./images");
exports.transforms = require("./transforms");
exports.underline = require("./underline");
exports.embedStyleMap = embedStyleMap;
exports.readEmbeddedStyleMap = readEmbeddedStyleMap;

function convertToHtml(input, options) {
    return convert(input, options);
}

function convertToMarkdown(input, options) {
    var markdownOptions = Object.create(options || {});
    markdownOptions.outputFormat = "markdown";
    return convert(input, markdownOptions);
}

function convert(input, options) {
    options = readOptions(options);

    return unzip.openZip(input)
        .tap(function(docxFile) {
            return docxStyleMap.readStyleMap(docxFile).then(function(styleMap) {
                options.embeddedStyleMap = styleMap;
            });
        })
        .then(function(docxFile) {
            return docxReader.read(docxFile, input, options)
                .then(function(documentResult) {
                    return documentResult.map(options.transformDocument);
                })
                .then(function(documentResult) {
                    return convertDocumentToHtml(documentResult, options);
                });
        });
}

function readEmbeddedStyleMap(input) {
    return unzip.openZip(input)
        .then(docxStyleMap.readStyleMap);
}

function convertDocumentToHtml(documentResult, options) {
    var styleMapResult = parseStyleMap(options.readStyleMap());
    var parsedOptions = _.extend({}, options, {
        styleMap: styleMapResult.value
    });
    var documentConverter = new DocumentConverter(parsedOptions);

    return documentResult.flatMapThen(function(document) {
        return styleMapResult.flatMapThen(function(styleMap) {
            return documentConverter.convertToHtml(document);
        });
    });
}

function parseStyleMap(styleMap) {
    return Result.combine((styleMap || []).map(readStyle))
        .map(function(styleMap) {
            return styleMap.filter(function(styleMapping) {
                return !!styleMapping;
            });
        });
}


function extractRawText(input) {
    return unzip.openZip(input)
        .then(docxReader.read)
        .then(function(documentResult) {
            return documentResult.map(convertElementToRawText);
        });
}

function embedStyleMap(input, styleMap) {
    return unzip.openZip(input)
        .tap(function(docxFile) {
            return docxStyleMap.writeStyleMap(docxFile, styleMap);
        })
        .then(function(docxFile) {
            return docxFile.toArrayBuffer();
        })
        .then(function(arrayBuffer) {
            return {
                toArrayBuffer: function() {
                    return arrayBuffer;
                },
                toBuffer: function() {
                    return Buffer.from(arrayBuffer);
                }
            };
        });
}

exports.styleMapping = function() {
    throw new Error('Use a raw string instead of mammoth.styleMapping e.g. "p[style-name=\'Title\'] => h1" instead of mammoth.styleMapping("p[style-name=\'Title\'] => h1")');
};

}).call(this,require("buffer").Buffer)
},{"./document-to-html":3,"./docx/docx-reader":9,"./docx/style-map":14,"./images":20,"./options-reader":22,"./raw-text":24,"./results":25,"./style-reader":26,"./transforms":30,"./underline":31,"./unzip":2,"buffer":83,"underscore":102}],22:[function(require,module,exports){
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

},{"underscore":102}],23:[function(require,module,exports){
var _ = require("underscore");
var bluebird = require("bluebird/js/release/promise")();

exports.defer = defer;
exports.when = bluebird.resolve;
exports.resolve = bluebird.resolve;
exports.all = bluebird.all;
exports.props = bluebird.props;
exports.reject = bluebird.reject;
exports.promisify = bluebird.promisify;
exports.mapSeries = bluebird.mapSeries;
exports.attempt = bluebird.attempt;

exports.nfcall = function(func) {
    var args = Array.prototype.slice.call(arguments, 1);
    var promisedFunc = bluebird.promisify(func);
    return promisedFunc.apply(null, args);
};

bluebird.prototype.fail = bluebird.prototype.caught;

bluebird.prototype.also = function(func) {
    return this.then(function(value) {
        var returnValue = _.extend({}, value, func(value));
        return bluebird.props(returnValue);
    });
};

function defer() {
    var resolve;
    var reject;
    var promise = new bluebird.Promise(function(resolveArg, rejectArg) {
        resolve = resolveArg;
        reject = rejectArg;
    });

    return {
        resolve: resolve,
        reject: reject,
        promise: promise
    };
}

},{"bluebird/js/release/promise":68,"underscore":102}],24:[function(require,module,exports){
var documents = require("./documents");

function convertElementToRawText(element) {
    if (element.type === "text") {
        return element.value;
    } else if (element.type === documents.types.tab) {
        return "\t";
    } else {
        var tail = element.type === "paragraph" ? "\n\n" : "";
        return (element.children || []).map(convertElementToRawText).join("") + tail;
    }
}

exports.convertElementToRawText = convertElementToRawText;

},{"./documents":4}],25:[function(require,module,exports){
var _ = require("underscore");


exports.Result = Result;
exports.success = success;
exports.warning = warning;
exports.error = error;


function Result(value, messages) {
    this.value = value;
    this.messages = messages || [];
}

Result.prototype.map = function(func) {
    return new Result(func(this.value), this.messages);
};

Result.prototype.flatMap = function(func) {
    var funcResult = func(this.value);
    return new Result(funcResult.value, combineMessages([this, funcResult]));
};

Result.prototype.flatMapThen = function(func) {
    var that = this;
    return func(this.value).then(function(otherResult) {
        return new Result(otherResult.value, combineMessages([that, otherResult]));
    });
};

Result.combine = function(results) {
    var values = _.flatten(_.pluck(results, "value"));
    var messages = combineMessages(results);
    return new Result(values, messages);
};

function success(value) {
    return new Result(value, []);
}

function warning(message) {
    return {
        type: "warning",
        message: message
    };
}

function error(exception) {
    return {
        type: "error",
        message: exception.message,
        error: exception
    };
}

function combineMessages(results) {
    var messages = [];
    _.flatten(_.pluck(results, "messages"), true).forEach(function(message) {
        if (!containsMessage(messages, message)) {
            messages.push(message);
        }
    });
    return messages;
}

function containsMessage(messages, message) {
    return _.find(messages, isSameMessage.bind(null, message)) !== undefined;
}

function isSameMessage(first, second) {
    return first.type === second.type && first.message === second.message;
}

},{"underscore":102}],26:[function(require,module,exports){
var _ = require("underscore");
var lop = require("lop");

var documentMatchers = require("./styles/document-matchers");
var htmlPaths = require("./styles/html-paths");
var tokenise = require("./styles/parser/tokeniser").tokenise;
var results = require("./results");

exports.readHtmlPath = readHtmlPath;
exports.readDocumentMatcher = readDocumentMatcher;
exports.readStyle = readStyle;


function readStyle(string) {
    return parseString(styleRule, string);
}

function createStyleRule() {
    return lop.rules.sequence(
        lop.rules.sequence.capture(documentMatcherRule()),
        lop.rules.tokenOfType("whitespace"),
        lop.rules.tokenOfType("arrow"),
        lop.rules.sequence.capture(lop.rules.optional(lop.rules.sequence(
            lop.rules.tokenOfType("whitespace"),
            lop.rules.sequence.capture(htmlPathRule())
        ).head())),
        lop.rules.tokenOfType("end")
    ).map(function(documentMatcher, htmlPath) {
        return {
            from: documentMatcher,
            to: htmlPath.valueOrElse(htmlPaths.empty)
        };
    });
}

function readDocumentMatcher(string) {
    return parseString(documentMatcherRule(), string);
}

function documentMatcherRule() {
    var sequence = lop.rules.sequence;

    var identifierToConstant = function(identifier, constant) {
        return lop.rules.then(
            lop.rules.token("identifier", identifier),
            function() {
                return constant;
            }
        );
    };

    var paragraphRule = identifierToConstant("p", documentMatchers.paragraph);
    var runRule = identifierToConstant("r", documentMatchers.run);

    var elementTypeRule = lop.rules.firstOf("p or r or table",
        paragraphRule,
        runRule
    );

    var styleIdRule = lop.rules.sequence(
        lop.rules.tokenOfType("dot"),
        lop.rules.sequence.cut(),
        lop.rules.sequence.capture(identifierRule)
    ).map(function(styleId) {
        return {styleId: styleId};
    });

    var styleNameMatcherRule = lop.rules.firstOf("style name matcher",
        lop.rules.then(
            lop.rules.sequence(
                lop.rules.tokenOfType("equals"),
                lop.rules.sequence.cut(),
                lop.rules.sequence.capture(stringRule)
            ).head(),
            function(styleName) {
                return {styleName: documentMatchers.equalTo(styleName)};
            }
        ),
        lop.rules.then(
            lop.rules.sequence(
                lop.rules.tokenOfType("startsWith"),
                lop.rules.sequence.cut(),
                lop.rules.sequence.capture(stringRule)
            ).head(),
            function(styleName) {
                return {styleName: documentMatchers.startsWith(styleName)};
            }
        )
    );

    var styleNameRule = lop.rules.sequence(
        lop.rules.tokenOfType("open-square-bracket"),
        lop.rules.sequence.cut(),
        lop.rules.token("identifier", "style-name"),
        lop.rules.sequence.capture(styleNameMatcherRule),
        lop.rules.tokenOfType("close-square-bracket")
    ).head();


    var listTypeRule = lop.rules.firstOf("list type",
        identifierToConstant("ordered-list", {isOrdered: true}),
        identifierToConstant("unordered-list", {isOrdered: false})
    );
    var listRule = sequence(
        lop.rules.tokenOfType("colon"),
        sequence.capture(listTypeRule),
        sequence.cut(),
        lop.rules.tokenOfType("open-paren"),
        sequence.capture(integerRule),
        lop.rules.tokenOfType("close-paren")
    ).map(function(listType, levelNumber) {
        return {
            list: {
                isOrdered: listType.isOrdered,
                levelIndex: levelNumber - 1
            }
        };
    });

    function createMatcherSuffixesRule(rules) {
        var matcherSuffix = lop.rules.firstOf.apply(
            lop.rules.firstOf,
            ["matcher suffix"].concat(rules)
        );
        var matcherSuffixes = lop.rules.zeroOrMore(matcherSuffix);
        return lop.rules.then(matcherSuffixes, function(suffixes) {
            var matcherOptions = {};
            suffixes.forEach(function(suffix) {
                _.extend(matcherOptions, suffix);
            });
            return matcherOptions;
        });
    }

    var paragraphOrRun = sequence(
        sequence.capture(elementTypeRule),
        sequence.capture(createMatcherSuffixesRule([
            styleIdRule,
            styleNameRule,
            listRule
        ]))
    ).map(function(createMatcher, matcherOptions) {
        return createMatcher(matcherOptions);
    });

    var table = sequence(
        lop.rules.token("identifier", "table"),
        sequence.capture(createMatcherSuffixesRule([
            styleIdRule,
            styleNameRule
        ]))
    ).map(function(options) {
        return documentMatchers.table(options);
    });

    var bold = identifierToConstant("b", documentMatchers.bold);
    var italic = identifierToConstant("i", documentMatchers.italic);
    var underline = identifierToConstant("u", documentMatchers.underline);
    var strikethrough = identifierToConstant("strike", documentMatchers.strikethrough);
    var allCaps = identifierToConstant("all-caps", documentMatchers.allCaps);
    var smallCaps = identifierToConstant("small-caps", documentMatchers.smallCaps);

    var highlight = sequence(
        lop.rules.token("identifier", "highlight"),
        lop.rules.sequence.capture(lop.rules.optional(lop.rules.sequence(
            lop.rules.tokenOfType("open-square-bracket"),
            lop.rules.sequence.cut(),
            lop.rules.token("identifier", "color"),
            lop.rules.tokenOfType("equals"),
            lop.rules.sequence.capture(stringRule),
            lop.rules.tokenOfType("close-square-bracket")
        ).head()))
    ).map(function(color) {
        return documentMatchers.highlight({
            color: color.valueOrElse(undefined)
        });
    });

    var commentReference = identifierToConstant("comment-reference", documentMatchers.commentReference);

    var breakMatcher = sequence(
        lop.rules.token("identifier", "br"),
        sequence.cut(),
        lop.rules.tokenOfType("open-square-bracket"),
        lop.rules.token("identifier", "type"),
        lop.rules.tokenOfType("equals"),
        sequence.capture(stringRule),
        lop.rules.tokenOfType("close-square-bracket")
    ).map(function(breakType) {
        switch (breakType) {
        case "line":
            return documentMatchers.lineBreak;
        case "page":
            return documentMatchers.pageBreak;
        case "column":
            return documentMatchers.columnBreak;
        default:
            // TODO: handle unknown document matchers
        }
    });

    return lop.rules.firstOf("element type",
        paragraphOrRun,
        table,
        bold,
        italic,
        underline,
        strikethrough,
        allCaps,
        smallCaps,
        highlight,
        commentReference,
        breakMatcher
    );
}

function readHtmlPath(string) {
    return parseString(htmlPathRule(), string);
}

function htmlPathRule() {
    var capture = lop.rules.sequence.capture;
    var whitespaceRule = lop.rules.tokenOfType("whitespace");
    var freshRule = lop.rules.then(
        lop.rules.optional(lop.rules.sequence(
            lop.rules.tokenOfType("colon"),
            lop.rules.token("identifier", "fresh")
        )),
        function(option) {
            return option.map(function() {
                return true;
            }).valueOrElse(false);
        }
    );

    var separatorRule = lop.rules.then(
        lop.rules.optional(lop.rules.sequence(
            lop.rules.tokenOfType("colon"),
            lop.rules.token("identifier", "separator"),
            lop.rules.tokenOfType("open-paren"),
            capture(stringRule),
            lop.rules.tokenOfType("close-paren")
        ).head()),
        function(option) {
            return option.valueOrElse("");
        }
    );

    var tagNamesRule = lop.rules.oneOrMoreWithSeparator(
        identifierRule,
        lop.rules.tokenOfType("choice")
    );

    var styleElementRule = lop.rules.sequence(
        capture(tagNamesRule),
        capture(lop.rules.zeroOrMore(attributeOrClassRule)),
        capture(freshRule),
        capture(separatorRule)
    ).map(function(tagName, attributesList, fresh, separator) {
        var attributes = {};
        var options = {};
        attributesList.forEach(function(attribute) {
            if (attribute.append && attributes[attribute.name]) {
                attributes[attribute.name] += " " + attribute.value;
            } else {
                attributes[attribute.name] = attribute.value;
            }
        });
        if (fresh) {
            options.fresh = true;
        }
        if (separator) {
            options.separator = separator;
        }
        return htmlPaths.element(tagName, attributes, options);
    });

    return lop.rules.firstOf("html path",
        lop.rules.then(lop.rules.tokenOfType("bang"), function() {
            return htmlPaths.ignore;
        }),
        lop.rules.then(
            lop.rules.zeroOrMoreWithSeparator(
                styleElementRule,
                lop.rules.sequence(
                    whitespaceRule,
                    lop.rules.tokenOfType("gt"),
                    whitespaceRule
                )
            ),
            htmlPaths.elements
        )
    );
}

var identifierRule = lop.rules.then(
    lop.rules.tokenOfType("identifier"),
    decodeEscapeSequences
);
var integerRule = lop.rules.tokenOfType("integer");

var stringRule = lop.rules.then(
    lop.rules.tokenOfType("string"),
    decodeEscapeSequences
);

var escapeSequences = {
    "n": "\n",
    "r": "\r",
    "t": "\t"
};

function decodeEscapeSequences(value) {
    return value.replace(/\\(.)/g, function(match, code) {
        return escapeSequences[code] || code;
    });
}

var attributeRule = lop.rules.sequence(
    lop.rules.tokenOfType("open-square-bracket"),
    lop.rules.sequence.cut(),
    lop.rules.sequence.capture(identifierRule),
    lop.rules.tokenOfType("equals"),
    lop.rules.sequence.capture(stringRule),
    lop.rules.tokenOfType("close-square-bracket")
).map(function(name, value) {
    return {name: name, value: value, append: false};
});

var classRule = lop.rules.sequence(
    lop.rules.tokenOfType("dot"),
    lop.rules.sequence.cut(),
    lop.rules.sequence.capture(identifierRule)
).map(function(className) {
    return {name: "class", value: className, append: true};
});

var attributeOrClassRule = lop.rules.firstOf(
    "attribute or class",
    attributeRule,
    classRule
);

function parseString(rule, string) {
    var tokens = tokenise(string);
    var parser = lop.Parser();
    var parseResult = parser.parseTokens(rule, tokens);
    if (parseResult.isSuccess()) {
        return results.success(parseResult.value());
    } else {
        return new results.Result(null, [results.warning(describeFailure(string, parseResult))]);
    }
}

function describeFailure(input, parseResult) {
    return "Did not understand this style mapping, so ignored it: " + input + "\n" +
        parseResult.errors().map(describeError).join("\n");
}

function describeError(error) {
    return "Error was at character number " + error.characterNumber() + ": " +
        "Expected " + error.expected + " but got " + error.actual;
}

var styleRule = createStyleRule();

},{"./results":25,"./styles/document-matchers":27,"./styles/html-paths":28,"./styles/parser/tokeniser":29,"lop":89,"underscore":102}],27:[function(require,module,exports){
exports.paragraph = paragraph;
exports.run = run;
exports.table = table;
exports.bold = new Matcher("bold");
exports.italic = new Matcher("italic");
exports.underline = new Matcher("underline");
exports.strikethrough = new Matcher("strikethrough");
exports.allCaps = new Matcher("allCaps");
exports.smallCaps = new Matcher("smallCaps");
exports.highlight = highlight;
exports.commentReference = new Matcher("commentReference");
exports.lineBreak = new BreakMatcher({breakType: "line"});
exports.pageBreak = new BreakMatcher({breakType: "page"});
exports.columnBreak = new BreakMatcher({breakType: "column"});
exports.equalTo = equalTo;
exports.startsWith = startsWith;


function paragraph(options) {
    return new Matcher("paragraph", options);
}

function run(options) {
    return new Matcher("run", options);
}

function table(options) {
    return new Matcher("table", options);
}

function highlight(options) {
    return new HighlightMatcher(options);
}

function Matcher(elementType, options) {
    options = options || {};
    this._elementType = elementType;
    this._styleId = options.styleId;
    this._styleName = options.styleName;
    if (options.list) {
        this._listIndex = options.list.levelIndex;
        this._listIsOrdered = options.list.isOrdered;
    }
}

Matcher.prototype.matches = function(element) {
    return element.type === this._elementType &&
        (this._styleId === undefined || element.styleId === this._styleId) &&
        (this._styleName === undefined || (element.styleName && this._styleName.operator(this._styleName.operand, element.styleName))) &&
        (this._listIndex === undefined || isList(element, this._listIndex, this._listIsOrdered)) &&
        (this._breakType === undefined || this._breakType === element.breakType);
};

function HighlightMatcher(options) {
    options = options || {};
    this._color = options.color;
}

HighlightMatcher.prototype.matches = function(element) {
    return element.type === "highlight" &&
        (this._color === undefined || element.color === this._color);
};

function BreakMatcher(options) {
    options = options || {};
    this._breakType = options.breakType;
}

BreakMatcher.prototype.matches = function(element) {
    return element.type === "break" &&
        (this._breakType === undefined || element.breakType === this._breakType);
};

function isList(element, levelIndex, isOrdered) {
    return element.numbering &&
        element.numbering.level == levelIndex &&
        element.numbering.isOrdered == isOrdered;
}

function equalTo(value) {
    return {
        operator: operatorEqualTo,
        operand: value
    };
}

function startsWith(value) {
    return {
        operator: operatorStartsWith,
        operand: value
    };
}

function operatorEqualTo(first, second) {
    return first.toUpperCase() === second.toUpperCase();
}

function operatorStartsWith(first, second) {
    return second.toUpperCase().indexOf(first.toUpperCase()) === 0;
}

},{}],28:[function(require,module,exports){
var _ = require("underscore");

var html = require("../html");

exports.topLevelElement = topLevelElement;
exports.elements = elements;
exports.element = element;

function topLevelElement(tagName, attributes) {
    return elements([element(tagName, attributes, {fresh: true})]);
}

function elements(elementStyles) {
    return new HtmlPath(elementStyles.map(function(elementStyle) {
        if (_.isString(elementStyle)) {
            return element(elementStyle);
        } else {
            return elementStyle;
        }
    }));
}

function HtmlPath(elements) {
    this._elements = elements;
}

HtmlPath.prototype.wrap = function wrap(children) {
    var result = children();
    for (var index = this._elements.length - 1; index >= 0; index--) {
        result = this._elements[index].wrapNodes(result);
    }
    return result;
};

function element(tagName, attributes, options) {
    options = options || {};
    return new Element(tagName, attributes, options);
}

function Element(tagName, attributes, options) {
    var tagNames = {};
    if (_.isArray(tagName)) {
        tagName.forEach(function(tagName) {
            tagNames[tagName] = true;
        });
        tagName = tagName[0];
    } else {
        tagNames[tagName] = true;
    }
    
    this.tagName = tagName;
    this.tagNames = tagNames;
    this.attributes = attributes || {};
    this.fresh = options.fresh;
    this.separator = options.separator;
}

Element.prototype.matchesElement = function(element) {
    return this.tagNames[element.tagName] && _.isEqual(this.attributes || {}, element.attributes || {});
};

Element.prototype.wrap = function wrap(generateNodes) {
    return this.wrapNodes(generateNodes());
};

Element.prototype.wrapNodes = function wrapNodes(nodes) {
    return [html.elementWithTag(this, nodes)];
};

exports.empty = elements([]);
exports.ignore = {
    wrap: function() {
        return [];
    }
};

},{"../html":18,"underscore":102}],29:[function(require,module,exports){
var lop = require("lop");
var RegexTokeniser = lop.RegexTokeniser;

exports.tokenise = tokenise;

var stringPrefix = "'((?:\\\\.|[^'])*)";

function tokenise(string) {
    var identifierCharacter = "(?:[a-zA-Z\\-_]|\\\\.)";
    var tokeniser = new RegexTokeniser([
        {name: "identifier", regex: new RegExp("(" + identifierCharacter + "(?:" + identifierCharacter + "|[0-9])*)")},
        {name: "dot", regex: /\./},
        {name: "colon", regex: /:/},
        {name: "gt", regex: />/},
        {name: "whitespace", regex: /\s+/},
        {name: "arrow", regex: /=>/},
        {name: "equals", regex: /=/},
        {name: "startsWith", regex: /\^=/},
        {name: "open-paren", regex: /\(/},
        {name: "close-paren", regex: /\)/},
        {name: "open-square-bracket", regex: /\[/},
        {name: "close-square-bracket", regex: /\]/},
        {name: "string", regex: new RegExp(stringPrefix + "'")},
        {name: "unterminated-string", regex: new RegExp(stringPrefix)},
        {name: "integer", regex: /([0-9]+)/},
        {name: "choice", regex: /\|/},
        {name: "bang", regex: /(!)/}
    ]);
    return tokeniser.tokenise(string);
}

},{"lop":89}],30:[function(require,module,exports){
var _ = require("underscore");

exports.paragraph = paragraph;
exports.run = run;
exports._elements = elements;
exports._elementsOfType = elementsOfType;
exports.getDescendantsOfType = getDescendantsOfType;
exports.getDescendants = getDescendants;

function paragraph(transform) {
    return elementsOfType("paragraph", transform);
}

function run(transform) {
    return elementsOfType("run", transform);
}

function elementsOfType(elementType, transform) {
    return elements(function(element) {
        if (element.type === elementType) {
            return transform(element);
        } else {
            return element;
        }
    });
}

function elements(transform) {
    return function transformElement(element) {
        if (element.children) {
            var children = _.map(element.children, transformElement);
            element = _.extend(element, {children: children});
        }
        return transform(element);
    };
}


function getDescendantsOfType(element, type) {
    return getDescendants(element).filter(function(descendant) {
        return descendant.type === type;
    });
}

function getDescendants(element) {
    var descendants = [];

    visitDescendants(element, function(descendant) {
        descendants.push(descendant);
    });

    return descendants;
}

function visitDescendants(element, visit) {
    if (element.children) {
        element.children.forEach(function(child) {
            visitDescendants(child, visit);
            visit(child);
        });
    }
}

},{"underscore":102}],31:[function(require,module,exports){
var htmlPaths = require("./styles/html-paths");
var Html = require("./html");


exports.element = element;

function element(name) {
    return function(html) {
        return Html.elementWithTag(htmlPaths.element(name), [html]);
    };
}

},{"./html":18,"./styles/html-paths":28}],32:[function(require,module,exports){
var _ = require("underscore");

exports.writer = writer;

function writer(options) {
    options = options || {};
    if (options.prettyPrint) {
        return prettyWriter();
    } else {
        return simpleWriter();
    }
}


var indentedElements = {
    div: true,
    p: true,
    ul: true,
    li: true
};


function prettyWriter() {
    var indentationLevel = 0;
    var indentation = "  ";
    var stack = [];
    var start = true;
    var inText = false;

    var writer = simpleWriter();

    function open(tagName, attributes) {
        if (indentedElements[tagName]) {
            indent();
        }
        stack.push(tagName);
        writer.open(tagName, attributes);
        if (indentedElements[tagName]) {
            indentationLevel++;
        }
        start = false;
    }

    function close(tagName) {
        if (indentedElements[tagName]) {
            indentationLevel--;
            indent();
        }
        stack.pop();
        writer.close(tagName);
    }

    function text(value) {
        startText();
        var text = isInPre() ? value : value.replace("\n", "\n" + indentation);
        writer.text(text);
    }

    function selfClosing(tagName, attributes) {
        indent();
        writer.selfClosing(tagName, attributes);
    }

    function insideIndentedElement() {
        return stack.length === 0 || indentedElements[stack[stack.length - 1]];
    }

    function startText() {
        if (!inText) {
            indent();
            inText = true;
        }
    }

    function indent() {
        inText = false;
        if (!start && insideIndentedElement() && !isInPre()) {
            writer._append("\n");
            for (var i = 0; i < indentationLevel; i++) {
                writer._append(indentation);
            }
        }
    }

    function isInPre() {
        return _.some(stack, function(tagName) {
            return tagName === "pre";
        });
    }

    return {
        asString: writer.asString,
        open: open,
        close: close,
        text: text,
        selfClosing: selfClosing
    };
}


function simpleWriter() {
    var fragments = [];

    function open(tagName, attributes) {
        var attributeString = generateAttributeString(attributes);
        fragments.push("<" + tagName + attributeString + ">");
    }

    function close(tagName) {
        fragments.push("</" + tagName + ">");
    }

    function selfClosing(tagName, attributes) {
        var attributeString = generateAttributeString(attributes);
        fragments.push("<" + tagName + attributeString + " />");
    }

    function generateAttributeString(attributes) {
        return _.map(attributes, function(value, key) {
            return " " + key + '="' + escapeHtmlAttribute(value) + '"';
        }).join("");
    }

    function text(value) {
        fragments.push(escapeHtmlText(value));
    }

    function append(html) {
        fragments.push(html);
    }

    function asString() {
        return fragments.join("");
    }

    return {
        asString: asString,
        open: open,
        close: close,
        text: text,
        selfClosing: selfClosing,
        _append: append
    };
}

function escapeHtmlText(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeHtmlAttribute(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

},{"underscore":102}],33:[function(require,module,exports){
var htmlWriter = require("./html-writer");
var markdownWriter = require("./markdown-writer");

exports.writer = writer;


function writer(options) {
    options = options || {};
    if (options.outputFormat === "markdown") {
        return markdownWriter.writer();
    } else {
        return htmlWriter.writer(options);
    }
}

},{"./html-writer":32,"./markdown-writer":34}],34:[function(require,module,exports){
var _ = require("underscore");


function symmetricMarkdownElement(end) {
    return markdownElement(end, end);
}

function markdownElement(start, end) {
    return function() {
        return {start: start, end: end};
    };
}

function markdownLink(attributes) {
    var href = attributes.href || "";
    if (href) {
        return {
            start: "[",
            end: "](" + href + ")",
            anchorPosition: "before"
        };
    } else {
        return {};
    }
}

function markdownImage(attributes) {
    var src = attributes.src || "";
    var altText = attributes.alt || "";
    if (src || altText) {
        return {start: "![" + altText + "](" + src + ")"};
    } else {
        return {};
    }
}

function markdownList(options) {
    return function(attributes, list) {
        return {
            start: list ? "\n" : "",
            end: list ? "" : "\n",
            list: {
                isOrdered: options.isOrdered,
                indent: list ? list.indent + 1 : 0,
                count: 0
            }
        };
    };
}

function markdownListItem(attributes, list, listItem) {
    list = list || {indent: 0, isOrdered: false, count: 0};
    list.count++;
    listItem.hasClosed = false;
    
    var bullet = list.isOrdered ? list.count + "." : "-";
    var start = repeatString("\t", list.indent) + bullet + " ";
        
    return {
        start: start,
        end: function() {
            if (!listItem.hasClosed) {
                listItem.hasClosed = true;
                return "\n";
            }
        }
    };
}

var htmlToMarkdown = {
    "p": markdownElement("", "\n\n"),
    "br": markdownElement("", "  \n"),
    "ul": markdownList({isOrdered: false}),
    "ol": markdownList({isOrdered: true}),
    "li": markdownListItem,
    "strong": symmetricMarkdownElement("__"),
    "em": symmetricMarkdownElement("*"),
    "a": markdownLink,
    "img": markdownImage
};

(function() {
    for (var i = 1; i <= 6; i++) {
        htmlToMarkdown["h" + i] = markdownElement(repeatString("#", i) + " ", "\n\n");
    }
})();

function repeatString(value, count) {
    return new Array(count + 1).join(value);
}

function markdownWriter() {
    var fragments = [];
    var elementStack = [];
    var list = null;
    var listItem = {};
    
    function open(tagName, attributes) {
        attributes = attributes || {};
        
        var createElement = htmlToMarkdown[tagName] || function() {
            return {};
        };
        var element = createElement(attributes, list, listItem);
        elementStack.push({end: element.end, list: list});
        
        if (element.list) {
            list = element.list;
        }
        
        var anchorBeforeStart = element.anchorPosition === "before";
        if (anchorBeforeStart) {
            writeAnchor(attributes);
        }

        fragments.push(element.start || "");
        if (!anchorBeforeStart) {
            writeAnchor(attributes);
        }
    }
    
    function writeAnchor(attributes) {
        if (attributes.id) {
            fragments.push('<a id="' + attributes.id + '"></a>');
        }
    }
    
    function close(tagName) {
        var element = elementStack.pop();
        list = element.list;
        var end = _.isFunction(element.end) ? element.end() : element.end;
        fragments.push(end || "");
    }
    
    function selfClosing(tagName, attributes) {
        open(tagName, attributes);
        close(tagName);
    }
    
    function text(value) {
        fragments.push(escapeMarkdown(value));
    }
    
    function asString() {
        return fragments.join("");
    }

    return {
        asString: asString,
        open: open,
        close: close,
        text: text,
        selfClosing: selfClosing
    };
}

exports.writer = markdownWriter;

function escapeMarkdown(value) {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/([\`\*_\{\}\[\]\(\)\#\+\-\.\!])/g, '\\$1');
}

},{"underscore":102}],35:[function(require,module,exports){
var nodes = require("./nodes");

exports.Element = nodes.Element;
exports.element = nodes.element;
exports.emptyElement = nodes.emptyElement;
exports.text = nodes.text;
exports.readString = require("./reader").readString;
exports.writeString = require("./writer").writeString;

},{"./nodes":36,"./reader":37,"./writer":38}],36:[function(require,module,exports){
var _ = require("underscore");


exports.Element = Element;
exports.element = function(name, attributes, children) {
    return new Element(name, attributes, children);
};
exports.text = function(value) {
    return {
        type: "text",
        value: value
    };
};


var emptyElement = exports.emptyElement = {
    first: function() {
        return null;
    },
    firstOrEmpty: function() {
        return emptyElement;
    },
    attributes: {},
    children: []
};

function Element(name, attributes, children) {
    this.type = "element";
    this.name = name;
    this.attributes = attributes || {};
    this.children = children || [];
}

Element.prototype.first = function(name) {
    return _.find(this.children, function(child) {
        return child.name === name;
    });
};

Element.prototype.firstOrEmpty = function(name) {
    return this.first(name) || emptyElement;
};

Element.prototype.getElementsByTagName = function(name) {
    var elements = _.filter(this.children, function(child) {
        return child.name === name;
    });
    return toElementList(elements);
};

Element.prototype.text = function() {
    if (this.children.length === 0) {
        return "";
    } else if (this.children.length !== 1 || this.children[0].type !== "text") {
        throw new Error("Not implemented");
    }
    return this.children[0].value;
};

var elementListPrototype = {
    getElementsByTagName: function(name) {
        return toElementList(_.flatten(this.map(function(element) {
            return element.getElementsByTagName(name);
        }, true)));
    }
};

function toElementList(array) {
    return _.extend(array, elementListPrototype);
}

},{"underscore":102}],37:[function(require,module,exports){
var promises = require("../promises");
var _ = require("underscore");

var xmldom = require("./xmldom");
var nodes = require("./nodes");
var Element = nodes.Element;

exports.readString = readString;

var Node = xmldom.Node;

function readString(xmlString, namespaceMap) {
    namespaceMap = namespaceMap || {};

    try {
        var document = xmldom.parseFromString(xmlString, "text/xml");
    } catch (error) {
        return promises.reject(error);
    }

    if (document.documentElement.tagName === "parsererror") {
        return promises.resolve(new Error(document.documentElement.textContent));
    }

    function convertNode(node) {
        switch (node.nodeType) {
        case Node.ELEMENT_NODE:
            return convertElement(node);
        case Node.TEXT_NODE:
            return nodes.text(node.nodeValue);
        }
    }

    function convertElement(element) {
        var convertedName = convertName(element);

        var convertedChildren = [];
        _.forEach(element.childNodes, function(childNode) {
            var convertedNode = convertNode(childNode);
            if (convertedNode) {
                convertedChildren.push(convertedNode);
            }
        });

        var convertedAttributes = {};
        _.forEach(element.attributes, function(attribute) {
            convertedAttributes[convertName(attribute)] = attribute.value;
        });

        return new Element(convertedName, convertedAttributes, convertedChildren);
    }

    function convertName(node) {
        if (node.namespaceURI) {
            var mappedPrefix = namespaceMap[node.namespaceURI];
            var prefix;
            if (mappedPrefix) {
                prefix = mappedPrefix + ":";
            } else {
                prefix = "{" + node.namespaceURI + "}";
            }
            return prefix + node.localName;
        } else {
            return node.localName;
        }
    }

    return promises.resolve(convertNode(document.documentElement));
}

},{"../promises":23,"./nodes":36,"./xmldom":39,"underscore":102}],38:[function(require,module,exports){
var _ = require("underscore");
var xmlbuilder = require("xmlbuilder");


exports.writeString = writeString;


function writeString(root, namespaces) {
    var uriToPrefix = _.invert(namespaces);
    
    var nodeWriters = {
        element: writeElement,
        text: writeTextNode
    };

    function writeNode(builder, node) {
        return nodeWriters[node.type](builder, node);
    }

    function writeElement(builder, element) {
        var elementBuilder = builder.element(mapElementName(element.name), element.attributes);
        element.children.forEach(function(child) {
            writeNode(elementBuilder, child);
        });
    }
    
    function mapElementName(name) {
        var longFormMatch = /^\{(.*)\}(.*)$/.exec(name);
        if (longFormMatch) {
            var prefix = uriToPrefix[longFormMatch[1]];
            return prefix + (prefix === "" ? "" : ":") + longFormMatch[2];
        } else {
            return name;
        }
    }
    
    function writeDocument(root) {
        var builder = xmlbuilder
            .create(mapElementName(root.name), {
                version: '1.0',
                encoding: 'UTF-8',
                standalone: true
            });
        
        _.forEach(namespaces, function(uri, prefix) {
            var key = "xmlns" + (prefix === "" ? "" : ":" + prefix);
            builder.attribute(key, uri);
        });
        
        root.children.forEach(function(child) {
            writeNode(builder, child);
        });
        return builder.end();
    }

    return writeDocument(root);
}

function writeTextNode(builder, node) {
    builder.text(node.value);
}

},{"underscore":102,"xmlbuilder":124}],39:[function(require,module,exports){
var xmldom = require("@xmldom/xmldom");
var dom = require("@xmldom/xmldom/lib/dom");

function parseFromString(string) {
    var error = null;

    var domParser = new xmldom.DOMParser({
        errorHandler: function(level, message) {
            error = {level: level, message: message};
        }
    });

    var document = domParser.parseFromString(string);

    if (error === null) {
        return document;
    } else {
        throw new Error(error.level + ": " + error.message);
    }
}

exports.parseFromString = parseFromString;
exports.Node = dom.Node;

},{"@xmldom/xmldom":45,"@xmldom/xmldom/lib/dom":43}],40:[function(require,module,exports){
var base64js = require("base64-js");
var JSZip = require("jszip");

exports.openArrayBuffer = openArrayBuffer;
exports.splitPath = splitPath;
exports.joinPath = joinPath;

function openArrayBuffer(arrayBuffer) {
    return JSZip.loadAsync(arrayBuffer).then(function(zipFile) {
        function exists(name) {
            return zipFile.file(name) !== null;
        }

        function read(name, encoding) {
            return zipFile.file(name).async("uint8array").then(function(array) {
                if (encoding === "base64") {
                    return base64js.fromByteArray(array);
                } else if (encoding) {
                    var decoder = new TextDecoder(encoding);
                    return decoder.decode(array);
                } else {
                    return array;
                }
            });
        }

        function write(name, contents) {
            zipFile.file(name, contents);
        }

        function toArrayBuffer() {
            return zipFile.generateAsync({type: "arraybuffer"});
        }

        return {
            exists: exists,
            read: read,
            write: write,
            toArrayBuffer: toArrayBuffer
        };
    });
}

function splitPath(path) {
    var lastIndex = path.lastIndexOf("/");
    if (lastIndex === -1) {
        return {dirname: "", basename: path};
    } else {
        return {
            dirname: path.substring(0, lastIndex),
            basename: path.substring(lastIndex + 1)
        };
    }
}

function joinPath() {
    var nonEmptyPaths = Array.prototype.filter.call(arguments, function(path) {
        return path;
    });

    var relevantPaths = [];

    nonEmptyPaths.forEach(function(path) {
        if (/^\//.test(path)) {
            relevantPaths = [path];
        } else {
            relevantPaths.push(path);
        }
    });

    return relevantPaths.join("/");
}

},{"base64-js":47,"jszip":88}],41:[function(require,module,exports){
'use strict'

/**
 * Ponyfill for `Array.prototype.find` which is only available in ES6 runtimes.
 *
 * Works with anything that has a `length` property and index access properties, including NodeList.
 *
 * @template {unknown} T
 * @param {Array<T> | ({length:number, [number]: T})} list
 * @param {function (item: T, index: number, list:Array<T> | ({length:number, [number]: T})):boolean} predicate
 * @param {Partial<Pick<ArrayConstructor['prototype'], 'find'>>?} ac `Array.prototype` by default,
 * 				allows injecting a custom implementation in tests
 * @returns {T | undefined}
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
 * @see https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.find
 */
function find(list, predicate, ac) {
	if (ac === undefined) {
		ac = Array.prototype;
	}
	if (list && typeof ac.find === 'function') {
		return ac.find.call(list, predicate);
	}
	for (var i = 0; i < list.length; i++) {
		if (Object.prototype.hasOwnProperty.call(list, i)) {
			var item = list[i];
			if (predicate.call(undefined, item, i, list)) {
				return item;
			}
		}
	}
}

/**
 * "Shallow freezes" an object to render it immutable.
 * Uses `Object.freeze` if available,
 * otherwise the immutability is only in the type.
 *
 * Is used to create "enum like" objects.
 *
 * @template T
 * @param {T} object the object to freeze
 * @param {Pick<ObjectConstructor, 'freeze'> = Object} oc `Object` by default,
 * 				allows to inject custom object constructor for tests
 * @returns {Readonly<T>}
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
 */
function freeze(object, oc) {
	if (oc === undefined) {
		oc = Object
	}
	return oc && typeof oc.freeze === 'function' ? oc.freeze(object) : object
}

/**
 * Since we can not rely on `Object.assign` we provide a simplified version
 * that is sufficient for our needs.
 *
 * @param {Object} target
 * @param {Object | null | undefined} source
 *
 * @returns {Object} target
 * @throws TypeError if target is not an object
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 * @see https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.assign
 */
function assign(target, source) {
	if (target === null || typeof target !== 'object') {
		throw new TypeError('target is not an object')
	}
	for (var key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			target[key] = source[key]
		}
	}
	return target
}

/**
 * All mime types that are allowed as input to `DOMParser.parseFromString`
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString#Argument02 MDN
 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#domparsersupportedtype WHATWG HTML Spec
 * @see DOMParser.prototype.parseFromString
 */
var MIME_TYPE = freeze({
	/**
	 * `text/html`, the only mime type that triggers treating an XML document as HTML.
	 *
	 * @see DOMParser.SupportedType.isHTML
	 * @see https://www.iana.org/assignments/media-types/text/html IANA MimeType registration
	 * @see https://en.wikipedia.org/wiki/HTML Wikipedia
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString MDN
	 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-domparser-parsefromstring WHATWG HTML Spec
	 */
	HTML: 'text/html',

	/**
	 * Helper method to check a mime type if it indicates an HTML document
	 *
	 * @param {string} [value]
	 * @returns {boolean}
	 *
	 * @see https://www.iana.org/assignments/media-types/text/html IANA MimeType registration
	 * @see https://en.wikipedia.org/wiki/HTML Wikipedia
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString MDN
	 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-domparser-parsefromstring 	 */
	isHTML: function (value) {
		return value === MIME_TYPE.HTML
	},

	/**
	 * `application/xml`, the standard mime type for XML documents.
	 *
	 * @see https://www.iana.org/assignments/media-types/application/xml IANA MimeType registration
	 * @see https://tools.ietf.org/html/rfc7303#section-9.1 RFC 7303
	 * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
	 */
	XML_APPLICATION: 'application/xml',

	/**
	 * `text/html`, an alias for `application/xml`.
	 *
	 * @see https://tools.ietf.org/html/rfc7303#section-9.2 RFC 7303
	 * @see https://www.iana.org/assignments/media-types/text/xml IANA MimeType registration
	 * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
	 */
	XML_TEXT: 'text/xml',

	/**
	 * `application/xhtml+xml`, indicates an XML document that has the default HTML namespace,
	 * but is parsed as an XML document.
	 *
	 * @see https://www.iana.org/assignments/media-types/application/xhtml+xml IANA MimeType registration
	 * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument WHATWG DOM Spec
	 * @see https://en.wikipedia.org/wiki/XHTML Wikipedia
	 */
	XML_XHTML_APPLICATION: 'application/xhtml+xml',

	/**
	 * `image/svg+xml`,
	 *
	 * @see https://www.iana.org/assignments/media-types/image/svg+xml IANA MimeType registration
	 * @see https://www.w3.org/TR/SVG11/ W3C SVG 1.1
	 * @see https://en.wikipedia.org/wiki/Scalable_Vector_Graphics Wikipedia
	 */
	XML_SVG_IMAGE: 'image/svg+xml',
})

/**
 * Namespaces that are used in this code base.
 *
 * @see http://www.w3.org/TR/REC-xml-names
 */
var NAMESPACE = freeze({
	/**
	 * The XHTML namespace.
	 *
	 * @see http://www.w3.org/1999/xhtml
	 */
	HTML: 'http://www.w3.org/1999/xhtml',

	/**
	 * Checks if `uri` equals `NAMESPACE.HTML`.
	 *
	 * @param {string} [uri]
	 *
	 * @see NAMESPACE.HTML
	 */
	isHTML: function (uri) {
		return uri === NAMESPACE.HTML
	},

	/**
	 * The SVG namespace.
	 *
	 * @see http://www.w3.org/2000/svg
	 */
	SVG: 'http://www.w3.org/2000/svg',

	/**
	 * The `xml:` namespace.
	 *
	 * @see http://www.w3.org/XML/1998/namespace
	 */
	XML: 'http://www.w3.org/XML/1998/namespace',

	/**
	 * The `xmlns:` namespace
	 *
	 * @see https://www.w3.org/2000/xmlns/
	 */
	XMLNS: 'http://www.w3.org/2000/xmlns/',
})

exports.assign = assign;
exports.find = find;
exports.freeze = freeze;
exports.MIME_TYPE = MIME_TYPE;
exports.NAMESPACE = NAMESPACE;

},{}],42:[function(require,module,exports){
var conventions = require("./conventions");
var dom = require('./dom')
var entities = require('./entities');
var sax = require('./sax');

var DOMImplementation = dom.DOMImplementation;

var NAMESPACE = conventions.NAMESPACE;

var ParseError = sax.ParseError;
var XMLReader = sax.XMLReader;

/**
 * Normalizes line ending according to https://www.w3.org/TR/xml11/#sec-line-ends:
 *
 * > XML parsed entities are often stored in computer files which,
 * > for editing convenience, are organized into lines.
 * > These lines are typically separated by some combination
 * > of the characters CARRIAGE RETURN (#xD) and LINE FEED (#xA).
 * >
 * > To simplify the tasks of applications, the XML processor must behave
 * > as if it normalized all line breaks in external parsed entities (including the document entity)
 * > on input, before parsing, by translating all of the following to a single #xA character:
 * >
 * > 1. the two-character sequence #xD #xA
 * > 2. the two-character sequence #xD #x85
 * > 3. the single character #x85
 * > 4. the single character #x2028
 * > 5. any #xD character that is not immediately followed by #xA or #x85.
 *
 * @param {string} input
 * @returns {string}
 */
function normalizeLineEndings(input) {
	return input
		.replace(/\r[\n\u0085]/g, '\n')
		.replace(/[\r\u0085\u2028]/g, '\n')
}

/**
 * @typedef Locator
 * @property {number} [columnNumber]
 * @property {number} [lineNumber]
 */

/**
 * @typedef DOMParserOptions
 * @property {DOMHandler} [domBuilder]
 * @property {Function} [errorHandler]
 * @property {(string) => string} [normalizeLineEndings] used to replace line endings before parsing
 * 						defaults to `normalizeLineEndings`
 * @property {Locator} [locator]
 * @property {Record<string, string>} [xmlns]
 *
 * @see normalizeLineEndings
 */

/**
 * The DOMParser interface provides the ability to parse XML or HTML source code
 * from a string into a DOM `Document`.
 *
 * _xmldom is different from the spec in that it allows an `options` parameter,
 * to override the default behavior._
 *
 * @param {DOMParserOptions} [options]
 * @constructor
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-parsing-and-serialization
 */
function DOMParser(options){
	this.options = options ||{locator:{}};
}

DOMParser.prototype.parseFromString = function(source,mimeType){
	var options = this.options;
	var sax =  new XMLReader();
	var domBuilder = options.domBuilder || new DOMHandler();//contentHandler and LexicalHandler
	var errorHandler = options.errorHandler;
	var locator = options.locator;
	var defaultNSMap = options.xmlns||{};
	var isHTML = /\/x?html?$/.test(mimeType);//mimeType.toLowerCase().indexOf('html') > -1;
  	var entityMap = isHTML ? entities.HTML_ENTITIES : entities.XML_ENTITIES;
	if(locator){
		domBuilder.setDocumentLocator(locator)
	}

	sax.errorHandler = buildErrorHandler(errorHandler,domBuilder,locator);
	sax.domBuilder = options.domBuilder || domBuilder;
	if(isHTML){
		defaultNSMap[''] = NAMESPACE.HTML;
	}
	defaultNSMap.xml = defaultNSMap.xml || NAMESPACE.XML;
	var normalize = options.normalizeLineEndings || normalizeLineEndings;
	if (source && typeof source === 'string') {
		sax.parse(
			normalize(source),
			defaultNSMap,
			entityMap
		)
	} else {
		sax.errorHandler.error('invalid doc source')
	}
	return domBuilder.doc;
}
function buildErrorHandler(errorImpl,domBuilder,locator){
	if(!errorImpl){
		if(domBuilder instanceof DOMHandler){
			return domBuilder;
		}
		errorImpl = domBuilder ;
	}
	var errorHandler = {}
	var isCallback = errorImpl instanceof Function;
	locator = locator||{}
	function build(key){
		var fn = errorImpl[key];
		if(!fn && isCallback){
			fn = errorImpl.length == 2?function(msg){errorImpl(key,msg)}:errorImpl;
		}
		errorHandler[key] = fn && function(msg){
			fn('[xmldom '+key+']\t'+msg+_locator(locator));
		}||function(){};
	}
	build('warning');
	build('error');
	build('fatalError');
	return errorHandler;
}

//console.log('#\n\n\n\n\n\n\n####')
/**
 * +ContentHandler+ErrorHandler
 * +LexicalHandler+EntityResolver2
 * -DeclHandler-DTDHandler
 *
 * DefaultHandler:EntityResolver, DTDHandler, ContentHandler, ErrorHandler
 * DefaultHandler2:DefaultHandler,LexicalHandler, DeclHandler, EntityResolver2
 * @link http://www.saxproject.org/apidoc/org/xml/sax/helpers/DefaultHandler.html
 */
function DOMHandler() {
    this.cdata = false;
}
function position(locator,node){
	node.lineNumber = locator.lineNumber;
	node.columnNumber = locator.columnNumber;
}
/**
 * @see org.xml.sax.ContentHandler#startDocument
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ContentHandler.html
 */
DOMHandler.prototype = {
	startDocument : function() {
    	this.doc = new DOMImplementation().createDocument(null, null, null);
    	if (this.locator) {
        	this.doc.documentURI = this.locator.systemId;
    	}
	},
	startElement:function(namespaceURI, localName, qName, attrs) {
		var doc = this.doc;
	    var el = doc.createElementNS(namespaceURI, qName||localName);
	    var len = attrs.length;
	    appendElement(this, el);
	    this.currentElement = el;

		this.locator && position(this.locator,el)
	    for (var i = 0 ; i < len; i++) {
	        var namespaceURI = attrs.getURI(i);
	        var value = attrs.getValue(i);
	        var qName = attrs.getQName(i);
			var attr = doc.createAttributeNS(namespaceURI, qName);
			this.locator &&position(attrs.getLocator(i),attr);
			attr.value = attr.nodeValue = value;
			el.setAttributeNode(attr)
	    }
	},
	endElement:function(namespaceURI, localName, qName) {
		var current = this.currentElement
		var tagName = current.tagName;
		this.currentElement = current.parentNode;
	},
	startPrefixMapping:function(prefix, uri) {
	},
	endPrefixMapping:function(prefix) {
	},
	processingInstruction:function(target, data) {
	    var ins = this.doc.createProcessingInstruction(target, data);
	    this.locator && position(this.locator,ins)
	    appendElement(this, ins);
	},
	ignorableWhitespace:function(ch, start, length) {
	},
	characters:function(chars, start, length) {
		chars = _toString.apply(this,arguments)
		//console.log(chars)
		if(chars){
			if (this.cdata) {
				var charNode = this.doc.createCDATASection(chars);
			} else {
				var charNode = this.doc.createTextNode(chars);
			}
			if(this.currentElement){
				this.currentElement.appendChild(charNode);
			}else if(/^\s*$/.test(chars)){
				this.doc.appendChild(charNode);
				//process xml
			}
			this.locator && position(this.locator,charNode)
		}
	},
	skippedEntity:function(name) {
	},
	endDocument:function() {
		this.doc.normalize();
	},
	setDocumentLocator:function (locator) {
	    if(this.locator = locator){// && !('lineNumber' in locator)){
	    	locator.lineNumber = 0;
	    }
	},
	//LexicalHandler
	comment:function(chars, start, length) {
		chars = _toString.apply(this,arguments)
	    var comm = this.doc.createComment(chars);
	    this.locator && position(this.locator,comm)
	    appendElement(this, comm);
	},

	startCDATA:function() {
	    //used in characters() methods
	    this.cdata = true;
	},
	endCDATA:function() {
	    this.cdata = false;
	},

	startDTD:function(name, publicId, systemId) {
		var impl = this.doc.implementation;
	    if (impl && impl.createDocumentType) {
	        var dt = impl.createDocumentType(name, publicId, systemId);
	        this.locator && position(this.locator,dt)
	        appendElement(this, dt);
					this.doc.doctype = dt;
	    }
	},
	/**
	 * @see org.xml.sax.ErrorHandler
	 * @link http://www.saxproject.org/apidoc/org/xml/sax/ErrorHandler.html
	 */
	warning:function(error) {
		console.warn('[xmldom warning]\t'+error,_locator(this.locator));
	},
	error:function(error) {
		console.error('[xmldom error]\t'+error,_locator(this.locator));
	},
	fatalError:function(error) {
		throw new ParseError(error, this.locator);
	}
}
function _locator(l){
	if(l){
		return '\n@'+(l.systemId ||'')+'#[line:'+l.lineNumber+',col:'+l.columnNumber+']'
	}
}
function _toString(chars,start,length){
	if(typeof chars == 'string'){
		return chars.substr(start,length)
	}else{//java sax connect width xmldom on rhino(what about: "? && !(chars instanceof String)")
		if(chars.length >= start+length || start){
			return new java.lang.String(chars,start,length)+'';
		}
		return chars;
	}
}

/*
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/LexicalHandler.html
 * used method of org.xml.sax.ext.LexicalHandler:
 *  #comment(chars, start, length)
 *  #startCDATA()
 *  #endCDATA()
 *  #startDTD(name, publicId, systemId)
 *
 *
 * IGNORED method of org.xml.sax.ext.LexicalHandler:
 *  #endDTD()
 *  #startEntity(name)
 *  #endEntity(name)
 *
 *
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/DeclHandler.html
 * IGNORED method of org.xml.sax.ext.DeclHandler
 * 	#attributeDecl(eName, aName, type, mode, value)
 *  #elementDecl(name, model)
 *  #externalEntityDecl(name, publicId, systemId)
 *  #internalEntityDecl(name, value)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/EntityResolver2.html
 * IGNORED method of org.xml.sax.EntityResolver2
 *  #resolveEntity(String name,String publicId,String baseURI,String systemId)
 *  #resolveEntity(publicId, systemId)
 *  #getExternalSubset(name, baseURI)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/DTDHandler.html
 * IGNORED method of org.xml.sax.DTDHandler
 *  #notationDecl(name, publicId, systemId) {};
 *  #unparsedEntityDecl(name, publicId, systemId, notationName) {};
 */
"endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(/\w+/g,function(key){
	DOMHandler.prototype[key] = function(){return null}
})

/* Private static helpers treated below as private instance methods, so don't need to add these to the public API; we might use a Relator to also get rid of non-standard public properties */
function appendElement (hander,node) {
    if (!hander.currentElement) {
        hander.doc.appendChild(node);
    } else {
        hander.currentElement.appendChild(node);
    }
}//appendChild and setAttributeNS are preformance key

exports.__DOMHandler = DOMHandler;
exports.normalizeLineEndings = normalizeLineEndings;
exports.DOMParser = DOMParser;

},{"./conventions":41,"./dom":43,"./entities":44,"./sax":46}],43:[function(require,module,exports){
var conventions = require("./conventions");

var find = conventions.find;
var NAMESPACE = conventions.NAMESPACE;

/**
 * A prerequisite for `[].filter`, to drop elements that are empty
 * @param {string} input
 * @returns {boolean}
 */
function notEmptyString (input) {
	return input !== ''
}
/**
 * @see https://infra.spec.whatwg.org/#split-on-ascii-whitespace
 * @see https://infra.spec.whatwg.org/#ascii-whitespace
 *
 * @param {string} input
 * @returns {string[]} (can be empty)
 */
function splitOnASCIIWhitespace(input) {
	// U+0009 TAB, U+000A LF, U+000C FF, U+000D CR, U+0020 SPACE
	return input ? input.split(/[\t\n\f\r ]+/).filter(notEmptyString) : []
}

/**
 * Adds element as a key to current if it is not already present.
 *
 * @param {Record<string, boolean | undefined>} current
 * @param {string} element
 * @returns {Record<string, boolean | undefined>}
 */
function orderedSetReducer (current, element) {
	if (!current.hasOwnProperty(element)) {
		current[element] = true;
	}
	return current;
}

/**
 * @see https://infra.spec.whatwg.org/#ordered-set
 * @param {string} input
 * @returns {string[]}
 */
function toOrderedSet(input) {
	if (!input) return [];
	var list = splitOnASCIIWhitespace(input);
	return Object.keys(list.reduce(orderedSetReducer, {}))
}

/**
 * Uses `list.indexOf` to implement something like `Array.prototype.includes`,
 * which we can not rely on being available.
 *
 * @param {any[]} list
 * @returns {function(any): boolean}
 */
function arrayIncludes (list) {
	return function(element) {
		return list && list.indexOf(element) !== -1;
	}
}

function copy(src,dest){
	for(var p in src){
		if (Object.prototype.hasOwnProperty.call(src, p)) {
			dest[p] = src[p];
		}
	}
}

/**
^\w+\.prototype\.([_\w]+)\s*=\s*((?:.*\{\s*?[\r\n][\s\S]*?^})|\S.*?(?=[;\r\n]));?
^\w+\.prototype\.([_\w]+)\s*=\s*(\S.*?(?=[;\r\n]));?
 */
function _extends(Class,Super){
	var pt = Class.prototype;
	if(!(pt instanceof Super)){
		function t(){};
		t.prototype = Super.prototype;
		t = new t();
		copy(pt,t);
		Class.prototype = pt = t;
	}
	if(pt.constructor != Class){
		if(typeof Class != 'function'){
			console.error("unknown Class:"+Class)
		}
		pt.constructor = Class
	}
}

// Node Types
var NodeType = {}
var ELEMENT_NODE                = NodeType.ELEMENT_NODE                = 1;
var ATTRIBUTE_NODE              = NodeType.ATTRIBUTE_NODE              = 2;
var TEXT_NODE                   = NodeType.TEXT_NODE                   = 3;
var CDATA_SECTION_NODE          = NodeType.CDATA_SECTION_NODE          = 4;
var ENTITY_REFERENCE_NODE       = NodeType.ENTITY_REFERENCE_NODE       = 5;
var ENTITY_NODE                 = NodeType.ENTITY_NODE                 = 6;
var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
var COMMENT_NODE                = NodeType.COMMENT_NODE                = 8;
var DOCUMENT_NODE               = NodeType.DOCUMENT_NODE               = 9;
var DOCUMENT_TYPE_NODE          = NodeType.DOCUMENT_TYPE_NODE          = 10;
var DOCUMENT_FRAGMENT_NODE      = NodeType.DOCUMENT_FRAGMENT_NODE      = 11;
var NOTATION_NODE               = NodeType.NOTATION_NODE               = 12;

// ExceptionCode
var ExceptionCode = {}
var ExceptionMessage = {};
var INDEX_SIZE_ERR              = ExceptionCode.INDEX_SIZE_ERR              = ((ExceptionMessage[1]="Index size error"),1);
var DOMSTRING_SIZE_ERR          = ExceptionCode.DOMSTRING_SIZE_ERR          = ((ExceptionMessage[2]="DOMString size error"),2);
var HIERARCHY_REQUEST_ERR       = ExceptionCode.HIERARCHY_REQUEST_ERR       = ((ExceptionMessage[3]="Hierarchy request error"),3);
var WRONG_DOCUMENT_ERR          = ExceptionCode.WRONG_DOCUMENT_ERR          = ((ExceptionMessage[4]="Wrong document"),4);
var INVALID_CHARACTER_ERR       = ExceptionCode.INVALID_CHARACTER_ERR       = ((ExceptionMessage[5]="Invalid character"),5);
var NO_DATA_ALLOWED_ERR         = ExceptionCode.NO_DATA_ALLOWED_ERR         = ((ExceptionMessage[6]="No data allowed"),6);
var NO_MODIFICATION_ALLOWED_ERR = ExceptionCode.NO_MODIFICATION_ALLOWED_ERR = ((ExceptionMessage[7]="No modification allowed"),7);
var NOT_FOUND_ERR               = ExceptionCode.NOT_FOUND_ERR               = ((ExceptionMessage[8]="Not found"),8);
var NOT_SUPPORTED_ERR           = ExceptionCode.NOT_SUPPORTED_ERR           = ((ExceptionMessage[9]="Not supported"),9);
var INUSE_ATTRIBUTE_ERR         = ExceptionCode.INUSE_ATTRIBUTE_ERR         = ((ExceptionMessage[10]="Attribute in use"),10);
//level2
var INVALID_STATE_ERR        	= ExceptionCode.INVALID_STATE_ERR        	= ((ExceptionMessage[11]="Invalid state"),11);
var SYNTAX_ERR               	= ExceptionCode.SYNTAX_ERR               	= ((ExceptionMessage[12]="Syntax error"),12);
var INVALID_MODIFICATION_ERR 	= ExceptionCode.INVALID_MODIFICATION_ERR 	= ((ExceptionMessage[13]="Invalid modification"),13);
var NAMESPACE_ERR            	= ExceptionCode.NAMESPACE_ERR           	= ((ExceptionMessage[14]="Invalid namespace"),14);
var INVALID_ACCESS_ERR       	= ExceptionCode.INVALID_ACCESS_ERR      	= ((ExceptionMessage[15]="Invalid access"),15);

/**
 * DOM Level 2
 * Object DOMException
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/ecma-script-binding.html
 * @see http://www.w3.org/TR/REC-DOM-Level-1/ecma-script-language-binding.html
 */
function DOMException(code, message) {
	if(message instanceof Error){
		var error = message;
	}else{
		error = this;
		Error.call(this, ExceptionMessage[code]);
		this.message = ExceptionMessage[code];
		if(Error.captureStackTrace) Error.captureStackTrace(this, DOMException);
	}
	error.code = code;
	if(message) this.message = this.message + ": " + message;
	return error;
};
DOMException.prototype = Error.prototype;
copy(ExceptionCode,DOMException)

/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-536297177
 * The NodeList interface provides the abstraction of an ordered collection of nodes, without defining or constraining how this collection is implemented. NodeList objects in the DOM are live.
 * The items in the NodeList are accessible via an integral index, starting from 0.
 */
function NodeList() {
};
NodeList.prototype = {
	/**
	 * The number of nodes in the list. The range of valid child node indices is 0 to length-1 inclusive.
	 * @standard level1
	 */
	length:0,
	/**
	 * Returns the indexth item in the collection. If index is greater than or equal to the number of nodes in the list, this returns null.
	 * @standard level1
	 * @param index  unsigned long
	 *   Index into the collection.
	 * @return Node
	 * 	The node at the indexth position in the NodeList, or null if that is not a valid index.
	 */
	item: function(index) {
		return this[index] || null;
	},
	toString:function(isHTML,nodeFilter){
		for(var buf = [], i = 0;i<this.length;i++){
			serializeToString(this[i],buf,isHTML,nodeFilter);
		}
		return buf.join('');
	},
	/**
	 * @private
	 * @param {function (Node):boolean} predicate
	 * @returns {Node[]}
	 */
	filter: function (predicate) {
		return Array.prototype.filter.call(this, predicate);
	},
	/**
	 * @private
	 * @param {Node} item
	 * @returns {number}
	 */
	indexOf: function (item) {
		return Array.prototype.indexOf.call(this, item);
	},
};

function LiveNodeList(node,refresh){
	this._node = node;
	this._refresh = refresh
	_updateLiveList(this);
}
function _updateLiveList(list){
	var inc = list._node._inc || list._node.ownerDocument._inc;
	if(list._inc != inc){
		var ls = list._refresh(list._node);
		//console.log(ls.length)
		__set__(list,'length',ls.length);
		copy(ls,list);
		list._inc = inc;
	}
}
LiveNodeList.prototype.item = function(i){
	_updateLiveList(this);
	return this[i];
}

_extends(LiveNodeList,NodeList);

/**
 * Objects implementing the NamedNodeMap interface are used
 * to represent collections of nodes that can be accessed by name.
 * Note that NamedNodeMap does not inherit from NodeList;
 * NamedNodeMaps are not maintained in any particular order.
 * Objects contained in an object implementing NamedNodeMap may also be accessed by an ordinal index,
 * but this is simply to allow convenient enumeration of the contents of a NamedNodeMap,
 * and does not imply that the DOM specifies an order to these Nodes.
 * NamedNodeMap objects in the DOM are live.
 * used for attributes or DocumentType entities
 */
function NamedNodeMap() {
};

function _findNodeIndex(list,node){
	var i = list.length;
	while(i--){
		if(list[i] === node){return i}
	}
}

function _addNamedNode(el,list,newAttr,oldAttr){
	if(oldAttr){
		list[_findNodeIndex(list,oldAttr)] = newAttr;
	}else{
		list[list.length++] = newAttr;
	}
	if(el){
		newAttr.ownerElement = el;
		var doc = el.ownerDocument;
		if(doc){
			oldAttr && _onRemoveAttribute(doc,el,oldAttr);
			_onAddAttribute(doc,el,newAttr);
		}
	}
}
function _removeNamedNode(el,list,attr){
	//console.log('remove attr:'+attr)
	var i = _findNodeIndex(list,attr);
	if(i>=0){
		var lastIndex = list.length-1
		while(i<lastIndex){
			list[i] = list[++i]
		}
		list.length = lastIndex;
		if(el){
			var doc = el.ownerDocument;
			if(doc){
				_onRemoveAttribute(doc,el,attr);
				attr.ownerElement = null;
			}
		}
	}else{
		throw new DOMException(NOT_FOUND_ERR,new Error(el.tagName+'@'+attr))
	}
}
NamedNodeMap.prototype = {
	length:0,
	item:NodeList.prototype.item,
	getNamedItem: function(key) {
//		if(key.indexOf(':')>0 || key == 'xmlns'){
//			return null;
//		}
		//console.log()
		var i = this.length;
		while(i--){
			var attr = this[i];
			//console.log(attr.nodeName,key)
			if(attr.nodeName == key){
				return attr;
			}
		}
	},
	setNamedItem: function(attr) {
		var el = attr.ownerElement;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		var oldAttr = this.getNamedItem(attr.nodeName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},
	/* returns Node */
	setNamedItemNS: function(attr) {// raises: WRONG_DOCUMENT_ERR,NO_MODIFICATION_ALLOWED_ERR,INUSE_ATTRIBUTE_ERR
		var el = attr.ownerElement, oldAttr;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		oldAttr = this.getNamedItemNS(attr.namespaceURI,attr.localName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},

	/* returns Node */
	removeNamedItem: function(key) {
		var attr = this.getNamedItem(key);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;


	},// raises: NOT_FOUND_ERR,NO_MODIFICATION_ALLOWED_ERR

	//for level2
	removeNamedItemNS:function(namespaceURI,localName){
		var attr = this.getNamedItemNS(namespaceURI,localName);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
	},
	getNamedItemNS: function(namespaceURI, localName) {
		var i = this.length;
		while(i--){
			var node = this[i];
			if(node.localName == localName && node.namespaceURI == namespaceURI){
				return node;
			}
		}
		return null;
	}
};

/**
 * The DOMImplementation interface represents an object providing methods
 * which are not dependent on any particular document.
 * Such an object is returned by the `Document.implementation` property.
 *
 * __The individual methods describe the differences compared to the specs.__
 *
 * @constructor
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation MDN
 * @see https://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-102161490 DOM Level 1 Core (Initial)
 * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-102161490 DOM Level 2 Core
 * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-102161490 DOM Level 3 Core
 * @see https://dom.spec.whatwg.org/#domimplementation DOM Living Standard
 */
function DOMImplementation() {
}

DOMImplementation.prototype = {
	/**
	 * The DOMImplementation.hasFeature() method returns a Boolean flag indicating if a given feature is supported.
	 * The different implementations fairly diverged in what kind of features were reported.
	 * The latest version of the spec settled to force this method to always return true, where the functionality was accurate and in use.
	 *
	 * @deprecated It is deprecated and modern browsers return true in all cases.
	 *
	 * @param {string} feature
	 * @param {string} [version]
	 * @returns {boolean} always true
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/hasFeature MDN
	 * @see https://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-5CED94D7 DOM Level 1 Core
	 * @see https://dom.spec.whatwg.org/#dom-domimplementation-hasfeature DOM Living Standard
	 */
	hasFeature: function(feature, version) {
			return true;
	},
	/**
	 * Creates an XML Document object of the specified type with its document element.
	 *
	 * __It behaves slightly different from the description in the living standard__:
	 * - There is no interface/class `XMLDocument`, it returns a `Document` instance.
	 * - `contentType`, `encoding`, `mode`, `origin`, `url` fields are currently not declared.
	 * - this implementation is not validating names or qualified names
	 *   (when parsing XML strings, the SAX parser takes care of that)
	 *
	 * @param {string|null} namespaceURI
	 * @param {string} qualifiedName
	 * @param {DocumentType=null} doctype
	 * @returns {Document}
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createDocument MDN
	 * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#Level-2-Core-DOM-createDocument DOM Level 2 Core (initial)
	 * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument  DOM Level 2 Core
	 *
	 * @see https://dom.spec.whatwg.org/#validate-and-extract DOM: Validate and extract
	 * @see https://www.w3.org/TR/xml/#NT-NameStartChar XML Spec: Names
	 * @see https://www.w3.org/TR/xml-names/#ns-qualnames XML Namespaces: Qualified names
	 */
	createDocument: function(namespaceURI,  qualifiedName, doctype){
		var doc = new Document();
		doc.implementation = this;
		doc.childNodes = new NodeList();
		doc.doctype = doctype || null;
		if (doctype){
			doc.appendChild(doctype);
		}
		if (qualifiedName){
			var root = doc.createElementNS(namespaceURI, qualifiedName);
			doc.appendChild(root);
		}
		return doc;
	},
	/**
	 * Returns a doctype, with the given `qualifiedName`, `publicId`, and `systemId`.
	 *
	 * __This behavior is slightly different from the in the specs__:
	 * - this implementation is not validating names or qualified names
	 *   (when parsing XML strings, the SAX parser takes care of that)
	 *
	 * @param {string} qualifiedName
	 * @param {string} [publicId]
	 * @param {string} [systemId]
	 * @returns {DocumentType} which can either be used with `DOMImplementation.createDocument` upon document creation
	 * 				  or can be put into the document via methods like `Node.insertBefore()` or `Node.replaceChild()`
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createDocumentType MDN
	 * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#Level-2-Core-DOM-createDocType DOM Level 2 Core
	 * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocumenttype DOM Living Standard
	 *
	 * @see https://dom.spec.whatwg.org/#validate-and-extract DOM: Validate and extract
	 * @see https://www.w3.org/TR/xml/#NT-NameStartChar XML Spec: Names
	 * @see https://www.w3.org/TR/xml-names/#ns-qualnames XML Namespaces: Qualified names
	 */
	createDocumentType: function(qualifiedName, publicId, systemId){
		var node = new DocumentType();
		node.name = qualifiedName;
		node.nodeName = qualifiedName;
		node.publicId = publicId || '';
		node.systemId = systemId || '';

		return node;
	}
};


/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-1950641247
 */

function Node() {
};

Node.prototype = {
	firstChild : null,
	lastChild : null,
	previousSibling : null,
	nextSibling : null,
	attributes : null,
	parentNode : null,
	childNodes : null,
	ownerDocument : null,
	nodeValue : null,
	namespaceURI : null,
	prefix : null,
	localName : null,
	// Modified in DOM Level 2:
	insertBefore:function(newChild, refChild){//raises
		return _insertBefore(this,newChild,refChild);
	},
	replaceChild:function(newChild, oldChild){//raises
		_insertBefore(this, newChild,oldChild, assertPreReplacementValidityInDocument);
		if(oldChild){
			this.removeChild(oldChild);
		}
	},
	removeChild:function(oldChild){
		return _removeChild(this,oldChild);
	},
	appendChild:function(newChild){
		return this.insertBefore(newChild,null);
	},
	hasChildNodes:function(){
		return this.firstChild != null;
	},
	cloneNode:function(deep){
		return cloneNode(this.ownerDocument||this,this,deep);
	},
	// Modified in DOM Level 2:
	normalize:function(){
		var child = this.firstChild;
		while(child){
			var next = child.nextSibling;
			if(next && next.nodeType == TEXT_NODE && child.nodeType == TEXT_NODE){
				this.removeChild(next);
				child.appendData(next.data);
			}else{
				child.normalize();
				child = next;
			}
		}
	},
  	// Introduced in DOM Level 2:
	isSupported:function(feature, version){
		return this.ownerDocument.implementation.hasFeature(feature,version);
	},
    // Introduced in DOM Level 2:
    hasAttributes:function(){
    	return this.attributes.length>0;
    },
	/**
	 * Look up the prefix associated to the given namespace URI, starting from this node.
	 * **The default namespace declarations are ignored by this method.**
	 * See Namespace Prefix Lookup for details on the algorithm used by this method.
	 *
	 * _Note: The implementation seems to be incomplete when compared to the algorithm described in the specs._
	 *
	 * @param {string | null} namespaceURI
	 * @returns {string | null}
	 * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-lookupNamespacePrefix
	 * @see https://www.w3.org/TR/DOM-Level-3-Core/namespaces-algorithms.html#lookupNamespacePrefixAlgo
	 * @see https://dom.spec.whatwg.org/#dom-node-lookupprefix
	 * @see https://github.com/xmldom/xmldom/issues/322
	 */
    lookupPrefix:function(namespaceURI){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			for(var n in map){
						if (Object.prototype.hasOwnProperty.call(map, n) && map[n] === namespaceURI) {
							return n;
						}
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    lookupNamespaceURI:function(prefix){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			if(Object.prototype.hasOwnProperty.call(map, prefix)){
    				return map[prefix] ;
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    isDefaultNamespace:function(namespaceURI){
    	var prefix = this.lookupPrefix(namespaceURI);
    	return prefix == null;
    }
};


function _xmlEncoder(c){
	return c == '<' && '&lt;' ||
         c == '>' && '&gt;' ||
         c == '&' && '&amp;' ||
         c == '"' && '&quot;' ||
         '&#'+c.charCodeAt()+';'
}


copy(NodeType,Node);
copy(NodeType,Node.prototype);

/**
 * @param callback return true for continue,false for break
 * @return boolean true: break visit;
 */
function _visitNode(node,callback){
	if(callback(node)){
		return true;
	}
	if(node = node.firstChild){
		do{
			if(_visitNode(node,callback)){return true}
        }while(node=node.nextSibling)
    }
}



function Document(){
	this.ownerDocument = this;
}

function _onAddAttribute(doc,el,newAttr){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns === NAMESPACE.XMLNS){
		//update namespace
		el._nsMap[newAttr.prefix?newAttr.localName:''] = newAttr.value
	}
}

function _onRemoveAttribute(doc,el,newAttr,remove){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns === NAMESPACE.XMLNS){
		//update namespace
		delete el._nsMap[newAttr.prefix?newAttr.localName:'']
	}
}

/**
 * Updates `el.childNodes`, updating the indexed items and it's `length`.
 * Passing `newChild` means it will be appended.
 * Otherwise it's assumed that an item has been removed,
 * and `el.firstNode` and it's `.nextSibling` are used
 * to walk the current list of child nodes.
 *
 * @param {Document} doc
 * @param {Node} el
 * @param {Node} [newChild]
 * @private
 */
function _onUpdateChild (doc, el, newChild) {
	if(doc && doc._inc){
		doc._inc++;
		//update childNodes
		var cs = el.childNodes;
		if (newChild) {
			cs[cs.length++] = newChild;
		} else {
			var child = el.firstChild;
			var i = 0;
			while (child) {
				cs[i++] = child;
				child = child.nextSibling;
			}
			cs.length = i;
			delete cs[cs.length];
		}
	}
}

/**
 * Removes the connections between `parentNode` and `child`
 * and any existing `child.previousSibling` or `child.nextSibling`.
 *
 * @see https://github.com/xmldom/xmldom/issues/135
 * @see https://github.com/xmldom/xmldom/issues/145
 *
 * @param {Node} parentNode
 * @param {Node} child
 * @returns {Node} the child that was removed.
 * @private
 */
function _removeChild (parentNode, child) {
	var previous = child.previousSibling;
	var next = child.nextSibling;
	if (previous) {
		previous.nextSibling = next;
	} else {
		parentNode.firstChild = next;
	}
	if (next) {
		next.previousSibling = previous;
	} else {
		parentNode.lastChild = previous;
	}
	child.parentNode = null;
	child.previousSibling = null;
	child.nextSibling = null;
	_onUpdateChild(parentNode.ownerDocument, parentNode);
	return child;
}

/**
 * Returns `true` if `node` can be a parent for insertion.
 * @param {Node} node
 * @returns {boolean}
 */
function hasValidParentNodeType(node) {
	return (
		node &&
		(node.nodeType === Node.DOCUMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE || node.nodeType === Node.ELEMENT_NODE)
	);
}

/**
 * Returns `true` if `node` can be inserted according to it's `nodeType`.
 * @param {Node} node
 * @returns {boolean}
 */
function hasInsertableNodeType(node) {
	return (
		node &&
		(isElementNode(node) ||
			isTextNode(node) ||
			isDocTypeNode(node) ||
			node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ||
			node.nodeType === Node.COMMENT_NODE ||
			node.nodeType === Node.PROCESSING_INSTRUCTION_NODE)
	);
}

/**
 * Returns true if `node` is a DOCTYPE node
 * @param {Node} node
 * @returns {boolean}
 */
function isDocTypeNode(node) {
	return node && node.nodeType === Node.DOCUMENT_TYPE_NODE;
}

/**
 * Returns true if the node is an element
 * @param {Node} node
 * @returns {boolean}
 */
function isElementNode(node) {
	return node && node.nodeType === Node.ELEMENT_NODE;
}
/**
 * Returns true if `node` is a text node
 * @param {Node} node
 * @returns {boolean}
 */
function isTextNode(node) {
	return node && node.nodeType === Node.TEXT_NODE;
}

/**
 * Check if en element node can be inserted before `child`, or at the end if child is falsy,
 * according to the presence and position of a doctype node on the same level.
 *
 * @param {Document} doc The document node
 * @param {Node} child the node that would become the nextSibling if the element would be inserted
 * @returns {boolean} `true` if an element can be inserted before child
 * @private
 * https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
 */
function isElementInsertionPossible(doc, child) {
	var parentChildNodes = doc.childNodes || [];
	if (find(parentChildNodes, isElementNode) || isDocTypeNode(child)) {
		return false;
	}
	var docTypeNode = find(parentChildNodes, isDocTypeNode);
	return !(child && docTypeNode && parentChildNodes.indexOf(docTypeNode) > parentChildNodes.indexOf(child));
}

/**
 * Check if en element node can be inserted before `child`, or at the end if child is falsy,
 * according to the presence and position of a doctype node on the same level.
 *
 * @param {Node} doc The document node
 * @param {Node} child the node that would become the nextSibling if the element would be inserted
 * @returns {boolean} `true` if an element can be inserted before child
 * @private
 * https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
 */
function isElementReplacementPossible(doc, child) {
	var parentChildNodes = doc.childNodes || [];

	function hasElementChildThatIsNotChild(node) {
		return isElementNode(node) && node !== child;
	}

	if (find(parentChildNodes, hasElementChildThatIsNotChild)) {
		return false;
	}
	var docTypeNode = find(parentChildNodes, isDocTypeNode);
	return !(child && docTypeNode && parentChildNodes.indexOf(docTypeNode) > parentChildNodes.indexOf(child));
}

/**
 * @private
 * Steps 1-5 of the checks before inserting and before replacing a child are the same.
 *
 * @param {Node} parent the parent node to insert `node` into
 * @param {Node} node the node to insert
 * @param {Node=} child the node that should become the `nextSibling` of `node`
 * @returns {Node}
 * @throws DOMException for several node combinations that would create a DOM that is not well-formed.
 * @throws DOMException if `child` is provided but is not a child of `parent`.
 * @see https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
 * @see https://dom.spec.whatwg.org/#concept-node-replace
 */
function assertPreInsertionValidity1to5(parent, node, child) {
	// 1. If `parent` is not a Document, DocumentFragment, or Element node, then throw a "HierarchyRequestError" DOMException.
	if (!hasValidParentNodeType(parent)) {
		throw new DOMException(HIERARCHY_REQUEST_ERR, 'Unexpected parent node type ' + parent.nodeType);
	}
	// 2. If `node` is a host-including inclusive ancestor of `parent`, then throw a "HierarchyRequestError" DOMException.
	// not implemented!
	// 3. If `child` is non-null and its parent is not `parent`, then throw a "NotFoundError" DOMException.
	if (child && child.parentNode !== parent) {
		throw new DOMException(NOT_FOUND_ERR, 'child not in parent');
	}
	if (
		// 4. If `node` is not a DocumentFragment, DocumentType, Element, or CharacterData node, then throw a "HierarchyRequestError" DOMException.
		!hasInsertableNodeType(node) ||
		// 5. If either `node` is a Text node and `parent` is a document,
		// the sax parser currently adds top level text nodes, this will be fixed in 0.9.0
		// || (node.nodeType === Node.TEXT_NODE && parent.nodeType === Node.DOCUMENT_NODE)
		// or `node` is a doctype and `parent` is not a document, then throw a "HierarchyRequestError" DOMException.
		(isDocTypeNode(node) && parent.nodeType !== Node.DOCUMENT_NODE)
	) {
		throw new DOMException(
			HIERARCHY_REQUEST_ERR,
			'Unexpected node type ' + node.nodeType + ' for parent node type ' + parent.nodeType
		);
	}
}

/**
 * @private
 * Step 6 of the checks before inserting and before replacing a child are different.
 *
 * @param {Document} parent the parent node to insert `node` into
 * @param {Node} node the node to insert
 * @param {Node | undefined} child the node that should become the `nextSibling` of `node`
 * @returns {Node}
 * @throws DOMException for several node combinations that would create a DOM that is not well-formed.
 * @throws DOMException if `child` is provided but is not a child of `parent`.
 * @see https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
 * @see https://dom.spec.whatwg.org/#concept-node-replace
 */
function assertPreInsertionValidityInDocument(parent, node, child) {
	var parentChildNodes = parent.childNodes || [];
	var nodeChildNodes = node.childNodes || [];

	// DocumentFragment
	if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
		var nodeChildElements = nodeChildNodes.filter(isElementNode);
		// If node has more than one element child or has a Text node child.
		if (nodeChildElements.length > 1 || find(nodeChildNodes, isTextNode)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'More than one element or text in fragment');
		}
		// Otherwise, if `node` has one element child and either `parent` has an element child,
		// `child` is a doctype, or `child` is non-null and a doctype is following `child`.
		if (nodeChildElements.length === 1 && !isElementInsertionPossible(parent, child)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Element in fragment can not be inserted before doctype');
		}
	}
	// Element
	if (isElementNode(node)) {
		// `parent` has an element child, `child` is a doctype,
		// or `child` is non-null and a doctype is following `child`.
		if (!isElementInsertionPossible(parent, child)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Only one element can be added and only after doctype');
		}
	}
	// DocumentType
	if (isDocTypeNode(node)) {
		// `parent` has a doctype child,
		if (find(parentChildNodes, isDocTypeNode)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Only one doctype is allowed');
		}
		var parentElementChild = find(parentChildNodes, isElementNode);
		// `child` is non-null and an element is preceding `child`,
		if (child && parentChildNodes.indexOf(parentElementChild) < parentChildNodes.indexOf(child)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Doctype can only be inserted before an element');
		}
		// or `child` is null and `parent` has an element child.
		if (!child && parentElementChild) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Doctype can not be appended since element is present');
		}
	}
}

/**
 * @private
 * Step 6 of the checks before inserting and before replacing a child are different.
 *
 * @param {Document} parent the parent node to insert `node` into
 * @param {Node} node the node to insert
 * @param {Node | undefined} child the node that should become the `nextSibling` of `node`
 * @returns {Node}
 * @throws DOMException for several node combinations that would create a DOM that is not well-formed.
 * @throws DOMException if `child` is provided but is not a child of `parent`.
 * @see https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
 * @see https://dom.spec.whatwg.org/#concept-node-replace
 */
function assertPreReplacementValidityInDocument(parent, node, child) {
	var parentChildNodes = parent.childNodes || [];
	var nodeChildNodes = node.childNodes || [];

	// DocumentFragment
	if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
		var nodeChildElements = nodeChildNodes.filter(isElementNode);
		// If `node` has more than one element child or has a Text node child.
		if (nodeChildElements.length > 1 || find(nodeChildNodes, isTextNode)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'More than one element or text in fragment');
		}
		// Otherwise, if `node` has one element child and either `parent` has an element child that is not `child` or a doctype is following `child`.
		if (nodeChildElements.length === 1 && !isElementReplacementPossible(parent, child)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Element in fragment can not be inserted before doctype');
		}
	}
	// Element
	if (isElementNode(node)) {
		// `parent` has an element child that is not `child` or a doctype is following `child`.
		if (!isElementReplacementPossible(parent, child)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Only one element can be added and only after doctype');
		}
	}
	// DocumentType
	if (isDocTypeNode(node)) {
		function hasDoctypeChildThatIsNotChild(node) {
			return isDocTypeNode(node) && node !== child;
		}

		// `parent` has a doctype child that is not `child`,
		if (find(parentChildNodes, hasDoctypeChildThatIsNotChild)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Only one doctype is allowed');
		}
		var parentElementChild = find(parentChildNodes, isElementNode);
		// or an element is preceding `child`.
		if (child && parentChildNodes.indexOf(parentElementChild) < parentChildNodes.indexOf(child)) {
			throw new DOMException(HIERARCHY_REQUEST_ERR, 'Doctype can only be inserted before an element');
		}
	}
}

/**
 * @private
 * @param {Node} parent the parent node to insert `node` into
 * @param {Node} node the node to insert
 * @param {Node=} child the node that should become the `nextSibling` of `node`
 * @returns {Node}
 * @throws DOMException for several node combinations that would create a DOM that is not well-formed.
 * @throws DOMException if `child` is provided but is not a child of `parent`.
 * @see https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
 */
function _insertBefore(parent, node, child, _inDocumentAssertion) {
	// To ensure pre-insertion validity of a node into a parent before a child, run these steps:
	assertPreInsertionValidity1to5(parent, node, child);

	// If parent is a document, and any of the statements below, switched on the interface node implements,
	// are true, then throw a "HierarchyRequestError" DOMException.
	if (parent.nodeType === Node.DOCUMENT_NODE) {
		(_inDocumentAssertion || assertPreInsertionValidityInDocument)(parent, node, child);
	}

	var cp = node.parentNode;
	if(cp){
		cp.removeChild(node);//remove and update
	}
	if(node.nodeType === DOCUMENT_FRAGMENT_NODE){
		var newFirst = node.firstChild;
		if (newFirst == null) {
			return node;
		}
		var newLast = node.lastChild;
	}else{
		newFirst = newLast = node;
	}
	var pre = child ? child.previousSibling : parent.lastChild;

	newFirst.previousSibling = pre;
	newLast.nextSibling = child;


	if(pre){
		pre.nextSibling = newFirst;
	}else{
		parent.firstChild = newFirst;
	}
	if(child == null){
		parent.lastChild = newLast;
	}else{
		child.previousSibling = newLast;
	}
	do{
		newFirst.parentNode = parent;
	}while(newFirst !== newLast && (newFirst= newFirst.nextSibling))
	_onUpdateChild(parent.ownerDocument||parent, parent);
	//console.log(parent.lastChild.nextSibling == null)
	if (node.nodeType == DOCUMENT_FRAGMENT_NODE) {
		node.firstChild = node.lastChild = null;
	}
	return node;
}

/**
 * Appends `newChild` to `parentNode`.
 * If `newChild` is already connected to a `parentNode` it is first removed from it.
 *
 * @see https://github.com/xmldom/xmldom/issues/135
 * @see https://github.com/xmldom/xmldom/issues/145
 * @param {Node} parentNode
 * @param {Node} newChild
 * @returns {Node}
 * @private
 */
function _appendSingleChild (parentNode, newChild) {
	if (newChild.parentNode) {
		newChild.parentNode.removeChild(newChild);
	}
	newChild.parentNode = parentNode;
	newChild.previousSibling = parentNode.lastChild;
	newChild.nextSibling = null;
	if (newChild.previousSibling) {
		newChild.previousSibling.nextSibling = newChild;
	} else {
		parentNode.firstChild = newChild;
	}
	parentNode.lastChild = newChild;
	_onUpdateChild(parentNode.ownerDocument, parentNode, newChild);
	return newChild;
}

Document.prototype = {
	//implementation : null,
	nodeName :  '#document',
	nodeType :  DOCUMENT_NODE,
	/**
	 * The DocumentType node of the document.
	 *
	 * @readonly
	 * @type DocumentType
	 */
	doctype :  null,
	documentElement :  null,
	_inc : 1,

	insertBefore :  function(newChild, refChild){//raises
		if(newChild.nodeType == DOCUMENT_FRAGMENT_NODE){
			var child = newChild.firstChild;
			while(child){
				var next = child.nextSibling;
				this.insertBefore(child,refChild);
				child = next;
			}
			return newChild;
		}
		_insertBefore(this, newChild, refChild);
		newChild.ownerDocument = this;
		if (this.documentElement === null && newChild.nodeType === ELEMENT_NODE) {
			this.documentElement = newChild;
		}

		return newChild;
	},
	removeChild :  function(oldChild){
		if(this.documentElement == oldChild){
			this.documentElement = null;
		}
		return _removeChild(this,oldChild);
	},
	replaceChild: function (newChild, oldChild) {
		//raises
		_insertBefore(this, newChild, oldChild, assertPreReplacementValidityInDocument);
		newChild.ownerDocument = this;
		if (oldChild) {
			this.removeChild(oldChild);
		}
		if (isElementNode(newChild)) {
			this.documentElement = newChild;
		}
	},
	// Introduced in DOM Level 2:
	importNode : function(importedNode,deep){
		return importNode(this,importedNode,deep);
	},
	// Introduced in DOM Level 2:
	getElementById :	function(id){
		var rtv = null;
		_visitNode(this.documentElement,function(node){
			if(node.nodeType == ELEMENT_NODE){
				if(node.getAttribute('id') == id){
					rtv = node;
					return true;
				}
			}
		})
		return rtv;
	},

	/**
	 * The `getElementsByClassName` method of `Document` interface returns an array-like object
	 * of all child elements which have **all** of the given class name(s).
	 *
	 * Returns an empty list if `classeNames` is an empty string or only contains HTML white space characters.
	 *
	 *
	 * Warning: This is a live LiveNodeList.
	 * Changes in the DOM will reflect in the array as the changes occur.
	 * If an element selected by this array no longer qualifies for the selector,
	 * it will automatically be removed. Be aware of this for iteration purposes.
	 *
	 * @param {string} classNames is a string representing the class name(s) to match; multiple class names are separated by (ASCII-)whitespace
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementsByClassName
	 * @see https://dom.spec.whatwg.org/#concept-getelementsbyclassname
	 */
	getElementsByClassName: function(classNames) {
		var classNamesSet = toOrderedSet(classNames)
		return new LiveNodeList(this, function(base) {
			var ls = [];
			if (classNamesSet.length > 0) {
				_visitNode(base.documentElement, function(node) {
					if(node !== base && node.nodeType === ELEMENT_NODE) {
						var nodeClassNames = node.getAttribute('class')
						// can be null if the attribute does not exist
						if (nodeClassNames) {
							// before splitting and iterating just compare them for the most common case
							var matches = classNames === nodeClassNames;
							if (!matches) {
								var nodeClassNamesSet = toOrderedSet(nodeClassNames)
								matches = classNamesSet.every(arrayIncludes(nodeClassNamesSet))
							}
							if(matches) {
								ls.push(node);
							}
						}
					}
				});
			}
			return ls;
		});
	},

	//document factory method:
	createElement :	function(tagName){
		var node = new Element();
		node.ownerDocument = this;
		node.nodeName = tagName;
		node.tagName = tagName;
		node.localName = tagName;
		node.childNodes = new NodeList();
		var attrs	= node.attributes = new NamedNodeMap();
		attrs._ownerElement = node;
		return node;
	},
	createDocumentFragment :	function(){
		var node = new DocumentFragment();
		node.ownerDocument = this;
		node.childNodes = new NodeList();
		return node;
	},
	createTextNode :	function(data){
		var node = new Text();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createComment :	function(data){
		var node = new Comment();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createCDATASection :	function(data){
		var node = new CDATASection();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createProcessingInstruction :	function(target,data){
		var node = new ProcessingInstruction();
		node.ownerDocument = this;
		node.tagName = node.target = target;
		node.nodeValue= node.data = data;
		return node;
	},
	createAttribute :	function(name){
		var node = new Attr();
		node.ownerDocument	= this;
		node.name = name;
		node.nodeName	= name;
		node.localName = name;
		node.specified = true;
		return node;
	},
	createEntityReference :	function(name){
		var node = new EntityReference();
		node.ownerDocument	= this;
		node.nodeName	= name;
		return node;
	},
	// Introduced in DOM Level 2:
	createElementNS :	function(namespaceURI,qualifiedName){
		var node = new Element();
		var pl = qualifiedName.split(':');
		var attrs	= node.attributes = new NamedNodeMap();
		node.childNodes = new NodeList();
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.tagName = qualifiedName;
		node.namespaceURI = namespaceURI;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		attrs._ownerElement = node;
		return node;
	},
	// Introduced in DOM Level 2:
	createAttributeNS :	function(namespaceURI,qualifiedName){
		var node = new Attr();
		var pl = qualifiedName.split(':');
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.name = qualifiedName;
		node.namespaceURI = namespaceURI;
		node.specified = true;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		return node;
	}
};
_extends(Document,Node);


function Element() {
	this._nsMap = {};
};
Element.prototype = {
	nodeType : ELEMENT_NODE,
	hasAttribute : function(name){
		return this.getAttributeNode(name)!=null;
	},
	getAttribute : function(name){
		var attr = this.getAttributeNode(name);
		return attr && attr.value || '';
	},
	getAttributeNode : function(name){
		return this.attributes.getNamedItem(name);
	},
	setAttribute : function(name, value){
		var attr = this.ownerDocument.createAttribute(name);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr)
	},
	removeAttribute : function(name){
		var attr = this.getAttributeNode(name)
		attr && this.removeAttributeNode(attr);
	},

	//four real opeartion method
	appendChild:function(newChild){
		if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
			return this.insertBefore(newChild,null);
		}else{
			return _appendSingleChild(this,newChild);
		}
	},
	setAttributeNode : function(newAttr){
		return this.attributes.setNamedItem(newAttr);
	},
	setAttributeNodeNS : function(newAttr){
		return this.attributes.setNamedItemNS(newAttr);
	},
	removeAttributeNode : function(oldAttr){
		//console.log(this == oldAttr.ownerElement)
		return this.attributes.removeNamedItem(oldAttr.nodeName);
	},
	//get real attribute name,and remove it by removeAttributeNode
	removeAttributeNS : function(namespaceURI, localName){
		var old = this.getAttributeNodeNS(namespaceURI, localName);
		old && this.removeAttributeNode(old);
	},

	hasAttributeNS : function(namespaceURI, localName){
		return this.getAttributeNodeNS(namespaceURI, localName)!=null;
	},
	getAttributeNS : function(namespaceURI, localName){
		var attr = this.getAttributeNodeNS(namespaceURI, localName);
		return attr && attr.value || '';
	},
	setAttributeNS : function(namespaceURI, qualifiedName, value){
		var attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr)
	},
	getAttributeNodeNS : function(namespaceURI, localName){
		return this.attributes.getNamedItemNS(namespaceURI, localName);
	},

	getElementsByTagName : function(tagName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType == ELEMENT_NODE && (tagName === '*' || node.tagName == tagName)){
					ls.push(node);
				}
			});
			return ls;
		});
	},
	getElementsByTagNameNS : function(namespaceURI, localName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType === ELEMENT_NODE && (namespaceURI === '*' || node.namespaceURI === namespaceURI) && (localName === '*' || node.localName == localName)){
					ls.push(node);
				}
			});
			return ls;

		});
	}
};
Document.prototype.getElementsByTagName = Element.prototype.getElementsByTagName;
Document.prototype.getElementsByTagNameNS = Element.prototype.getElementsByTagNameNS;


_extends(Element,Node);
function Attr() {
};
Attr.prototype.nodeType = ATTRIBUTE_NODE;
_extends(Attr,Node);


function CharacterData() {
};
CharacterData.prototype = {
	data : '',
	substringData : function(offset, count) {
		return this.data.substring(offset, offset+count);
	},
	appendData: function(text) {
		text = this.data+text;
		this.nodeValue = this.data = text;
		this.length = text.length;
	},
	insertData: function(offset,text) {
		this.replaceData(offset,0,text);

	},
	appendChild:function(newChild){
		throw new Error(ExceptionMessage[HIERARCHY_REQUEST_ERR])
	},
	deleteData: function(offset, count) {
		this.replaceData(offset,count,"");
	},
	replaceData: function(offset, count, text) {
		var start = this.data.substring(0,offset);
		var end = this.data.substring(offset+count);
		text = start + text + end;
		this.nodeValue = this.data = text;
		this.length = text.length;
	}
}
_extends(CharacterData,Node);
function Text() {
};
Text.prototype = {
	nodeName : "#text",
	nodeType : TEXT_NODE,
	splitText : function(offset) {
		var text = this.data;
		var newText = text.substring(offset);
		text = text.substring(0, offset);
		this.data = this.nodeValue = text;
		this.length = text.length;
		var newNode = this.ownerDocument.createTextNode(newText);
		if(this.parentNode){
			this.parentNode.insertBefore(newNode, this.nextSibling);
		}
		return newNode;
	}
}
_extends(Text,CharacterData);
function Comment() {
};
Comment.prototype = {
	nodeName : "#comment",
	nodeType : COMMENT_NODE
}
_extends(Comment,CharacterData);

function CDATASection() {
};
CDATASection.prototype = {
	nodeName : "#cdata-section",
	nodeType : CDATA_SECTION_NODE
}
_extends(CDATASection,CharacterData);


function DocumentType() {
};
DocumentType.prototype.nodeType = DOCUMENT_TYPE_NODE;
_extends(DocumentType,Node);

function Notation() {
};
Notation.prototype.nodeType = NOTATION_NODE;
_extends(Notation,Node);

function Entity() {
};
Entity.prototype.nodeType = ENTITY_NODE;
_extends(Entity,Node);

function EntityReference() {
};
EntityReference.prototype.nodeType = ENTITY_REFERENCE_NODE;
_extends(EntityReference,Node);

function DocumentFragment() {
};
DocumentFragment.prototype.nodeName =	"#document-fragment";
DocumentFragment.prototype.nodeType =	DOCUMENT_FRAGMENT_NODE;
_extends(DocumentFragment,Node);


function ProcessingInstruction() {
}
ProcessingInstruction.prototype.nodeType = PROCESSING_INSTRUCTION_NODE;
_extends(ProcessingInstruction,Node);
function XMLSerializer(){}
XMLSerializer.prototype.serializeToString = function(node,isHtml,nodeFilter){
	return nodeSerializeToString.call(node,isHtml,nodeFilter);
}
Node.prototype.toString = nodeSerializeToString;
function nodeSerializeToString(isHtml,nodeFilter){
	var buf = [];
	var refNode = this.nodeType == 9 && this.documentElement || this;
	var prefix = refNode.prefix;
	var uri = refNode.namespaceURI;

	if(uri && prefix == null){
		//console.log(prefix)
		var prefix = refNode.lookupPrefix(uri);
		if(prefix == null){
			//isHTML = true;
			var visibleNamespaces=[
			{namespace:uri,prefix:null}
			//{namespace:uri,prefix:''}
			]
		}
	}
	serializeToString(this,buf,isHtml,nodeFilter,visibleNamespaces);
	//console.log('###',this.nodeType,uri,prefix,buf.join(''))
	return buf.join('');
}

function needNamespaceDefine(node, isHTML, visibleNamespaces) {
	var prefix = node.prefix || '';
	var uri = node.namespaceURI;
	// According to [Namespaces in XML 1.0](https://www.w3.org/TR/REC-xml-names/#ns-using) ,
	// and more specifically https://www.w3.org/TR/REC-xml-names/#nsc-NoPrefixUndecl :
	// > In a namespace declaration for a prefix [...], the attribute value MUST NOT be empty.
	// in a similar manner [Namespaces in XML 1.1](https://www.w3.org/TR/xml-names11/#ns-using)
	// and more specifically https://www.w3.org/TR/xml-names11/#nsc-NSDeclared :
	// > [...] Furthermore, the attribute value [...] must not be an empty string.
	// so serializing empty namespace value like xmlns:ds="" would produce an invalid XML document.
	if (!uri) {
		return false;
	}
	if (prefix === "xml" && uri === NAMESPACE.XML || uri === NAMESPACE.XMLNS) {
		return false;
	}

	var i = visibleNamespaces.length
	while (i--) {
		var ns = visibleNamespaces[i];
		// get namespace prefix
		if (ns.prefix === prefix) {
			return ns.namespace !== uri;
		}
	}
	return true;
}
/**
 * Well-formed constraint: No < in Attribute Values
 * > The replacement text of any entity referred to directly or indirectly
 * > in an attribute value must not contain a <.
 * @see https://www.w3.org/TR/xml11/#CleanAttrVals
 * @see https://www.w3.org/TR/xml11/#NT-AttValue
 *
 * Literal whitespace other than space that appear in attribute values
 * are serialized as their entity references, so they will be preserved.
 * (In contrast to whitespace literals in the input which are normalized to spaces)
 * @see https://www.w3.org/TR/xml11/#AVNormalize
 * @see https://w3c.github.io/DOM-Parsing/#serializing-an-element-s-attributes
 */
function addSerializedAttribute(buf, qualifiedName, value) {
	buf.push(' ', qualifiedName, '="', value.replace(/[<>&"\t\n\r]/g, _xmlEncoder), '"')
}

function serializeToString(node,buf,isHTML,nodeFilter,visibleNamespaces){
	if (!visibleNamespaces) {
		visibleNamespaces = [];
	}

	if(nodeFilter){
		node = nodeFilter(node);
		if(node){
			if(typeof node == 'string'){
				buf.push(node);
				return;
			}
		}else{
			return;
		}
		//buf.sort.apply(attrs, attributeSorter);
	}

	switch(node.nodeType){
	case ELEMENT_NODE:
		var attrs = node.attributes;
		var len = attrs.length;
		var child = node.firstChild;
		var nodeName = node.tagName;

		isHTML = NAMESPACE.isHTML(node.namespaceURI) || isHTML

		var prefixedNodeName = nodeName
		if (!isHTML && !node.prefix && node.namespaceURI) {
			var defaultNS
			// lookup current default ns from `xmlns` attribute
			for (var ai = 0; ai < attrs.length; ai++) {
				if (attrs.item(ai).name === 'xmlns') {
					defaultNS = attrs.item(ai).value
					break
				}
			}
			if (!defaultNS) {
				// lookup current default ns in visibleNamespaces
				for (var nsi = visibleNamespaces.length - 1; nsi >= 0; nsi--) {
					var namespace = visibleNamespaces[nsi]
					if (namespace.prefix === '' && namespace.namespace === node.namespaceURI) {
						defaultNS = namespace.namespace
						break
					}
				}
			}
			if (defaultNS !== node.namespaceURI) {
				for (var nsi = visibleNamespaces.length - 1; nsi >= 0; nsi--) {
					var namespace = visibleNamespaces[nsi]
					if (namespace.namespace === node.namespaceURI) {
						if (namespace.prefix) {
							prefixedNodeName = namespace.prefix + ':' + nodeName
						}
						break
					}
				}
			}
		}

		buf.push('<', prefixedNodeName);

		for(var i=0;i<len;i++){
			// add namespaces for attributes
			var attr = attrs.item(i);
			if (attr.prefix == 'xmlns') {
				visibleNamespaces.push({ prefix: attr.localName, namespace: attr.value });
			}else if(attr.nodeName == 'xmlns'){
				visibleNamespaces.push({ prefix: '', namespace: attr.value });
			}
		}

		for(var i=0;i<len;i++){
			var attr = attrs.item(i);
			if (needNamespaceDefine(attr,isHTML, visibleNamespaces)) {
				var prefix = attr.prefix||'';
				var uri = attr.namespaceURI;
				addSerializedAttribute(buf, prefix ? 'xmlns:' + prefix : "xmlns", uri);
				visibleNamespaces.push({ prefix: prefix, namespace:uri });
			}
			serializeToString(attr,buf,isHTML,nodeFilter,visibleNamespaces);
		}

		// add namespace for current node
		if (nodeName === prefixedNodeName && needNamespaceDefine(node, isHTML, visibleNamespaces)) {
			var prefix = node.prefix||'';
			var uri = node.namespaceURI;
			addSerializedAttribute(buf, prefix ? 'xmlns:' + prefix : "xmlns", uri);
			visibleNamespaces.push({ prefix: prefix, namespace:uri });
		}

		if(child || isHTML && !/^(?:meta|link|img|br|hr|input)$/i.test(nodeName)){
			buf.push('>');
			//if is cdata child node
			if(isHTML && /^script$/i.test(nodeName)){
				while(child){
					if(child.data){
						buf.push(child.data);
					}else{
						serializeToString(child, buf, isHTML, nodeFilter, visibleNamespaces.slice());
					}
					child = child.nextSibling;
				}
			}else
			{
				while(child){
					serializeToString(child, buf, isHTML, nodeFilter, visibleNamespaces.slice());
					child = child.nextSibling;
				}
			}
			buf.push('</',prefixedNodeName,'>');
		}else{
			buf.push('/>');
		}
		// remove added visible namespaces
		//visibleNamespaces.length = startVisibleNamespaces;
		return;
	case DOCUMENT_NODE:
	case DOCUMENT_FRAGMENT_NODE:
		var child = node.firstChild;
		while(child){
			serializeToString(child, buf, isHTML, nodeFilter, visibleNamespaces.slice());
			child = child.nextSibling;
		}
		return;
	case ATTRIBUTE_NODE:
		return addSerializedAttribute(buf, node.name, node.value);
	case TEXT_NODE:
		/**
		 * The ampersand character (&) and the left angle bracket (<) must not appear in their literal form,
		 * except when used as markup delimiters, or within a comment, a processing instruction, or a CDATA section.
		 * If they are needed elsewhere, they must be escaped using either numeric character references or the strings
		 * `&amp;` and `&lt;` respectively.
		 * The right angle bracket (>) may be represented using the string " &gt; ", and must, for compatibility,
		 * be escaped using either `&gt;` or a character reference when it appears in the string `]]>` in content,
		 * when that string is not marking the end of a CDATA section.
		 *
		 * In the content of elements, character data is any string of characters
		 * which does not contain the start-delimiter of any markup
		 * and does not include the CDATA-section-close delimiter, `]]>`.
		 *
		 * @see https://www.w3.org/TR/xml/#NT-CharData
		 * @see https://w3c.github.io/DOM-Parsing/#xml-serializing-a-text-node
		 */
		return buf.push(node.data
			.replace(/[<&>]/g,_xmlEncoder)
		);
	case CDATA_SECTION_NODE:
		return buf.push( '<![CDATA[',node.data,']]>');
	case COMMENT_NODE:
		return buf.push( "<!--",node.data,"-->");
	case DOCUMENT_TYPE_NODE:
		var pubid = node.publicId;
		var sysid = node.systemId;
		buf.push('<!DOCTYPE ',node.name);
		if(pubid){
			buf.push(' PUBLIC ', pubid);
			if (sysid && sysid!='.') {
				buf.push(' ', sysid);
			}
			buf.push('>');
		}else if(sysid && sysid!='.'){
			buf.push(' SYSTEM ', sysid, '>');
		}else{
			var sub = node.internalSubset;
			if(sub){
				buf.push(" [",sub,"]");
			}
			buf.push(">");
		}
		return;
	case PROCESSING_INSTRUCTION_NODE:
		return buf.push( "<?",node.target," ",node.data,"?>");
	case ENTITY_REFERENCE_NODE:
		return buf.push( '&',node.nodeName,';');
	//case ENTITY_NODE:
	//case NOTATION_NODE:
	default:
		buf.push('??',node.nodeName);
	}
}
function importNode(doc,node,deep){
	var node2;
	switch (node.nodeType) {
	case ELEMENT_NODE:
		node2 = node.cloneNode(false);
		node2.ownerDocument = doc;
		//var attrs = node2.attributes;
		//var len = attrs.length;
		//for(var i=0;i<len;i++){
			//node2.setAttributeNodeNS(importNode(doc,attrs.item(i),deep));
		//}
	case DOCUMENT_FRAGMENT_NODE:
		break;
	case ATTRIBUTE_NODE:
		deep = true;
		break;
	//case ENTITY_REFERENCE_NODE:
	//case PROCESSING_INSTRUCTION_NODE:
	////case TEXT_NODE:
	//case CDATA_SECTION_NODE:
	//case COMMENT_NODE:
	//	deep = false;
	//	break;
	//case DOCUMENT_NODE:
	//case DOCUMENT_TYPE_NODE:
	//cannot be imported.
	//case ENTITY_NODE:
	//case NOTATION_NODE：
	//can not hit in level3
	//default:throw e;
	}
	if(!node2){
		node2 = node.cloneNode(false);//false
	}
	node2.ownerDocument = doc;
	node2.parentNode = null;
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(importNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}
//
//var _relationMap = {firstChild:1,lastChild:1,previousSibling:1,nextSibling:1,
//					attributes:1,childNodes:1,parentNode:1,documentElement:1,doctype,};
function cloneNode(doc,node,deep){
	var node2 = new node.constructor();
	for (var n in node) {
		if (Object.prototype.hasOwnProperty.call(node, n)) {
			var v = node[n];
			if (typeof v != "object") {
				if (v != node2[n]) {
					node2[n] = v;
				}
			}
		}
	}
	if(node.childNodes){
		node2.childNodes = new NodeList();
	}
	node2.ownerDocument = doc;
	switch (node2.nodeType) {
	case ELEMENT_NODE:
		var attrs	= node.attributes;
		var attrs2	= node2.attributes = new NamedNodeMap();
		var len = attrs.length
		attrs2._ownerElement = node2;
		for(var i=0;i<len;i++){
			node2.setAttributeNode(cloneNode(doc,attrs.item(i),true));
		}
		break;;
	case ATTRIBUTE_NODE:
		deep = true;
	}
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(cloneNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}

function __set__(object,key,value){
	object[key] = value
}
//do dynamic
try{
	if(Object.defineProperty){
		Object.defineProperty(LiveNodeList.prototype,'length',{
			get:function(){
				_updateLiveList(this);
				return this.$$length;
			}
		});

		Object.defineProperty(Node.prototype,'textContent',{
			get:function(){
				return getTextContent(this);
			},

			set:function(data){
				switch(this.nodeType){
				case ELEMENT_NODE:
				case DOCUMENT_FRAGMENT_NODE:
					while(this.firstChild){
						this.removeChild(this.firstChild);
					}
					if(data || String(data)){
						this.appendChild(this.ownerDocument.createTextNode(data));
					}
					break;

				default:
					this.data = data;
					this.value = data;
					this.nodeValue = data;
				}
			}
		})

		function getTextContent(node){
			switch(node.nodeType){
			case ELEMENT_NODE:
			case DOCUMENT_FRAGMENT_NODE:
				var buf = [];
				node = node.firstChild;
				while(node){
					if(node.nodeType!==7 && node.nodeType !==8){
						buf.push(getTextContent(node));
					}
					node = node.nextSibling;
				}
				return buf.join('');
			default:
				return node.nodeValue;
			}
		}

		__set__ = function(object,key,value){
			//console.log(value)
			object['$$'+key] = value
		}
	}
}catch(e){//ie8
}

//if(typeof require == 'function'){
	exports.DocumentType = DocumentType;
	exports.DOMException = DOMException;
	exports.DOMImplementation = DOMImplementation;
	exports.Element = Element;
	exports.Node = Node;
	exports.NodeList = NodeList;
	exports.XMLSerializer = XMLSerializer;
//}

},{"./conventions":41}],44:[function(require,module,exports){
var freeze = require('./conventions').freeze;

/**
 * The entities that are predefined in every XML document.
 *
 * @see https://www.w3.org/TR/2006/REC-xml11-20060816/#sec-predefined-ent W3C XML 1.1
 * @see https://www.w3.org/TR/2008/REC-xml-20081126/#sec-predefined-ent W3C XML 1.0
 * @see https://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references#Predefined_entities_in_XML Wikipedia
 */
exports.XML_ENTITIES = freeze({amp:'&', apos:"'", gt:'>', lt:'<', quot:'"'})

/**
 * A map of currently 241 entities that are detected in an HTML document.
 * They contain all entries from `XML_ENTITIES`.
 *
 * @see XML_ENTITIES
 * @see DOMParser.parseFromString
 * @see DOMImplementation.prototype.createHTMLDocument
 * @see https://html.spec.whatwg.org/#named-character-references WHATWG HTML(5) Spec
 * @see https://www.w3.org/TR/xml-entity-names/ W3C XML Entity Names
 * @see https://www.w3.org/TR/html4/sgml/entities.html W3C HTML4/SGML
 * @see https://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references#Character_entity_references_in_HTML Wikipedia (HTML)
 * @see https://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references#Entities_representing_special_characters_in_XHTML Wikpedia (XHTML)
 */
exports.HTML_ENTITIES = freeze({
       lt: '<',
       gt: '>',
       amp: '&',
       quot: '"',
       apos: "'",
       Agrave: "À",
       Aacute: "Á",
       Acirc: "Â",
       Atilde: "Ã",
       Auml: "Ä",
       Aring: "Å",
       AElig: "Æ",
       Ccedil: "Ç",
       Egrave: "È",
       Eacute: "É",
       Ecirc: "Ê",
       Euml: "Ë",
       Igrave: "Ì",
       Iacute: "Í",
       Icirc: "Î",
       Iuml: "Ï",
       ETH: "Ð",
       Ntilde: "Ñ",
       Ograve: "Ò",
       Oacute: "Ó",
       Ocirc: "Ô",
       Otilde: "Õ",
       Ouml: "Ö",
       Oslash: "Ø",
       Ugrave: "Ù",
       Uacute: "Ú",
       Ucirc: "Û",
       Uuml: "Ü",
       Yacute: "Ý",
       THORN: "Þ",
       szlig: "ß",
       agrave: "à",
       aacute: "á",
       acirc: "â",
       atilde: "ã",
       auml: "ä",
       aring: "å",
       aelig: "æ",
       ccedil: "ç",
       egrave: "è",
       eacute: "é",
       ecirc: "ê",
       euml: "ë",
       igrave: "ì",
       iacute: "í",
       icirc: "î",
       iuml: "ï",
       eth: "ð",
       ntilde: "ñ",
       ograve: "ò",
       oacute: "ó",
       ocirc: "ô",
       otilde: "õ",
       ouml: "ö",
       oslash: "ø",
       ugrave: "ù",
       uacute: "ú",
       ucirc: "û",
       uuml: "ü",
       yacute: "ý",
       thorn: "þ",
       yuml: "ÿ",
       nbsp: "\u00a0",
       iexcl: "¡",
       cent: "¢",
       pound: "£",
       curren: "¤",
       yen: "¥",
       brvbar: "¦",
       sect: "§",
       uml: "¨",
       copy: "©",
       ordf: "ª",
       laquo: "«",
       not: "¬",
       shy: "­­",
       reg: "®",
       macr: "¯",
       deg: "°",
       plusmn: "±",
       sup2: "²",
       sup3: "³",
       acute: "´",
       micro: "µ",
       para: "¶",
       middot: "·",
       cedil: "¸",
       sup1: "¹",
       ordm: "º",
       raquo: "»",
       frac14: "¼",
       frac12: "½",
       frac34: "¾",
       iquest: "¿",
       times: "×",
       divide: "÷",
       forall: "∀",
       part: "∂",
       exist: "∃",
       empty: "∅",
       nabla: "∇",
       isin: "∈",
       notin: "∉",
       ni: "∋",
       prod: "∏",
       sum: "∑",
       minus: "−",
       lowast: "∗",
       radic: "√",
       prop: "∝",
       infin: "∞",
       ang: "∠",
       and: "∧",
       or: "∨",
       cap: "∩",
       cup: "∪",
       'int': "∫",
       there4: "∴",
       sim: "∼",
       cong: "≅",
       asymp: "≈",
       ne: "≠",
       equiv: "≡",
       le: "≤",
       ge: "≥",
       sub: "⊂",
       sup: "⊃",
       nsub: "⊄",
       sube: "⊆",
       supe: "⊇",
       oplus: "⊕",
       otimes: "⊗",
       perp: "⊥",
       sdot: "⋅",
       Alpha: "Α",
       Beta: "Β",
       Gamma: "Γ",
       Delta: "Δ",
       Epsilon: "Ε",
       Zeta: "Ζ",
       Eta: "Η",
       Theta: "Θ",
       Iota: "Ι",
       Kappa: "Κ",
       Lambda: "Λ",
       Mu: "Μ",
       Nu: "Ν",
       Xi: "Ξ",
       Omicron: "Ο",
       Pi: "Π",
       Rho: "Ρ",
       Sigma: "Σ",
       Tau: "Τ",
       Upsilon: "Υ",
       Phi: "Φ",
       Chi: "Χ",
       Psi: "Ψ",
       Omega: "Ω",
       alpha: "α",
       beta: "β",
       gamma: "γ",
       delta: "δ",
       epsilon: "ε",
       zeta: "ζ",
       eta: "η",
       theta: "θ",
       iota: "ι",
       kappa: "κ",
       lambda: "λ",
       mu: "μ",
       nu: "ν",
       xi: "ξ",
       omicron: "ο",
       pi: "π",
       rho: "ρ",
       sigmaf: "ς",
       sigma: "σ",
       tau: "τ",
       upsilon: "υ",
       phi: "φ",
       chi: "χ",
       psi: "ψ",
       omega: "ω",
       thetasym: "ϑ",
       upsih: "ϒ",
       piv: "ϖ",
       OElig: "Œ",
       oelig: "œ",
       Scaron: "Š",
       scaron: "š",
       Yuml: "Ÿ",
       fnof: "ƒ",
       circ: "ˆ",
       tilde: "˜",
       ensp: " ",
       emsp: " ",
       thinsp: " ",
       zwnj: "‌",
       zwj: "‍",
       lrm: "‎",
       rlm: "‏",
       ndash: "–",
       mdash: "—",
       lsquo: "‘",
       rsquo: "’",
       sbquo: "‚",
       ldquo: "“",
       rdquo: "”",
       bdquo: "„",
       dagger: "†",
       Dagger: "‡",
       bull: "•",
       hellip: "…",
       permil: "‰",
       prime: "′",
       Prime: "″",
       lsaquo: "‹",
       rsaquo: "›",
       oline: "‾",
       euro: "€",
       trade: "™",
       larr: "←",
       uarr: "↑",
       rarr: "→",
       darr: "↓",
       harr: "↔",
       crarr: "↵",
       lceil: "⌈",
       rceil: "⌉",
       lfloor: "⌊",
       rfloor: "⌋",
       loz: "◊",
       spades: "♠",
       clubs: "♣",
       hearts: "♥",
       diams: "♦"
});

/**
 * @deprecated use `HTML_ENTITIES` instead
 * @see HTML_ENTITIES
 */
exports.entityMap = exports.HTML_ENTITIES

},{"./conventions":41}],45:[function(require,module,exports){
var dom = require('./dom')
exports.DOMImplementation = dom.DOMImplementation
exports.XMLSerializer = dom.XMLSerializer
exports.DOMParser = require('./dom-parser').DOMParser

},{"./dom":43,"./dom-parser":42}],46:[function(require,module,exports){
var NAMESPACE = require("./conventions").NAMESPACE;

//[4]   	NameStartChar	   ::=   	":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
//[4a]   	NameChar	   ::=   	NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
//[5]   	Name	   ::=   	NameStartChar (NameChar)*
var nameStartChar = /[A-Z_a-z\xC0-\xD6\xD8-\xF6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]///\u10000-\uEFFFF
var nameChar = new RegExp("[\\-\\.0-9"+nameStartChar.source.slice(1,-1)+"\\u00B7\\u0300-\\u036F\\u203F-\\u2040]");
var tagNamePattern = new RegExp('^'+nameStartChar.source+nameChar.source+'*(?:\:'+nameStartChar.source+nameChar.source+'*)?$');
//var tagNamePattern = /^[a-zA-Z_][\w\-\.]*(?:\:[a-zA-Z_][\w\-\.]*)?$/
//var handlers = 'resolveEntity,getExternalSubset,characters,endDocument,endElement,endPrefixMapping,ignorableWhitespace,processingInstruction,setDocumentLocator,skippedEntity,startDocument,startElement,startPrefixMapping,notationDecl,unparsedEntityDecl,error,fatalError,warning,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,comment,endCDATA,endDTD,endEntity,startCDATA,startDTD,startEntity'.split(',')

//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
var S_TAG = 0;//tag name offerring
var S_ATTR = 1;//attr name offerring
var S_ATTR_SPACE=2;//attr name end and space offer
var S_EQ = 3;//=space?
var S_ATTR_NOQUOT_VALUE = 4;//attr value(no quot value only)
var S_ATTR_END = 5;//attr value end and no space(quot end)
var S_TAG_SPACE = 6;//(attr value end || tag end ) && (space offer)
var S_TAG_CLOSE = 7;//closed el<el />

/**
 * Creates an error that will not be caught by XMLReader aka the SAX parser.
 *
 * @param {string} message
 * @param {any?} locator Optional, can provide details about the location in the source
 * @constructor
 */
function ParseError(message, locator) {
	this.message = message
	this.locator = locator
	if(Error.captureStackTrace) Error.captureStackTrace(this, ParseError);
}
ParseError.prototype = new Error();
ParseError.prototype.name = ParseError.name

function XMLReader(){

}

XMLReader.prototype = {
	parse:function(source,defaultNSMap,entityMap){
		var domBuilder = this.domBuilder;
		domBuilder.startDocument();
		_copy(defaultNSMap ,defaultNSMap = {})
		parse(source,defaultNSMap,entityMap,
				domBuilder,this.errorHandler);
		domBuilder.endDocument();
	}
}
function parse(source,defaultNSMapCopy,entityMap,domBuilder,errorHandler){
	function fixedFromCharCode(code) {
		// String.prototype.fromCharCode does not supports
		// > 2 bytes unicode chars directly
		if (code > 0xffff) {
			code -= 0x10000;
			var surrogate1 = 0xd800 + (code >> 10)
				, surrogate2 = 0xdc00 + (code & 0x3ff);

			return String.fromCharCode(surrogate1, surrogate2);
		} else {
			return String.fromCharCode(code);
		}
	}
	function entityReplacer(a){
		var k = a.slice(1,-1);
		if (Object.hasOwnProperty.call(entityMap, k)) {
			return entityMap[k];
		}else if(k.charAt(0) === '#'){
			return fixedFromCharCode(parseInt(k.substr(1).replace('x','0x')))
		}else{
			errorHandler.error('entity not found:'+a);
			return a;
		}
	}
	function appendText(end){//has some bugs
		if(end>start){
			var xt = source.substring(start,end).replace(/&#?\w+;/g,entityReplacer);
			locator&&position(start);
			domBuilder.characters(xt,0,end-start);
			start = end
		}
	}
	function position(p,m){
		while(p>=lineEnd && (m = linePattern.exec(source))){
			lineStart = m.index;
			lineEnd = lineStart + m[0].length;
			locator.lineNumber++;
			//console.log('line++:',locator,startPos,endPos)
		}
		locator.columnNumber = p-lineStart+1;
	}
	var lineStart = 0;
	var lineEnd = 0;
	var linePattern = /.*(?:\r\n?|\n)|.*$/g
	var locator = domBuilder.locator;

	var parseStack = [{currentNSMap:defaultNSMapCopy}]
	var closeMap = {};
	var start = 0;
	while(true){
		try{
			var tagStart = source.indexOf('<',start);
			if(tagStart<0){
				if(!source.substr(start).match(/^\s*$/)){
					var doc = domBuilder.doc;
	    			var text = doc.createTextNode(source.substr(start));
	    			doc.appendChild(text);
	    			domBuilder.currentElement = text;
				}
				return;
			}
			if(tagStart>start){
				appendText(tagStart);
			}
			switch(source.charAt(tagStart+1)){
			case '/':
				var end = source.indexOf('>',tagStart+3);
				var tagName = source.substring(tagStart + 2, end).replace(/[ \t\n\r]+$/g, '');
				var config = parseStack.pop();
				if(end<0){

	        		tagName = source.substring(tagStart+2).replace(/[\s<].*/,'');
	        		errorHandler.error("end tag name: "+tagName+' is not complete:'+config.tagName);
	        		end = tagStart+1+tagName.length;
	        	}else if(tagName.match(/\s</)){
	        		tagName = tagName.replace(/[\s<].*/,'');
	        		errorHandler.error("end tag name: "+tagName+' maybe not complete');
	        		end = tagStart+1+tagName.length;
				}
				var localNSMap = config.localNSMap;
				var endMatch = config.tagName == tagName;
				var endIgnoreCaseMach = endMatch || config.tagName&&config.tagName.toLowerCase() == tagName.toLowerCase()
		        if(endIgnoreCaseMach){
		        	domBuilder.endElement(config.uri,config.localName,tagName);
					if(localNSMap){
						for (var prefix in localNSMap) {
							if (Object.prototype.hasOwnProperty.call(localNSMap, prefix)) {
								domBuilder.endPrefixMapping(prefix);
							}
						}
					}
					if(!endMatch){
		            	errorHandler.fatalError("end tag name: "+tagName+' is not match the current start tagName:'+config.tagName ); // No known test case
					}
		        }else{
		        	parseStack.push(config)
		        }

				end++;
				break;
				// end elment
			case '?':// <?...?>
				locator&&position(tagStart);
				end = parseInstruction(source,tagStart,domBuilder);
				break;
			case '!':// <!doctype,<![CDATA,<!--
				locator&&position(tagStart);
				end = parseDCC(source,tagStart,domBuilder,errorHandler);
				break;
			default:
				locator&&position(tagStart);
				var el = new ElementAttributes();
				var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
				//elStartEnd
				var end = parseElementStartPart(source,tagStart,el,currentNSMap,entityReplacer,errorHandler);
				var len = el.length;


				if(!el.closed && fixSelfClosed(source,end,el.tagName,closeMap)){
					el.closed = true;
					if(!entityMap.nbsp){
						errorHandler.warning('unclosed xml attribute');
					}
				}
				if(locator && len){
					var locator2 = copyLocator(locator,{});
					//try{//attribute position fixed
					for(var i = 0;i<len;i++){
						var a = el[i];
						position(a.offset);
						a.locator = copyLocator(locator,{});
					}
					domBuilder.locator = locator2
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el)
					}
					domBuilder.locator = locator;
				}else{
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el)
					}
				}

				if (NAMESPACE.isHTML(el.uri) && !el.closed) {
					end = parseHtmlSpecialContent(source,end,el.tagName,entityReplacer,domBuilder)
				} else {
					end++;
				}
			}
		}catch(e){
			if (e instanceof ParseError) {
				throw e;
			}
			errorHandler.error('element parse error: '+e)
			end = -1;
		}
		if(end>start){
			start = end;
		}else{
			//TODO: 这里有可能sax回退，有位置错误风险
			appendText(Math.max(tagStart,start)+1);
		}
	}
}
function copyLocator(f,t){
	t.lineNumber = f.lineNumber;
	t.columnNumber = f.columnNumber;
	return t;
}

/**
 * @see #appendElement(source,elStartEnd,el,selfClosed,entityReplacer,domBuilder,parseStack);
 * @return end of the elementStartPart(end of elementEndPart for selfClosed el)
 */
function parseElementStartPart(source,start,el,currentNSMap,entityReplacer,errorHandler){

	/**
	 * @param {string} qname
	 * @param {string} value
	 * @param {number} startIndex
	 */
	function addAttribute(qname, value, startIndex) {
		if (el.attributeNames.hasOwnProperty(qname)) {
			errorHandler.fatalError('Attribute ' + qname + ' redefined')
		}
		el.addValue(
			qname,
			// @see https://www.w3.org/TR/xml/#AVNormalize
			// since the xmldom sax parser does not "interpret" DTD the following is not implemented:
			// - recursive replacement of (DTD) entity references
			// - trimming and collapsing multiple spaces into a single one for attributes that are not of type CDATA
			value.replace(/[\t\n\r]/g, ' ').replace(/&#?\w+;/g, entityReplacer),
			startIndex
		)
	}
	var attrName;
	var value;
	var p = ++start;
	var s = S_TAG;//status
	while(true){
		var c = source.charAt(p);
		switch(c){
		case '=':
			if(s === S_ATTR){//attrName
				attrName = source.slice(start,p);
				s = S_EQ;
			}else if(s === S_ATTR_SPACE){
				s = S_EQ;
			}else{
				//fatalError: equal must after attrName or space after attrName
				throw new Error('attribute equal must after attrName'); // No known test case
			}
			break;
		case '\'':
		case '"':
			if(s === S_EQ || s === S_ATTR //|| s == S_ATTR_SPACE
				){//equal
				if(s === S_ATTR){
					errorHandler.warning('attribute value must after "="')
					attrName = source.slice(start,p)
				}
				start = p+1;
				p = source.indexOf(c,start)
				if(p>0){
					value = source.slice(start, p);
					addAttribute(attrName, value, start-1);
					s = S_ATTR_END;
				}else{
					//fatalError: no end quot match
					throw new Error('attribute value no end \''+c+'\' match');
				}
			}else if(s == S_ATTR_NOQUOT_VALUE){
				value = source.slice(start, p);
				addAttribute(attrName, value, start);
				errorHandler.warning('attribute "'+attrName+'" missed start quot('+c+')!!');
				start = p+1;
				s = S_ATTR_END
			}else{
				//fatalError: no equal before
				throw new Error('attribute value must after "="'); // No known test case
			}
			break;
		case '/':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				s =S_TAG_CLOSE;
				el.closed = true;
			case S_ATTR_NOQUOT_VALUE:
			case S_ATTR:
			case S_ATTR_SPACE:
				break;
			//case S_EQ:
			default:
				throw new Error("attribute invalid close char('/')") // No known test case
			}
			break;
		case ''://end document
			errorHandler.error('unexpected end of input');
			if(s == S_TAG){
				el.setTagName(source.slice(start,p));
			}
			return p;
		case '>':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				break;//normal
			case S_ATTR_NOQUOT_VALUE://Compatible state
			case S_ATTR:
				value = source.slice(start,p);
				if(value.slice(-1) === '/'){
					el.closed  = true;
					value = value.slice(0,-1)
				}
			case S_ATTR_SPACE:
				if(s === S_ATTR_SPACE){
					value = attrName;
				}
				if(s == S_ATTR_NOQUOT_VALUE){
					errorHandler.warning('attribute "'+value+'" missed quot(")!');
					addAttribute(attrName, value, start)
				}else{
					if(!NAMESPACE.isHTML(currentNSMap['']) || !value.match(/^(?:disabled|checked|selected)$/i)){
						errorHandler.warning('attribute "'+value+'" missed value!! "'+value+'" instead!!')
					}
					addAttribute(value, value, start)
				}
				break;
			case S_EQ:
				throw new Error('attribute value missed!!');
			}
//			console.log(tagName,tagNamePattern,tagNamePattern.test(tagName))
			return p;
		/*xml space '\x20' | #x9 | #xD | #xA; */
		case '\u0080':
			c = ' ';
		default:
			if(c<= ' '){//space
				switch(s){
				case S_TAG:
					el.setTagName(source.slice(start,p));//tagName
					s = S_TAG_SPACE;
					break;
				case S_ATTR:
					attrName = source.slice(start,p)
					s = S_ATTR_SPACE;
					break;
				case S_ATTR_NOQUOT_VALUE:
					var value = source.slice(start, p);
					errorHandler.warning('attribute "'+value+'" missed quot(")!!');
					addAttribute(attrName, value, start)
				case S_ATTR_END:
					s = S_TAG_SPACE;
					break;
				//case S_TAG_SPACE:
				//case S_EQ:
				//case S_ATTR_SPACE:
				//	void();break;
				//case S_TAG_CLOSE:
					//ignore warning
				}
			}else{//not space
//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
				switch(s){
				//case S_TAG:void();break;
				//case S_ATTR:void();break;
				//case S_ATTR_NOQUOT_VALUE:void();break;
				case S_ATTR_SPACE:
					var tagName =  el.tagName;
					if (!NAMESPACE.isHTML(currentNSMap['']) || !attrName.match(/^(?:disabled|checked|selected)$/i)) {
						errorHandler.warning('attribute "'+attrName+'" missed value!! "'+attrName+'" instead2!!')
					}
					addAttribute(attrName, attrName, start);
					start = p;
					s = S_ATTR;
					break;
				case S_ATTR_END:
					errorHandler.warning('attribute space is required"'+attrName+'"!!')
				case S_TAG_SPACE:
					s = S_ATTR;
					start = p;
					break;
				case S_EQ:
					s = S_ATTR_NOQUOT_VALUE;
					start = p;
					break;
				case S_TAG_CLOSE:
					throw new Error("elements closed character '/' and '>' must be connected to");
				}
			}
		}//end outer switch
		//console.log('p++',p)
		p++;
	}
}
/**
 * @return true if has new namespace define
 */
function appendElement(el,domBuilder,currentNSMap){
	var tagName = el.tagName;
	var localNSMap = null;
	//var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
	var i = el.length;
	while(i--){
		var a = el[i];
		var qName = a.qName;
		var value = a.value;
		var nsp = qName.indexOf(':');
		if(nsp>0){
			var prefix = a.prefix = qName.slice(0,nsp);
			var localName = qName.slice(nsp+1);
			var nsPrefix = prefix === 'xmlns' && localName
		}else{
			localName = qName;
			prefix = null
			nsPrefix = qName === 'xmlns' && ''
		}
		//can not set prefix,because prefix !== ''
		a.localName = localName ;
		//prefix == null for no ns prefix attribute
		if(nsPrefix !== false){//hack!!
			if(localNSMap == null){
				localNSMap = {}
				//console.log(currentNSMap,0)
				_copy(currentNSMap,currentNSMap={})
				//console.log(currentNSMap,1)
			}
			currentNSMap[nsPrefix] = localNSMap[nsPrefix] = value;
			a.uri = NAMESPACE.XMLNS
			domBuilder.startPrefixMapping(nsPrefix, value)
		}
	}
	var i = el.length;
	while(i--){
		a = el[i];
		var prefix = a.prefix;
		if(prefix){//no prefix attribute has no namespace
			if(prefix === 'xml'){
				a.uri = NAMESPACE.XML;
			}if(prefix !== 'xmlns'){
				a.uri = currentNSMap[prefix || '']

				//{console.log('###'+a.qName,domBuilder.locator.systemId+'',currentNSMap,a.uri)}
			}
		}
	}
	var nsp = tagName.indexOf(':');
	if(nsp>0){
		prefix = el.prefix = tagName.slice(0,nsp);
		localName = el.localName = tagName.slice(nsp+1);
	}else{
		prefix = null;//important!!
		localName = el.localName = tagName;
	}
	//no prefix element has default namespace
	var ns = el.uri = currentNSMap[prefix || ''];
	domBuilder.startElement(ns,localName,tagName,el);
	//endPrefixMapping and startPrefixMapping have not any help for dom builder
	//localNSMap = null
	if(el.closed){
		domBuilder.endElement(ns,localName,tagName);
		if(localNSMap){
			for (prefix in localNSMap) {
				if (Object.prototype.hasOwnProperty.call(localNSMap, prefix)) {
					domBuilder.endPrefixMapping(prefix);
				}
			}
		}
	}else{
		el.currentNSMap = currentNSMap;
		el.localNSMap = localNSMap;
		//parseStack.push(el);
		return true;
	}
}
function parseHtmlSpecialContent(source,elStartEnd,tagName,entityReplacer,domBuilder){
	if(/^(?:script|textarea)$/i.test(tagName)){
		var elEndStart =  source.indexOf('</'+tagName+'>',elStartEnd);
		var text = source.substring(elStartEnd+1,elEndStart);
		if(/[&<]/.test(text)){
			if(/^script$/i.test(tagName)){
				//if(!/\]\]>/.test(text)){
					//lexHandler.startCDATA();
					domBuilder.characters(text,0,text.length);
					//lexHandler.endCDATA();
					return elEndStart;
				//}
			}//}else{//text area
				text = text.replace(/&#?\w+;/g,entityReplacer);
				domBuilder.characters(text,0,text.length);
				return elEndStart;
			//}

		}
	}
	return elStartEnd+1;
}
function fixSelfClosed(source,elStartEnd,tagName,closeMap){
	//if(tagName in closeMap){
	var pos = closeMap[tagName];
	if(pos == null){
		//console.log(tagName)
		pos =  source.lastIndexOf('</'+tagName+'>')
		if(pos<elStartEnd){//忘记闭合
			pos = source.lastIndexOf('</'+tagName)
		}
		closeMap[tagName] =pos
	}
	return pos<elStartEnd;
	//}
}

function _copy (source, target) {
	for (var n in source) {
		if (Object.prototype.hasOwnProperty.call(source, n)) {
			target[n] = source[n];
		}
	}
}

function parseDCC(source,start,domBuilder,errorHandler){//sure start with '<!'
	var next= source.charAt(start+2)
	switch(next){
	case '-':
		if(source.charAt(start + 3) === '-'){
			var end = source.indexOf('-->',start+4);
			//append comment source.substring(4,end)//<!--
			if(end>start){
				domBuilder.comment(source,start+4,end-start-4);
				return end+3;
			}else{
				errorHandler.error("Unclosed comment");
				return -1;
			}
		}else{
			//error
			return -1;
		}
	default:
		if(source.substr(start+3,6) == 'CDATA['){
			var end = source.indexOf(']]>',start+9);
			domBuilder.startCDATA();
			domBuilder.characters(source,start+9,end-start-9);
			domBuilder.endCDATA()
			return end+3;
		}
		//<!DOCTYPE
		//startDTD(java.lang.String name, java.lang.String publicId, java.lang.String systemId)
		var matchs = split(source,start);
		var len = matchs.length;
		if(len>1 && /!doctype/i.test(matchs[0][0])){
			var name = matchs[1][0];
			var pubid = false;
			var sysid = false;
			if(len>3){
				if(/^public$/i.test(matchs[2][0])){
					pubid = matchs[3][0];
					sysid = len>4 && matchs[4][0];
				}else if(/^system$/i.test(matchs[2][0])){
					sysid = matchs[3][0];
				}
			}
			var lastMatch = matchs[len-1]
			domBuilder.startDTD(name, pubid, sysid);
			domBuilder.endDTD();

			return lastMatch.index+lastMatch[0].length
		}
	}
	return -1;
}



function parseInstruction(source,start,domBuilder){
	var end = source.indexOf('?>',start);
	if(end){
		var match = source.substring(start,end).match(/^<\?(\S*)\s*([\s\S]*?)\s*$/);
		if(match){
			var len = match[0].length;
			domBuilder.processingInstruction(match[1], match[2]) ;
			return end+2;
		}else{//error
			return -1;
		}
	}
	return -1;
}

function ElementAttributes(){
	this.attributeNames = {}
}
ElementAttributes.prototype = {
	setTagName:function(tagName){
		if(!tagNamePattern.test(tagName)){
			throw new Error('invalid tagName:'+tagName)
		}
		this.tagName = tagName
	},
	addValue:function(qName, value, offset) {
		if(!tagNamePattern.test(qName)){
			throw new Error('invalid attribute:'+qName)
		}
		this.attributeNames[qName] = this.length;
		this[this.length++] = {qName:qName,value:value,offset:offset}
	},
	length:0,
	getLocalName:function(i){return this[i].localName},
	getLocator:function(i){return this[i].locator},
	getQName:function(i){return this[i].qName},
	getURI:function(i){return this[i].uri},
	getValue:function(i){return this[i].value}
//	,getIndex:function(uri, localName)){
//		if(localName){
//
//		}else{
//			var qName = uri
//		}
//	},
//	getValue:function(){return this.getValue(this.getIndex.apply(this,arguments))},
//	getType:function(uri,localName){}
//	getType:function(i){},
}



function split(source,start){
	var match;
	var buf = [];
	var reg = /'[^']+'|"[^"]+"|[^\s<>\/=]+=?|(\/?\s*>|<)/g;
	reg.lastIndex = start;
	reg.exec(source);//skip <
	while(match = reg.exec(source)){
		buf.push(match);
		if(match[1])return buf;
	}
}

exports.XMLReader = XMLReader;
exports.ParseError = ParseError;

},{"./conventions":41}],47:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],48:[function(require,module,exports){
"use strict";
module.exports = function(Promise) {
var SomePromiseArray = Promise._SomePromiseArray;
function any(promises) {
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
}

Promise.any = function (promises) {
    return any(promises);
};

Promise.prototype.any = function () {
    return any(this);
};

};

},{}],49:[function(require,module,exports){
(function (process){
"use strict";
var firstLineError;
try {throw new Error(); } catch (e) {firstLineError = e;}
var schedule = require("./schedule");
var Queue = require("./queue");
var util = require("./util");

function Async() {
    this._customScheduler = false;
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._haveDrainedQueues = false;
    this._trampolineEnabled = true;
    var self = this;
    this.drainQueues = function () {
        self._drainQueues();
    };
    this._schedule = schedule;
}

Async.prototype.setScheduler = function(fn) {
    var prev = this._schedule;
    this._schedule = fn;
    this._customScheduler = true;
    return prev;
};

Async.prototype.hasCustomScheduler = function() {
    return this._customScheduler;
};

Async.prototype.enableTrampoline = function() {
    this._trampolineEnabled = true;
};

Async.prototype.disableTrampolineIfNecessary = function() {
    if (util.hasDevTools) {
        this._trampolineEnabled = false;
    }
};

Async.prototype.haveItemsQueued = function () {
    return this._isTickUsed || this._haveDrainedQueues;
};


Async.prototype.fatalError = function(e, isNode) {
    if (isNode) {
        process.stderr.write("Fatal " + (e instanceof Error ? e.stack : e) +
            "\n");
        process.exit(2);
    } else {
        this.throwLater(e);
    }
};

Async.prototype.throwLater = function(fn, arg) {
    if (arguments.length === 1) {
        arg = fn;
        fn = function () { throw arg; };
    }
    if (typeof setTimeout !== "undefined") {
        setTimeout(function() {
            fn(arg);
        }, 0);
    } else try {
        this._schedule(function() {
            fn(arg);
        });
    } catch (e) {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
};

function AsyncInvokeLater(fn, receiver, arg) {
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncInvoke(fn, receiver, arg) {
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncSettlePromises(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
}

if (!util.hasDevTools) {
    Async.prototype.invokeLater = AsyncInvokeLater;
    Async.prototype.invoke = AsyncInvoke;
    Async.prototype.settlePromises = AsyncSettlePromises;
} else {
    Async.prototype.invokeLater = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvokeLater.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                setTimeout(function() {
                    fn.call(receiver, arg);
                }, 100);
            });
        }
    };

    Async.prototype.invoke = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvoke.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                fn.call(receiver, arg);
            });
        }
    };

    Async.prototype.settlePromises = function(promise) {
        if (this._trampolineEnabled) {
            AsyncSettlePromises.call(this, promise);
        } else {
            this._schedule(function() {
                promise._settlePromises();
            });
        }
    };
}

Async.prototype._drainQueue = function(queue) {
    while (queue.length() > 0) {
        var fn = queue.shift();
        if (typeof fn !== "function") {
            fn._settlePromises();
            continue;
        }
        var receiver = queue.shift();
        var arg = queue.shift();
        fn.call(receiver, arg);
    }
};

Async.prototype._drainQueues = function () {
    this._drainQueue(this._normalQueue);
    this._reset();
    this._haveDrainedQueues = true;
    this._drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
    if (!this._isTickUsed) {
        this._isTickUsed = true;
        this._schedule(this.drainQueues);
    }
};

Async.prototype._reset = function () {
    this._isTickUsed = false;
};

module.exports = Async;
module.exports.firstLineError = firstLineError;

}).call(this,require('_process'))
},{"./queue":72,"./schedule":75,"./util":82,"_process":101}],50:[function(require,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise, debug) {
var calledBind = false;
var rejectThis = function(_, e) {
    this._reject(e);
};

var targetRejected = function(e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
};

var bindingResolved = function(thisArg, context) {
    if (((this._bitField & 50397184) === 0)) {
        this._resolveCallback(context.target);
    }
};

var bindingRejected = function(e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
};

Promise.prototype.bind = function (thisArg) {
    if (!calledBind) {
        calledBind = true;
        Promise.prototype._propagateFrom = debug.propagateFromFunction();
        Promise.prototype._boundValue = debug.boundValueFunction();
    }
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 1);
    var target = this._target();
    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        var context = {
            promiseRejectionQueued: false,
            promise: ret,
            target: target,
            bindingPromise: maybePromise
        };
        target._then(INTERNAL, targetRejected, undefined, ret, context);
        maybePromise._then(
            bindingResolved, bindingRejected, undefined, ret, context);
        ret._setOnCancel(maybePromise);
    } else {
        ret._resolveCallback(target);
    }
    return ret;
};

Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
        this._bitField = this._bitField | 2097152;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~2097152);
    }
};

Promise.prototype._isBound = function () {
    return (this._bitField & 2097152) === 2097152;
};

Promise.bind = function (thisArg, value) {
    return Promise.resolve(value).bind(thisArg);
};
};

},{}],51:[function(require,module,exports){
"use strict";
var cr = Object.create;
if (cr) {
    var callerCache = cr(null);
    var getterCache = cr(null);
    callerCache[" size"] = getterCache[" size"] = 0;
}

module.exports = function(Promise) {
var util = require("./util");
var canEvaluate = util.canEvaluate;
var isIdentifier = util.isIdentifier;

var getMethodCaller;
var getGetter;
if (!false) {
var makeMethodCaller = function (methodName) {
    return new Function("ensureMethod", "                                    \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            var len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
};

var makeGetter = function (propertyName) {
    return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
};

var getCompiled = function(name, compiler, cache) {
    var ret = cache[name];
    if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
            return null;
        }
        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;
        if (cache[" size"] > 512) {
            var keys = Object.keys(cache);
            for (var i = 0; i < 256; ++i) delete cache[keys[i]];
            cache[" size"] = keys.length - 256;
        }
    }
    return ret;
};

getMethodCaller = function(name) {
    return getCompiled(name, makeMethodCaller, callerCache);
};

getGetter = function(name) {
    return getCompiled(name, makeGetter, getterCache);
};
}

function ensureMethod(obj, methodName) {
    var fn;
    if (obj != null) fn = obj[methodName];
    if (typeof fn !== "function") {
        var message = "Object " + util.classString(obj) + " has no method '" +
            util.toString(methodName) + "'";
        throw new Promise.TypeError(message);
    }
    return fn;
}

function caller(obj) {
    var methodName = this.pop();
    var fn = ensureMethod(obj, methodName);
    return fn.apply(obj, this);
}
Promise.prototype.call = function (methodName) {
    var $_len = arguments.length;var args = new Array(Math.max($_len - 1, 0)); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];};
    if (!false) {
        if (canEvaluate) {
            var maybeCaller = getMethodCaller(methodName);
            if (maybeCaller !== null) {
                return this._then(
                    maybeCaller, undefined, undefined, args, undefined);
            }
        }
    }
    args.push(methodName);
    return this._then(caller, undefined, undefined, args, undefined);
};

function namedGetter(obj) {
    return obj[this];
}
function indexedGetter(obj) {
    var index = +this;
    if (index < 0) index = Math.max(0, index + obj.length);
    return obj[index];
}
Promise.prototype.get = function (propertyName) {
    var isIndex = (typeof propertyName === "number");
    var getter;
    if (!isIndex) {
        if (canEvaluate) {
            var maybeGetter = getGetter(propertyName);
            getter = maybeGetter !== null ? maybeGetter : namedGetter;
        } else {
            getter = namedGetter;
        }
    } else {
        getter = indexedGetter;
    }
    return this._then(getter, undefined, undefined, propertyName, undefined);
};
};

},{"./util":82}],52:[function(require,module,exports){
"use strict";
module.exports = function(Promise, PromiseArray, apiRejection, debug) {
var util = require("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var async = Promise._async;

Promise.prototype["break"] = Promise.prototype.cancel = function() {
    if (!debug.cancellation()) return this._warn("cancellation is disabled");

    var promise = this;
    var child = promise;
    while (promise._isCancellable()) {
        if (!promise._cancelBy(child)) {
            if (child._isFollowing()) {
                child._followee().cancel();
            } else {
                child._cancelBranched();
            }
            break;
        }

        var parent = promise._cancellationParent;
        if (parent == null || !parent._isCancellable()) {
            if (promise._isFollowing()) {
                promise._followee().cancel();
            } else {
                promise._cancelBranched();
            }
            break;
        } else {
            if (promise._isFollowing()) promise._followee().cancel();
            promise._setWillBeCancelled();
            child = promise;
            promise = parent;
        }
    }
};

Promise.prototype._branchHasCancelled = function() {
    this._branchesRemainingToCancel--;
};

Promise.prototype._enoughBranchesHaveCancelled = function() {
    return this._branchesRemainingToCancel === undefined ||
           this._branchesRemainingToCancel <= 0;
};

Promise.prototype._cancelBy = function(canceller) {
    if (canceller === this) {
        this._branchesRemainingToCancel = 0;
        this._invokeOnCancel();
        return true;
    } else {
        this._branchHasCancelled();
        if (this._enoughBranchesHaveCancelled()) {
            this._invokeOnCancel();
            return true;
        }
    }
    return false;
};

Promise.prototype._cancelBranched = function() {
    if (this._enoughBranchesHaveCancelled()) {
        this._cancel();
    }
};

Promise.prototype._cancel = function() {
    if (!this._isCancellable()) return;
    this._setCancelled();
    async.invoke(this._cancelPromises, this, undefined);
};

Promise.prototype._cancelPromises = function() {
    if (this._length() > 0) this._settlePromises();
};

Promise.prototype._unsetOnCancel = function() {
    this._onCancelField = undefined;
};

Promise.prototype._isCancellable = function() {
    return this.isPending() && !this._isCancelled();
};

Promise.prototype.isCancellable = function() {
    return this.isPending() && !this.isCancelled();
};

Promise.prototype._doInvokeOnCancel = function(onCancelCallback, internalOnly) {
    if (util.isArray(onCancelCallback)) {
        for (var i = 0; i < onCancelCallback.length; ++i) {
            this._doInvokeOnCancel(onCancelCallback[i], internalOnly);
        }
    } else if (onCancelCallback !== undefined) {
        if (typeof onCancelCallback === "function") {
            if (!internalOnly) {
                var e = tryCatch(onCancelCallback).call(this._boundValue());
                if (e === errorObj) {
                    this._attachExtraTrace(e.e);
                    async.throwLater(e.e);
                }
            }
        } else {
            onCancelCallback._resultCancelled(this);
        }
    }
};

Promise.prototype._invokeOnCancel = function() {
    var onCancelCallback = this._onCancel();
    this._unsetOnCancel();
    async.invoke(this._doInvokeOnCancel, this, onCancelCallback);
};

Promise.prototype._invokeInternalOnCancel = function() {
    if (this._isCancellable()) {
        this._doInvokeOnCancel(this._onCancel(), true);
        this._unsetOnCancel();
    }
};

Promise.prototype._resultCancelled = function() {
    this.cancel();
};

};

},{"./util":82}],53:[function(require,module,exports){
"use strict";
module.exports = function(NEXT_FILTER) {
var util = require("./util");
var getKeys = require("./es5").keys;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function catchFilter(instances, cb, promise) {
    return function(e) {
        var boundTo = promise._boundValue();
        predicateLoop: for (var i = 0; i < instances.length; ++i) {
            var item = instances[i];

            if (item === Error ||
                (item != null && item.prototype instanceof Error)) {
                if (e instanceof item) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (typeof item === "function") {
                var matchesPredicate = tryCatch(item).call(boundTo, e);
                if (matchesPredicate === errorObj) {
                    return matchesPredicate;
                } else if (matchesPredicate) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (util.isObject(e)) {
                var keys = getKeys(item);
                for (var j = 0; j < keys.length; ++j) {
                    var key = keys[j];
                    if (item[key] != e[key]) {
                        continue predicateLoop;
                    }
                }
                return tryCatch(cb).call(boundTo, e);
            }
        }
        return NEXT_FILTER;
    };
}

return catchFilter;
};

},{"./es5":59,"./util":82}],54:[function(require,module,exports){
"use strict";
module.exports = function(Promise) {
var longStackTraces = false;
var contextStack = [];

Promise.prototype._promiseCreated = function() {};
Promise.prototype._pushContext = function() {};
Promise.prototype._popContext = function() {return null;};
Promise._peekContext = Promise.prototype._peekContext = function() {};

function Context() {
    this._trace = new Context.CapturedTrace(peekContext());
}
Context.prototype._pushContext = function () {
    if (this._trace !== undefined) {
        this._trace._promiseCreated = null;
        contextStack.push(this._trace);
    }
};

Context.prototype._popContext = function () {
    if (this._trace !== undefined) {
        var trace = contextStack.pop();
        var ret = trace._promiseCreated;
        trace._promiseCreated = null;
        return ret;
    }
    return null;
};

function createContext() {
    if (longStackTraces) return new Context();
}

function peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return undefined;
}
Context.CapturedTrace = null;
Context.create = createContext;
Context.deactivateLongStackTraces = function() {};
Context.activateLongStackTraces = function() {
    var Promise_pushContext = Promise.prototype._pushContext;
    var Promise_popContext = Promise.prototype._popContext;
    var Promise_PeekContext = Promise._peekContext;
    var Promise_peekContext = Promise.prototype._peekContext;
    var Promise_promiseCreated = Promise.prototype._promiseCreated;
    Context.deactivateLongStackTraces = function() {
        Promise.prototype._pushContext = Promise_pushContext;
        Promise.prototype._popContext = Promise_popContext;
        Promise._peekContext = Promise_PeekContext;
        Promise.prototype._peekContext = Promise_peekContext;
        Promise.prototype._promiseCreated = Promise_promiseCreated;
        longStackTraces = false;
    };
    longStackTraces = true;
    Promise.prototype._pushContext = Context.prototype._pushContext;
    Promise.prototype._popContext = Context.prototype._popContext;
    Promise._peekContext = Promise.prototype._peekContext = peekContext;
    Promise.prototype._promiseCreated = function() {
        var ctx = this._peekContext();
        if (ctx && ctx._promiseCreated == null) ctx._promiseCreated = this;
    };
};
return Context;
};

},{}],55:[function(require,module,exports){
(function (process){
"use strict";
module.exports = function(Promise, Context) {
var getDomain = Promise._getDomain;
var async = Promise._async;
var Warning = require("./errors").Warning;
var util = require("./util");
var canAttachTrace = util.canAttachTrace;
var unhandledRejectionHandled;
var possiblyUnhandledRejection;
var bluebirdFramePattern =
    /[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/;
var nodeFramePattern = /\((?:timers\.js):\d+:\d+\)/;
var parseLinePattern = /[\/<\(](.+?):(\d+):(\d+)\)?\s*$/;
var stackFramePattern = null;
var formatStack = null;
var indentStackFrames = false;
var printWarning;
var debugging = !!(util.env("BLUEBIRD_DEBUG") != 0 &&
                        (false ||
                         util.env("BLUEBIRD_DEBUG") ||
                         util.env("NODE_ENV") === "development"));

var warnings = !!(util.env("BLUEBIRD_WARNINGS") != 0 &&
    (debugging || util.env("BLUEBIRD_WARNINGS")));

var longStackTraces = !!(util.env("BLUEBIRD_LONG_STACK_TRACES") != 0 &&
    (debugging || util.env("BLUEBIRD_LONG_STACK_TRACES")));

var wForgottenReturn = util.env("BLUEBIRD_W_FORGOTTEN_RETURN") != 0 &&
    (warnings || !!util.env("BLUEBIRD_W_FORGOTTEN_RETURN"));

Promise.prototype.suppressUnhandledRejections = function() {
    var target = this._target();
    target._bitField = ((target._bitField & (~1048576)) |
                      524288);
};

Promise.prototype._ensurePossibleRejectionHandled = function () {
    if ((this._bitField & 524288) !== 0) return;
    this._setRejectionIsUnhandled();
    async.invokeLater(this._notifyUnhandledRejection, this, undefined);
};

Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    fireRejectionEvent("rejectionHandled",
                                  unhandledRejectionHandled, undefined, this);
};

Promise.prototype._setReturnedNonUndefined = function() {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._returnedNonUndefined = function() {
    return (this._bitField & 268435456) !== 0;
};

Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
        var reason = this._settledValue();
        this._setUnhandledRejectionIsNotified();
        fireRejectionEvent("unhandledRejection",
                                      possiblyUnhandledRejection, reason, this);
    }
};

Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 262144;
};

Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~262144);
};

Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 262144) > 0;
};

Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 1048576;
};

Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~1048576);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._warn = function(message, shouldUseOwnTrace, promise) {
    return warn(message, shouldUseOwnTrace, promise || this);
};

Promise.onPossiblyUnhandledRejection = function (fn) {
    var domain = getDomain();
    possiblyUnhandledRejection =
        typeof fn === "function" ? (domain === null ?
                                            fn : util.domainBind(domain, fn))
                                 : undefined;
};

Promise.onUnhandledRejectionHandled = function (fn) {
    var domain = getDomain();
    unhandledRejectionHandled =
        typeof fn === "function" ? (domain === null ?
                                            fn : util.domainBind(domain, fn))
                                 : undefined;
};

var disableLongStackTraces = function() {};
Promise.longStackTraces = function () {
    if (async.haveItemsQueued() && !config.longStackTraces) {
        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    if (!config.longStackTraces && longStackTracesIsSupported()) {
        var Promise_captureStackTrace = Promise.prototype._captureStackTrace;
        var Promise_attachExtraTrace = Promise.prototype._attachExtraTrace;
        config.longStackTraces = true;
        disableLongStackTraces = function() {
            if (async.haveItemsQueued() && !config.longStackTraces) {
                throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
            }
            Promise.prototype._captureStackTrace = Promise_captureStackTrace;
            Promise.prototype._attachExtraTrace = Promise_attachExtraTrace;
            Context.deactivateLongStackTraces();
            async.enableTrampoline();
            config.longStackTraces = false;
        };
        Promise.prototype._captureStackTrace = longStackTracesCaptureStackTrace;
        Promise.prototype._attachExtraTrace = longStackTracesAttachExtraTrace;
        Context.activateLongStackTraces();
        async.disableTrampolineIfNecessary();
    }
};

Promise.hasLongStackTraces = function () {
    return config.longStackTraces && longStackTracesIsSupported();
};

var fireDomEvent = (function() {
    try {
        if (typeof CustomEvent === "function") {
            var event = new CustomEvent("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = new CustomEvent(name.toLowerCase(), {
                    detail: event,
                    cancelable: true
                });
                return !util.global.dispatchEvent(domEvent);
            };
        } else if (typeof Event === "function") {
            var event = new Event("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = new Event(name.toLowerCase(), {
                    cancelable: true
                });
                domEvent.detail = event;
                return !util.global.dispatchEvent(domEvent);
            };
        } else {
            var event = document.createEvent("CustomEvent");
            event.initCustomEvent("testingtheevent", false, true, {});
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = document.createEvent("CustomEvent");
                domEvent.initCustomEvent(name.toLowerCase(), false, true,
                    event);
                return !util.global.dispatchEvent(domEvent);
            };
        }
    } catch (e) {}
    return function() {
        return false;
    };
})();

var fireGlobalEvent = (function() {
    if (util.isNode) {
        return function() {
            return process.emit.apply(process, arguments);
        };
    } else {
        if (!util.global) {
            return function() {
                return false;
            };
        }
        return function(name) {
            var methodName = "on" + name.toLowerCase();
            var method = util.global[methodName];
            if (!method) return false;
            method.apply(util.global, [].slice.call(arguments, 1));
            return true;
        };
    }
})();

function generatePromiseLifecycleEventObject(name, promise) {
    return {promise: promise};
}

var eventToObjectGenerator = {
    promiseCreated: generatePromiseLifecycleEventObject,
    promiseFulfilled: generatePromiseLifecycleEventObject,
    promiseRejected: generatePromiseLifecycleEventObject,
    promiseResolved: generatePromiseLifecycleEventObject,
    promiseCancelled: generatePromiseLifecycleEventObject,
    promiseChained: function(name, promise, child) {
        return {promise: promise, child: child};
    },
    warning: function(name, warning) {
        return {warning: warning};
    },
    unhandledRejection: function (name, reason, promise) {
        return {reason: reason, promise: promise};
    },
    rejectionHandled: generatePromiseLifecycleEventObject
};

var activeFireEvent = function (name) {
    var globalEventFired = false;
    try {
        globalEventFired = fireGlobalEvent.apply(null, arguments);
    } catch (e) {
        async.throwLater(e);
        globalEventFired = true;
    }

    var domEventFired = false;
    try {
        domEventFired = fireDomEvent(name,
                    eventToObjectGenerator[name].apply(null, arguments));
    } catch (e) {
        async.throwLater(e);
        domEventFired = true;
    }

    return domEventFired || globalEventFired;
};

Promise.config = function(opts) {
    opts = Object(opts);
    if ("longStackTraces" in opts) {
        if (opts.longStackTraces) {
            Promise.longStackTraces();
        } else if (!opts.longStackTraces && Promise.hasLongStackTraces()) {
            disableLongStackTraces();
        }
    }
    if ("warnings" in opts) {
        var warningsOption = opts.warnings;
        config.warnings = !!warningsOption;
        wForgottenReturn = config.warnings;

        if (util.isObject(warningsOption)) {
            if ("wForgottenReturn" in warningsOption) {
                wForgottenReturn = !!warningsOption.wForgottenReturn;
            }
        }
    }
    if ("cancellation" in opts && opts.cancellation && !config.cancellation) {
        if (async.haveItemsQueued()) {
            throw new Error(
                "cannot enable cancellation after promises are in use");
        }
        Promise.prototype._clearCancellationData =
            cancellationClearCancellationData;
        Promise.prototype._propagateFrom = cancellationPropagateFrom;
        Promise.prototype._onCancel = cancellationOnCancel;
        Promise.prototype._setOnCancel = cancellationSetOnCancel;
        Promise.prototype._attachCancellationCallback =
            cancellationAttachCancellationCallback;
        Promise.prototype._execute = cancellationExecute;
        propagateFromFunction = cancellationPropagateFrom;
        config.cancellation = true;
    }
    if ("monitoring" in opts) {
        if (opts.monitoring && !config.monitoring) {
            config.monitoring = true;
            Promise.prototype._fireEvent = activeFireEvent;
        } else if (!opts.monitoring && config.monitoring) {
            config.monitoring = false;
            Promise.prototype._fireEvent = defaultFireEvent;
        }
    }
    return Promise;
};

function defaultFireEvent() { return false; }

Promise.prototype._fireEvent = defaultFireEvent;
Promise.prototype._execute = function(executor, resolve, reject) {
    try {
        executor(resolve, reject);
    } catch (e) {
        return e;
    }
};
Promise.prototype._onCancel = function () {};
Promise.prototype._setOnCancel = function (handler) { ; };
Promise.prototype._attachCancellationCallback = function(onCancel) {
    ;
};
Promise.prototype._captureStackTrace = function () {};
Promise.prototype._attachExtraTrace = function () {};
Promise.prototype._clearCancellationData = function() {};
Promise.prototype._propagateFrom = function (parent, flags) {
    ;
    ;
};

function cancellationExecute(executor, resolve, reject) {
    var promise = this;
    try {
        executor(resolve, reject, function(onCancel) {
            if (typeof onCancel !== "function") {
                throw new TypeError("onCancel must be a function, got: " +
                                    util.toString(onCancel));
            }
            promise._attachCancellationCallback(onCancel);
        });
    } catch (e) {
        return e;
    }
}

function cancellationAttachCancellationCallback(onCancel) {
    if (!this._isCancellable()) return this;

    var previousOnCancel = this._onCancel();
    if (previousOnCancel !== undefined) {
        if (util.isArray(previousOnCancel)) {
            previousOnCancel.push(onCancel);
        } else {
            this._setOnCancel([previousOnCancel, onCancel]);
        }
    } else {
        this._setOnCancel(onCancel);
    }
}

function cancellationOnCancel() {
    return this._onCancelField;
}

function cancellationSetOnCancel(onCancel) {
    this._onCancelField = onCancel;
}

function cancellationClearCancellationData() {
    this._cancellationParent = undefined;
    this._onCancelField = undefined;
}

function cancellationPropagateFrom(parent, flags) {
    if ((flags & 1) !== 0) {
        this._cancellationParent = parent;
        var branchesRemainingToCancel = parent._branchesRemainingToCancel;
        if (branchesRemainingToCancel === undefined) {
            branchesRemainingToCancel = 0;
        }
        parent._branchesRemainingToCancel = branchesRemainingToCancel + 1;
    }
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}

function bindingPropagateFrom(parent, flags) {
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}
var propagateFromFunction = bindingPropagateFrom;

function boundValueFunction() {
    var ret = this._boundTo;
    if (ret !== undefined) {
        if (ret instanceof Promise) {
            if (ret.isFulfilled()) {
                return ret.value();
            } else {
                return undefined;
            }
        }
    }
    return ret;
}

function longStackTracesCaptureStackTrace() {
    this._trace = new CapturedTrace(this._peekContext());
}

function longStackTracesAttachExtraTrace(error, ignoreSelf) {
    if (canAttachTrace(error)) {
        var trace = this._trace;
        if (trace !== undefined) {
            if (ignoreSelf) trace = trace._parent;
        }
        if (trace !== undefined) {
            trace.attachExtraTrace(error);
        } else if (!error.__stackCleaned__) {
            var parsed = parseStackAndMessage(error);
            util.notEnumerableProp(error, "stack",
                parsed.message + "\n" + parsed.stack.join("\n"));
            util.notEnumerableProp(error, "__stackCleaned__", true);
        }
    }
}

function checkForgottenReturns(returnValue, promiseCreated, name, promise,
                               parent) {
    if (returnValue === undefined && promiseCreated !== null &&
        wForgottenReturn) {
        if (parent !== undefined && parent._returnedNonUndefined()) return;
        if ((promise._bitField & 65535) === 0) return;

        if (name) name = name + " ";
        var handlerLine = "";
        var creatorLine = "";
        if (promiseCreated._trace) {
            var traceLines = promiseCreated._trace.stack.split("\n");
            var stack = cleanStack(traceLines);
            for (var i = stack.length - 1; i >= 0; --i) {
                var line = stack[i];
                if (!nodeFramePattern.test(line)) {
                    var lineMatches = line.match(parseLinePattern);
                    if (lineMatches) {
                        handlerLine  = "at " + lineMatches[1] +
                            ":" + lineMatches[2] + ":" + lineMatches[3] + " ";
                    }
                    break;
                }
            }

            if (stack.length > 0) {
                var firstUserLine = stack[0];
                for (var i = 0; i < traceLines.length; ++i) {

                    if (traceLines[i] === firstUserLine) {
                        if (i > 0) {
                            creatorLine = "\n" + traceLines[i - 1];
                        }
                        break;
                    }
                }

            }
        }
        var msg = "a promise was created in a " + name +
            "handler " + handlerLine + "but was not returned from it, " +
            "see http://goo.gl/rRqMUw" +
            creatorLine;
        promise._warn(msg, true, promiseCreated);
    }
}

function deprecated(name, replacement) {
    var message = name +
        " is deprecated and will be removed in a future version.";
    if (replacement) message += " Use " + replacement + " instead.";
    return warn(message);
}

function warn(message, shouldUseOwnTrace, promise) {
    if (!config.warnings) return;
    var warning = new Warning(message);
    var ctx;
    if (shouldUseOwnTrace) {
        promise._attachExtraTrace(warning);
    } else if (config.longStackTraces && (ctx = Promise._peekContext())) {
        ctx.attachExtraTrace(warning);
    } else {
        var parsed = parseStackAndMessage(warning);
        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }

    if (!activeFireEvent("warning", warning)) {
        formatAndLogError(warning, "", true);
    }
}

function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
        stacks[i].push("From previous event:");
        stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
        stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
}

function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
        if (stacks[i].length === 0 ||
            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i+1][0])) {
            stacks.splice(i, 1);
            i--;
        }
    }
}

function removeCommonRoots(stacks) {
    var current = stacks[0];
    for (var i = 1; i < stacks.length; ++i) {
        var prev = stacks[i];
        var currentLastIndex = current.length - 1;
        var currentLastLine = current[currentLastIndex];
        var commonRootMeetPoint = -1;

        for (var j = prev.length - 1; j >= 0; --j) {
            if (prev[j] === currentLastLine) {
                commonRootMeetPoint = j;
                break;
            }
        }

        for (var j = commonRootMeetPoint; j >= 0; --j) {
            var line = prev[j];
            if (current[currentLastIndex] === line) {
                current.pop();
                currentLastIndex--;
            } else {
                break;
            }
        }
        current = prev;
    }
}

function cleanStack(stack) {
    var ret = [];
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        var isTraceLine = "    (No stack trace)" === line ||
            stackFramePattern.test(line);
        var isInternalFrame = isTraceLine && shouldIgnore(line);
        if (isTraceLine && !isInternalFrame) {
            if (indentStackFrames && line.charAt(0) !== " ") {
                line = "    " + line;
            }
            ret.push(line);
        }
    }
    return ret;
}

function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
            break;
        }
    }
    if (i > 0 && error.name != "SyntaxError") {
        stack = stack.slice(i);
    }
    return stack;
}

function parseStackAndMessage(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
                ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
        message: message,
        stack: error.name == "SyntaxError" ? stack : cleanStack(stack)
    };
}

function formatAndLogError(error, title, isSoft) {
    if (typeof console !== "undefined") {
        var message;
        if (util.isObject(error)) {
            var stack = error.stack;
            message = title + formatStack(stack, error);
        } else {
            message = title + String(error);
        }
        if (typeof printWarning === "function") {
            printWarning(message, isSoft);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
}

function fireRejectionEvent(name, localHandler, reason, promise) {
    var localEventFired = false;
    try {
        if (typeof localHandler === "function") {
            localEventFired = true;
            if (name === "rejectionHandled") {
                localHandler(promise);
            } else {
                localHandler(reason, promise);
            }
        }
    } catch (e) {
        async.throwLater(e);
    }

    if (name === "unhandledRejection") {
        if (!activeFireEvent(name, reason, promise) && !localEventFired) {
            formatAndLogError(reason, "Unhandled rejection ");
        }
    } else {
        activeFireEvent(name, promise);
    }
}

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj && typeof obj.toString === "function"
            ? obj.toString() : util.toString(obj);
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

function longStackTracesIsSupported() {
    return typeof captureStackTrace === "function";
}

var shouldIgnore = function() { return false; };
var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);
    if (matches) {
        return {
            fileName: matches[1],
            line: parseInt(matches[2], 10)
        };
    }
}

function setBounds(firstLineError, lastLineError) {
    if (!longStackTracesIsSupported()) return;
    var firstStackLines = firstLineError.stack.split("\n");
    var lastStackLines = lastLineError.stack.split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;
    for (var i = 0; i < firstStackLines.length; ++i) {
        var result = parseLineInfo(firstStackLines[i]);
        if (result) {
            firstFileName = result.fileName;
            firstIndex = result.line;
            break;
        }
    }
    for (var i = 0; i < lastStackLines.length; ++i) {
        var result = parseLineInfo(lastStackLines[i]);
        if (result) {
            lastFileName = result.fileName;
            lastIndex = result.line;
            break;
        }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
        firstFileName !== lastFileName || firstIndex >= lastIndex) {
        return;
    }

    shouldIgnore = function(line) {
        if (bluebirdFramePattern.test(line)) return true;
        var info = parseLineInfo(line);
        if (info) {
            if (info.fileName === firstFileName &&
                (firstIndex <= info.line && info.line <= lastIndex)) {
                return true;
            }
        }
        return false;
    };
}

function CapturedTrace(parent) {
    this._parent = parent;
    this._promisesCreated = 0;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
}
util.inherits(CapturedTrace, Error);
Context.CapturedTrace = CapturedTrace;

CapturedTrace.prototype.uncycle = function() {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
        nodes.push(node);
        node = node._parent;
    }
    length = this._length = i;
    for (var i = length - 1; i >= 0; --i) {
        var stack = nodes[i].stack;
        if (stackToIndex[stack] === undefined) {
            stackToIndex[stack] = i;
        }
    }
    for (var i = 0; i < length; ++i) {
        var currentStack = nodes[i].stack;
        var index = stackToIndex[currentStack];
        if (index !== undefined && index !== i) {
            if (index > 0) {
                nodes[index - 1]._parent = undefined;
                nodes[index - 1]._length = 1;
            }
            nodes[i]._parent = undefined;
            nodes[i]._length = 1;
            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

            if (index < length - 1) {
                cycleEdgeNode._parent = nodes[index + 1];
                cycleEdgeNode._parent.uncycle();
                cycleEdgeNode._length =
                    cycleEdgeNode._parent._length + 1;
            } else {
                cycleEdgeNode._parent = undefined;
                cycleEdgeNode._length = 1;
            }
            var currentChildLength = cycleEdgeNode._length + 1;
            for (var j = i - 2; j >= 0; --j) {
                nodes[j]._length = currentChildLength;
                currentChildLength++;
            }
            return;
        }
    }
};

CapturedTrace.prototype.attachExtraTrace = function(error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];

    var trace = this;
    while (trace !== undefined) {
        stacks.push(cleanStack(trace.stack.split("\n")));
        trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    util.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util.notEnumerableProp(error, "__stackCleaned__", true);
};

var captureStackTrace = (function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;
    var v8stackFormatter = function(stack, error) {
        if (typeof stack === "string") return stack;

        if (error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        Error.stackTraceLimit += 6;
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        var captureStackTrace = Error.captureStackTrace;

        shouldIgnore = function(line) {
            return bluebirdFramePattern.test(line);
        };
        return function(receiver, ignoreUntil) {
            Error.stackTraceLimit += 6;
            captureStackTrace(receiver, ignoreUntil);
            Error.stackTraceLimit -= 6;
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
        stackFramePattern = /@/;
        formatStack = v8stackFormatter;
        indentStackFrames = true;
        return function captureStackTrace(o) {
            o.stack = new Error().stack;
        };
    }

    var hasStackAfterThrow;
    try { throw new Error(); }
    catch(e) {
        hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow &&
        typeof Error.stackTraceLimit === "number") {
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        return function captureStackTrace(o) {
            Error.stackTraceLimit += 6;
            try { throw new Error(); }
            catch(e) { o.stack = e.stack; }
            Error.stackTraceLimit -= 6;
        };
    }

    formatStack = function(stack, error) {
        if (typeof stack === "string") return stack;

        if ((typeof error === "object" ||
            typeof error === "function") &&
            error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    return null;

})([]);

if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    printWarning = function (message) {
        console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
        printWarning = function(message, isSoft) {
            var color = isSoft ? "\u001b[33m" : "\u001b[31m";
            console.warn(color + message + "\u001b[0m\n");
        };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
        printWarning = function(message, isSoft) {
            console.warn("%c" + message,
                        isSoft ? "color: darkorange" : "color: red");
        };
    }
}

var config = {
    warnings: warnings,
    longStackTraces: false,
    cancellation: false,
    monitoring: false
};

if (longStackTraces) Promise.longStackTraces();

return {
    longStackTraces: function() {
        return config.longStackTraces;
    },
    warnings: function() {
        return config.warnings;
    },
    cancellation: function() {
        return config.cancellation;
    },
    monitoring: function() {
        return config.monitoring;
    },
    propagateFromFunction: function() {
        return propagateFromFunction;
    },
    boundValueFunction: function() {
        return boundValueFunction;
    },
    checkForgottenReturns: checkForgottenReturns,
    setBounds: setBounds,
    warn: warn,
    deprecated: deprecated,
    CapturedTrace: CapturedTrace,
    fireDomEvent: fireDomEvent,
    fireGlobalEvent: fireGlobalEvent
};
};

}).call(this,require('_process'))
},{"./errors":58,"./util":82,"_process":101}],56:[function(require,module,exports){
"use strict";
module.exports = function(Promise) {
function returner() {
    return this.value;
}
function thrower() {
    throw this.reason;
}

Promise.prototype["return"] =
Promise.prototype.thenReturn = function (value) {
    if (value instanceof Promise) value.suppressUnhandledRejections();
    return this._then(
        returner, undefined, undefined, {value: value}, undefined);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow = function (reason) {
    return this._then(
        thrower, undefined, undefined, {reason: reason}, undefined);
};

Promise.prototype.catchThrow = function (reason) {
    if (arguments.length <= 1) {
        return this._then(
            undefined, thrower, undefined, {reason: reason}, undefined);
    } else {
        var _reason = arguments[1];
        var handler = function() {throw _reason;};
        return this.caught(reason, handler);
    }
};

Promise.prototype.catchReturn = function (value) {
    if (arguments.length <= 1) {
        if (value instanceof Promise) value.suppressUnhandledRejections();
        return this._then(
            undefined, returner, undefined, {value: value}, undefined);
    } else {
        var _value = arguments[1];
        if (_value instanceof Promise) _value.suppressUnhandledRejections();
        var handler = function() {return _value;};
        return this.caught(value, handler);
    }
};
};

},{}],57:[function(require,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseReduce = Promise.reduce;
var PromiseAll = Promise.all;

function promiseAllThis() {
    return PromiseAll(this);
}

function PromiseMapSeries(promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, INTERNAL);
}

Promise.prototype.each = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, 0)
              ._then(promiseAllThis, undefined, undefined, this, undefined);
};

Promise.prototype.mapSeries = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, INTERNAL);
};

Promise.each = function (promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, 0)
              ._then(promiseAllThis, undefined, undefined, promises, undefined);
};

Promise.mapSeries = PromiseMapSeries;
};


},{}],58:[function(require,module,exports){
"use strict";
var es5 = require("./es5");
var Objectfreeze = es5.freeze;
var util = require("./util");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        notEnumerableProp(this, "message",
            typeof message === "string" ? message : defaultMessage);
        notEnumerableProp(this, "name", nameProperty);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            Error.call(this);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

es5.defineProperty(AggregateError.prototype, "length", {
    value: 0,
    configurable: false,
    writable: true,
    enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    if (!(this instanceof OperationalError))
        return new OperationalError(message);
    notEnumerableProp(this, "name", "OperationalError");
    notEnumerableProp(this, "message", message);
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        notEnumerableProp(this, "message", message.message);
        notEnumerableProp(this, "stack", message.stack);
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var errorTypes = Error["__BluebirdErrorTypes__"];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    es5.defineProperty(Error, "__BluebirdErrorTypes__", {
        value: errorTypes,
        writable: false,
        enumerable: false,
        configurable: false
    });
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    Warning: Warning
};

},{"./es5":59,"./util":82}],59:[function(require,module,exports){
var isES5 = (function(){
    "use strict";
    return this === undefined;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        getDescriptor: Object.getOwnPropertyDescriptor,
        keys: Object.keys,
        names: Object.getOwnPropertyNames,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5,
        propertyIsWritable: function(obj, prop) {
            var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
            return !!(!descriptor || descriptor.writable || descriptor.set);
        }
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function (o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    };

    var ObjectGetDescriptor = function(o, key) {
        return {value: o[key]};
    };

    var ObjectDefineProperty = function (o, key, desc) {
        o[key] = desc.value;
        return o;
    };

    var ObjectFreeze = function (obj) {
        return obj;
    };

    var ObjectGetPrototypeOf = function (obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    };

    var ArrayIsArray = function (obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    };

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        names: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        getDescriptor: ObjectGetDescriptor,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5,
        propertyIsWritable: function() {
            return true;
        }
    };
}

},{}],60:[function(require,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseMap = Promise.map;

Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
};

Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
};
};

},{}],61:[function(require,module,exports){
"use strict";
module.exports = function(Promise, tryConvertToPromise) {
var util = require("./util");
var CancellationError = Promise.CancellationError;
var errorObj = util.errorObj;

function PassThroughHandlerContext(promise, type, handler) {
    this.promise = promise;
    this.type = type;
    this.handler = handler;
    this.called = false;
    this.cancelPromise = null;
}

PassThroughHandlerContext.prototype.isFinallyHandler = function() {
    return this.type === 0;
};

function FinallyHandlerCancelReaction(finallyHandler) {
    this.finallyHandler = finallyHandler;
}

FinallyHandlerCancelReaction.prototype._resultCancelled = function() {
    checkCancel(this.finallyHandler);
};

function checkCancel(ctx, reason) {
    if (ctx.cancelPromise != null) {
        if (arguments.length > 1) {
            ctx.cancelPromise._reject(reason);
        } else {
            ctx.cancelPromise._cancel();
        }
        ctx.cancelPromise = null;
        return true;
    }
    return false;
}

function succeed() {
    return finallyHandler.call(this, this.promise._target()._settledValue());
}
function fail(reason) {
    if (checkCancel(this, reason)) return;
    errorObj.e = reason;
    return errorObj;
}
function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    if (!this.called) {
        this.called = true;
        var ret = this.isFinallyHandler()
            ? handler.call(promise._boundValue())
            : handler.call(promise._boundValue(), reasonOrValue);
        if (ret !== undefined) {
            promise._setReturnedNonUndefined();
            var maybePromise = tryConvertToPromise(ret, promise);
            if (maybePromise instanceof Promise) {
                if (this.cancelPromise != null) {
                    if (maybePromise._isCancelled()) {
                        var reason =
                            new CancellationError("late cancellation observer");
                        promise._attachExtraTrace(reason);
                        errorObj.e = reason;
                        return errorObj;
                    } else if (maybePromise.isPending()) {
                        maybePromise._attachCancellationCallback(
                            new FinallyHandlerCancelReaction(this));
                    }
                }
                return maybePromise._then(
                    succeed, fail, undefined, this, undefined);
            }
        }
    }

    if (promise.isRejected()) {
        checkCancel(this);
        errorObj.e = reasonOrValue;
        return errorObj;
    } else {
        checkCancel(this);
        return reasonOrValue;
    }
}

Promise.prototype._passThrough = function(handler, type, success, fail) {
    if (typeof handler !== "function") return this.then();
    return this._then(success,
                      fail,
                      undefined,
                      new PassThroughHandlerContext(this, type, handler),
                      undefined);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function (handler) {
    return this._passThrough(handler,
                             0,
                             finallyHandler,
                             finallyHandler);
};

Promise.prototype.tap = function (handler) {
    return this._passThrough(handler, 1, finallyHandler);
};

return PassThroughHandlerContext;
};

},{"./util":82}],62:[function(require,module,exports){
"use strict";
module.exports = function(Promise,
                          apiRejection,
                          INTERNAL,
                          tryConvertToPromise,
                          Proxyable,
                          debug) {
var errors = require("./errors");
var TypeError = errors.TypeError;
var util = require("./util");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
var yieldHandlers = [];

function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
    for (var i = 0; i < yieldHandlers.length; ++i) {
        traceParent._pushContext();
        var result = tryCatch(yieldHandlers[i])(value);
        traceParent._popContext();
        if (result === errorObj) {
            traceParent._pushContext();
            var ret = Promise.reject(errorObj.e);
            traceParent._popContext();
            return ret;
        }
        var maybePromise = tryConvertToPromise(result, traceParent);
        if (maybePromise instanceof Promise) return maybePromise;
    }
    return null;
}

function PromiseSpawn(generatorFunction, receiver, yieldHandler, stack) {
    if (debug.cancellation()) {
        var internal = new Promise(INTERNAL);
        var _finallyPromise = this._finallyPromise = new Promise(INTERNAL);
        this._promise = internal.lastly(function() {
            return _finallyPromise;
        });
        internal._captureStackTrace();
        internal._setOnCancel(this);
    } else {
        var promise = this._promise = new Promise(INTERNAL);
        promise._captureStackTrace();
    }
    this._stack = stack;
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = undefined;
    this._yieldHandlers = typeof yieldHandler === "function"
        ? [yieldHandler].concat(yieldHandlers)
        : yieldHandlers;
    this._yieldedPromise = null;
    this._cancellationPhase = false;
}
util.inherits(PromiseSpawn, Proxyable);

PromiseSpawn.prototype._isResolved = function() {
    return this._promise === null;
};

PromiseSpawn.prototype._cleanup = function() {
    this._promise = this._generator = null;
    if (debug.cancellation() && this._finallyPromise !== null) {
        this._finallyPromise._fulfill();
        this._finallyPromise = null;
    }
};

PromiseSpawn.prototype._promiseCancelled = function() {
    if (this._isResolved()) return;
    var implementsReturn = typeof this._generator["return"] !== "undefined";

    var result;
    if (!implementsReturn) {
        var reason = new Promise.CancellationError(
            "generator .return() sentinel");
        Promise.coroutine.returnSentinel = reason;
        this._promise._attachExtraTrace(reason);
        this._promise._pushContext();
        result = tryCatch(this._generator["throw"]).call(this._generator,
                                                         reason);
        this._promise._popContext();
    } else {
        this._promise._pushContext();
        result = tryCatch(this._generator["return"]).call(this._generator,
                                                          undefined);
        this._promise._popContext();
    }
    this._cancellationPhase = true;
    this._yieldedPromise = null;
    this._continue(result);
};

PromiseSpawn.prototype._promiseFulfilled = function(value) {
    this._yieldedPromise = null;
    this._promise._pushContext();
    var result = tryCatch(this._generator.next).call(this._generator, value);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._promiseRejected = function(reason) {
    this._yieldedPromise = null;
    this._promise._attachExtraTrace(reason);
    this._promise._pushContext();
    var result = tryCatch(this._generator["throw"])
        .call(this._generator, reason);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._resultCancelled = function() {
    if (this._yieldedPromise instanceof Promise) {
        var promise = this._yieldedPromise;
        this._yieldedPromise = null;
        promise.cancel();
    }
};

PromiseSpawn.prototype.promise = function () {
    return this._promise;
};

PromiseSpawn.prototype._run = function () {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver =
        this._generatorFunction = undefined;
    this._promiseFulfilled(undefined);
};

PromiseSpawn.prototype._continue = function (result) {
    var promise = this._promise;
    if (result === errorObj) {
        this._cleanup();
        if (this._cancellationPhase) {
            return promise.cancel();
        } else {
            return promise._rejectCallback(result.e, false);
        }
    }

    var value = result.value;
    if (result.done === true) {
        this._cleanup();
        if (this._cancellationPhase) {
            return promise.cancel();
        } else {
            return promise._resolveCallback(value);
        }
    } else {
        var maybePromise = tryConvertToPromise(value, this._promise);
        if (!(maybePromise instanceof Promise)) {
            maybePromise =
                promiseFromYieldHandler(maybePromise,
                                        this._yieldHandlers,
                                        this._promise);
            if (maybePromise === null) {
                this._promiseRejected(
                    new TypeError(
                        "A value %s was yielded that could not be treated as a promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a\u000a".replace("%s", value) +
                        "From coroutine:\u000a" +
                        this._stack.split("\n").slice(1, -7).join("\n")
                    )
                );
                return;
            }
        }
        maybePromise = maybePromise._target();
        var bitField = maybePromise._bitField;
        ;
        if (((bitField & 50397184) === 0)) {
            this._yieldedPromise = maybePromise;
            maybePromise._proxy(this, null);
        } else if (((bitField & 33554432) !== 0)) {
            Promise._async.invoke(
                this._promiseFulfilled, this, maybePromise._value()
            );
        } else if (((bitField & 16777216) !== 0)) {
            Promise._async.invoke(
                this._promiseRejected, this, maybePromise._reason()
            );
        } else {
            this._promiseCancelled();
        }
    }
};

Promise.coroutine = function (generatorFunction, options) {
    if (typeof generatorFunction !== "function") {
        throw new TypeError("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var yieldHandler = Object(options).yieldHandler;
    var PromiseSpawn$ = PromiseSpawn;
    var stack = new Error().stack;
    return function () {
        var generator = generatorFunction.apply(this, arguments);
        var spawn = new PromiseSpawn$(undefined, undefined, yieldHandler,
                                      stack);
        var ret = spawn.promise();
        spawn._generator = generator;
        spawn._promiseFulfilled(undefined);
        return ret;
    };
};

Promise.coroutine.addYieldHandler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    yieldHandlers.push(fn);
};

Promise.spawn = function (generatorFunction) {
    debug.deprecated("Promise.spawn()", "Promise.coroutine()");
    if (typeof generatorFunction !== "function") {
        return apiRejection("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
};
};

},{"./errors":58,"./util":82}],63:[function(require,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, tryConvertToPromise, INTERNAL, async,
         getDomain) {
var util = require("./util");
var canEvaluate = util.canEvaluate;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var reject;

if (!false) {
if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var promiseSetter = function(i) {
        return new Function("promise", "holder", "                           \n\
            'use strict';                                                    \n\
            holder.pIndex = promise;                                         \n\
            ".replace(/Index/g, i));
    };

    var generateHolderClass = function(total) {
        var props = new Array(total);
        for (var i = 0; i < props.length; ++i) {
            props[i] = "this.p" + (i+1);
        }
        var assignment = props.join(" = ") + " = null;";
        var cancellationCode= "var promise;\n" + props.map(function(prop) {
            return "                                                         \n\
                promise = " + prop + ";                                      \n\
                if (promise instanceof Promise) {                            \n\
                    promise.cancel();                                        \n\
                }                                                            \n\
            ";
        }).join("\n");
        var passedArguments = props.join(", ");
        var name = "Holder$" + total;


        var code = "return function(tryCatch, errorObj, Promise, async) {    \n\
            'use strict';                                                    \n\
            function [TheName](fn) {                                         \n\
                [TheProperties]                                              \n\
                this.fn = fn;                                                \n\
                this.asyncNeeded = true;                                     \n\
                this.now = 0;                                                \n\
            }                                                                \n\
                                                                             \n\
            [TheName].prototype._callFunction = function(promise) {          \n\
                promise._pushContext();                                      \n\
                var ret = tryCatch(this.fn)([ThePassedArguments]);           \n\
                promise._popContext();                                       \n\
                if (ret === errorObj) {                                      \n\
                    promise._rejectCallback(ret.e, false);                   \n\
                } else {                                                     \n\
                    promise._resolveCallback(ret);                           \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype.checkFulfillment = function(promise) {       \n\
                var now = ++this.now;                                        \n\
                if (now === [TheTotal]) {                                    \n\
                    if (this.asyncNeeded) {                                  \n\
                        async.invoke(this._callFunction, this, promise);     \n\
                    } else {                                                 \n\
                        this._callFunction(promise);                         \n\
                    }                                                        \n\
                                                                             \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype._resultCancelled = function() {              \n\
                [CancellationCode]                                           \n\
            };                                                               \n\
                                                                             \n\
            return [TheName];                                                \n\
        }(tryCatch, errorObj, Promise, async);                               \n\
        ";

        code = code.replace(/\[TheName\]/g, name)
            .replace(/\[TheTotal\]/g, total)
            .replace(/\[ThePassedArguments\]/g, passedArguments)
            .replace(/\[TheProperties\]/g, assignment)
            .replace(/\[CancellationCode\]/g, cancellationCode);

        return new Function("tryCatch", "errorObj", "Promise", "async", code)
                           (tryCatch, errorObj, Promise, async);
    };

    var holderClasses = [];
    var thenCallbacks = [];
    var promiseSetters = [];

    for (var i = 0; i < 8; ++i) {
        holderClasses.push(generateHolderClass(i + 1));
        thenCallbacks.push(thenCallback(i + 1));
        promiseSetters.push(promiseSetter(i + 1));
    }

    reject = function (reason) {
        this._reject(reason);
    };
}}

Promise.join = function () {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (!false) {
            if (last <= 8 && canEvaluate) {
                var ret = new Promise(INTERNAL);
                ret._captureStackTrace();
                var HolderClass = holderClasses[last - 1];
                var holder = new HolderClass(fn);
                var callbacks = thenCallbacks;

                for (var i = 0; i < last; ++i) {
                    var maybePromise = tryConvertToPromise(arguments[i], ret);
                    if (maybePromise instanceof Promise) {
                        maybePromise = maybePromise._target();
                        var bitField = maybePromise._bitField;
                        ;
                        if (((bitField & 50397184) === 0)) {
                            maybePromise._then(callbacks[i], reject,
                                               undefined, ret, holder);
                            promiseSetters[i](maybePromise, holder);
                            holder.asyncNeeded = false;
                        } else if (((bitField & 33554432) !== 0)) {
                            callbacks[i].call(ret,
                                              maybePromise._value(), holder);
                        } else if (((bitField & 16777216) !== 0)) {
                            ret._reject(maybePromise._reason());
                        } else {
                            ret._cancel();
                        }
                    } else {
                        callbacks[i].call(ret, maybePromise, holder);
                    }
                }

                if (!ret._isFateSealed()) {
                    if (holder.asyncNeeded) {
                        var domain = getDomain();
                        if (domain !== null) {
                            holder.fn = util.domainBind(domain, holder.fn);
                        }
                    }
                    ret._setAsyncGuaranteed();
                    ret._setOnCancel(holder);
                }
                return ret;
            }
        }
    }
    var $_len = arguments.length;var args = new Array($_len); for(var $_i = 0; $_i < $_len; ++$_i) {args[$_i] = arguments[$_i];};
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
};

};

},{"./util":82}],64:[function(require,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL,
                          debug) {
var getDomain = Promise._getDomain;
var util = require("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var async = Promise._async;

function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    var domain = getDomain();
    this._callback = domain === null ? fn : util.domainBind(domain, fn);
    this._preservedValues = _filter === INTERNAL
        ? new Array(this.length())
        : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = [];
    async.invoke(this._asyncInit, this, undefined);
}
util.inherits(MappingPromiseArray, PromiseArray);

MappingPromiseArray.prototype._asyncInit = function() {
    this._init$(undefined, -2);
};

MappingPromiseArray.prototype._init = function () {};

MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var limit = this._limit;

    if (index < 0) {
        index = (index * -1) - 1;
        values[index] = value;
        if (limit >= 1) {
            this._inFlight--;
            this._drainQueue();
            if (this._isResolved()) return true;
        }
    } else {
        if (limit >= 1 && this._inFlight >= limit) {
            values[index] = value;
            this._queue.push(index);
            return false;
        }
        if (preservedValues !== null) preservedValues[index] = value;

        var promise = this._promise;
        var callback = this._callback;
        var receiver = promise._boundValue();
        promise._pushContext();
        var ret = tryCatch(callback).call(receiver, value, index, length);
        var promiseCreated = promise._popContext();
        debug.checkForgottenReturns(
            ret,
            promiseCreated,
            preservedValues !== null ? "Promise.filter" : "Promise.map",
            promise
        );
        if (ret === errorObj) {
            this._reject(ret.e);
            return true;
        }

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            var bitField = maybePromise._bitField;
            ;
            if (((bitField & 50397184) === 0)) {
                if (limit >= 1) this._inFlight++;
                values[index] = maybePromise;
                maybePromise._proxy(this, (index + 1) * -1);
                return false;
            } else if (((bitField & 33554432) !== 0)) {
                ret = maybePromise._value();
            } else if (((bitField & 16777216) !== 0)) {
                this._reject(maybePromise._reason());
                return true;
            } else {
                this._cancel();
                return true;
            }
        }
        values[index] = ret;
    }
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= length) {
        if (preservedValues !== null) {
            this._filter(values, preservedValues);
        } else {
            this._resolve(values);
        }
        return true;
    }
    return false;
};

MappingPromiseArray.prototype._drainQueue = function () {
    var queue = this._queue;
    var limit = this._limit;
    var values = this._values;
    while (queue.length > 0 && this._inFlight < limit) {
        if (this._isResolved()) return;
        var index = queue.pop();
        this._promiseFulfilled(values[index], index);
    }
};

MappingPromiseArray.prototype._filter = function (booleans, values) {
    var len = values.length;
    var ret = new Array(len);
    var j = 0;
    for (var i = 0; i < len; ++i) {
        if (booleans[i]) ret[j++] = values[i];
    }
    ret.length = j;
    this._resolve(ret);
};

MappingPromiseArray.prototype.preservedValues = function () {
    return this._preservedValues;
};

function map(promises, fn, options, _filter) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }

    var limit = 0;
    if (options !== undefined) {
        if (typeof options === "object" && options !== null) {
            if (typeof options.concurrency !== "number") {
                return Promise.reject(
                    new TypeError("'concurrency' must be a number but it is " +
                                    util.classString(options.concurrency)));
            }
            limit = options.concurrency;
        } else {
            return Promise.reject(new TypeError(
                            "options argument must be an object but it is " +
                             util.classString(options)));
        }
    }
    limit = typeof limit === "number" &&
        isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter).promise();
}

Promise.prototype.map = function (fn, options) {
    return map(this, fn, options, null);
};

Promise.map = function (promises, fn, options, _filter) {
    return map(promises, fn, options, _filter);
};


};

},{"./util":82}],65:[function(require,module,exports){
"use strict";
module.exports =
function(Promise, INTERNAL, tryConvertToPromise, apiRejection, debug) {
var util = require("./util");
var tryCatch = util.tryCatch;

Promise.method = function (fn) {
    if (typeof fn !== "function") {
        throw new Promise.TypeError("expecting a function but got " + util.classString(fn));
    }
    return function () {
        var ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._pushContext();
        var value = tryCatch(fn).apply(this, arguments);
        var promiseCreated = ret._popContext();
        debug.checkForgottenReturns(
            value, promiseCreated, "Promise.method", ret);
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    var value;
    if (arguments.length > 1) {
        debug.deprecated("calling Promise.try with more than 1 argument");
        var arg = arguments[1];
        var ctx = arguments[2];
        value = util.isArray(arg) ? tryCatch(fn).apply(ctx, arg)
                                  : tryCatch(fn).call(ctx, arg);
    } else {
        value = tryCatch(fn)();
    }
    var promiseCreated = ret._popContext();
    debug.checkForgottenReturns(
        value, promiseCreated, "Promise.try", ret);
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util.errorObj) {
        this._rejectCallback(value.e, false);
    } else {
        this._resolveCallback(value, true);
    }
};
};

},{"./util":82}],66:[function(require,module,exports){
"use strict";
var util = require("./util");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = require("./errors");
var OperationalError = errors.OperationalError;
var es5 = require("./es5");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
        ret.name = obj.name;
        ret.message = obj.message;
        ret.stack = obj.stack;
        var keys = es5.keys(obj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (!rErrorKey.test(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    util.markAsOriginatingFromRejection(obj);
    return obj;
}

function nodebackForPromise(promise, multiArgs) {
    return function(err, value) {
        if (promise === null) return;
        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (!multiArgs) {
            promise._fulfill(value);
        } else {
            var $_len = arguments.length;var args = new Array(Math.max($_len - 1, 0)); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];};
            promise._fulfill(args);
        }
        promise = null;
    };
}

module.exports = nodebackForPromise;

},{"./errors":58,"./es5":59,"./util":82}],67:[function(require,module,exports){
"use strict";
module.exports = function(Promise) {
var util = require("./util");
var async = Promise._async;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function spreadAdapter(val, nodeback) {
    var promise = this;
    if (!util.isArray(val)) return successAdapter.call(promise, val, nodeback);
    var ret =
        tryCatch(nodeback).apply(promise._boundValue(), [null].concat(val));
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

function successAdapter(val, nodeback) {
    var promise = this;
    var receiver = promise._boundValue();
    var ret = val === undefined
        ? tryCatch(nodeback).call(receiver, null)
        : tryCatch(nodeback).call(receiver, null, val);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}
function errorAdapter(reason, nodeback) {
    var promise = this;
    if (!reason) {
        var newReason = new Error(reason + "");
        newReason.cause = reason;
        reason = newReason;
    }
    var ret = tryCatch(nodeback).call(promise._boundValue(), reason);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

Promise.prototype.asCallback = Promise.prototype.nodeify = function (nodeback,
                                                                     options) {
    if (typeof nodeback == "function") {
        var adapter = successAdapter;
        if (options !== undefined && Object(options).spread) {
            adapter = spreadAdapter;
        }
        this._then(
            adapter,
            errorAdapter,
            undefined,
            this,
            nodeback
        );
    }
    return this;
};
};

},{"./util":82}],68:[function(require,module,exports){
(function (process){
"use strict";
module.exports = function() {
var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var reflectHandler = function() {
    return new Promise.PromiseInspection(this._target());
};
var apiRejection = function(msg) {
    return Promise.reject(new TypeError(msg));
};
function Proxyable() {}
var UNDEFINED_BINDING = {};
var util = require("./util");

var getDomain;
if (util.isNode) {
    getDomain = function() {
        var ret = process.domain;
        if (ret === undefined) ret = null;
        return ret;
    };
} else {
    getDomain = function() {
        return null;
    };
}
util.notEnumerableProp(Promise, "_getDomain", getDomain);

var es5 = require("./es5");
var Async = require("./async");
var async = new Async();
es5.defineProperty(Promise, "_async", {value: async});
var errors = require("./errors");
var TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
var CancellationError = Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;
var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {};
var tryConvertToPromise = require("./thenables")(Promise, INTERNAL);
var PromiseArray =
    require("./promise_array")(Promise, INTERNAL,
                               tryConvertToPromise, apiRejection, Proxyable);
var Context = require("./context")(Promise);
 /*jshint unused:false*/
var createContext = Context.create;
var debug = require("./debuggability")(Promise, Context);
var CapturedTrace = debug.CapturedTrace;
var PassThroughHandlerContext =
    require("./finally")(Promise, tryConvertToPromise);
var catchFilter = require("./catch_filter")(NEXT_FILTER);
var nodebackForPromise = require("./nodeback");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
function check(self, executor) {
    if (typeof executor !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(executor));
    }
    if (self.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
}

function Promise(executor) {
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    if (executor !== INTERNAL) {
        check(this, executor);
        this._resolveFromExecutor(executor);
    }
    this._promiseCreated();
    this._fireEvent("promiseCreated", this);
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (util.isObject(item)) {
                catchInstances[j++] = item;
            } else {
                return apiRejection("expecting an object but got " +
                    "A catch statement predicate " + util.classString(item));
            }
        }
        catchInstances.length = j;
        fn = arguments[i];
        return this.then(undefined, catchFilter(catchInstances, fn, this));
    }
    return this.then(undefined, fn);
};

Promise.prototype.reflect = function () {
    return this._then(reflectHandler,
        reflectHandler, undefined, this, undefined);
};

Promise.prototype.then = function (didFulfill, didReject) {
    if (debug.warnings() && arguments.length > 0 &&
        typeof didFulfill !== "function" &&
        typeof didReject !== "function") {
        var msg = ".then() only accepts functions but was passed: " +
                util.classString(didFulfill);
        if (arguments.length > 1) {
            msg += ", " + util.classString(didReject);
        }
        this._warn(msg);
    }
    return this._then(didFulfill, didReject, undefined, undefined, undefined);
};

Promise.prototype.done = function (didFulfill, didReject) {
    var promise =
        this._then(didFulfill, didReject, undefined, undefined, undefined);
    promise._setIsFinal();
};

Promise.prototype.spread = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    return this.all()._then(fn, undefined, undefined, APPLY, undefined);
};

Promise.prototype.toJSON = function () {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: undefined,
        rejectionReason: undefined
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this.value();
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this.reason();
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function () {
    if (arguments.length > 0) {
        this._warn(".all() was passed arguments but it does not take any");
    }
    return new PromiseArray(this).promise();
};

Promise.prototype.error = function (fn) {
    return this.caught(util.originatesFromRejection, fn);
};

Promise.getNewLibraryCopy = module.exports;

Promise.is = function (val) {
    return val instanceof Promise;
};

Promise.fromNode = Promise.fromCallback = function(fn) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    var multiArgs = arguments.length > 1 ? !!Object(arguments[1]).multiArgs
                                         : false;
    var result = tryCatch(fn)(nodebackForPromise(ret, multiArgs));
    if (result === errorObj) {
        ret._rejectCallback(result.e, true);
    }
    if (!ret._isFateSealed()) ret._setAsyncGuaranteed();
    return ret;
};

Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
};

Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
        ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._setFulfilled();
        ret._rejectionHandler0 = obj;
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._rejectCallback(reason, true);
    return ret;
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    return async.setScheduler(fn);
};

Promise.prototype._then = function (
    didFulfill,
    didReject,
    _,    receiver,
    internalData
) {
    var haveInternalData = internalData !== undefined;
    var promise = haveInternalData ? internalData : new Promise(INTERNAL);
    var target = this._target();
    var bitField = target._bitField;

    if (!haveInternalData) {
        promise._propagateFrom(this, 3);
        promise._captureStackTrace();
        if (receiver === undefined &&
            ((this._bitField & 2097152) !== 0)) {
            if (!((bitField & 50397184) === 0)) {
                receiver = this._boundValue();
            } else {
                receiver = target === this ? undefined : this._boundTo;
            }
        }
        this._fireEvent("promiseChained", this, promise);
    }

    var domain = getDomain();
    if (!((bitField & 50397184) === 0)) {
        var handler, value, settler = target._settlePromiseCtx;
        if (((bitField & 33554432) !== 0)) {
            value = target._rejectionHandler0;
            handler = didFulfill;
        } else if (((bitField & 16777216) !== 0)) {
            value = target._fulfillmentHandler0;
            handler = didReject;
            target._unsetRejectionIsUnhandled();
        } else {
            settler = target._settlePromiseLateCancellationObserver;
            value = new CancellationError("late cancellation observer");
            target._attachExtraTrace(value);
            handler = didReject;
        }

        async.invoke(settler, target, {
            handler: domain === null ? handler
                : (typeof handler === "function" &&
                    util.domainBind(domain, handler)),
            promise: promise,
            receiver: receiver,
            value: value
        });
    } else {
        target._addCallbacks(didFulfill, didReject, promise, receiver, domain);
    }

    return promise;
};

Promise.prototype._length = function () {
    return this._bitField & 65535;
};

Promise.prototype._isFateSealed = function () {
    return (this._bitField & 117506048) !== 0;
};

Promise.prototype._isFollowing = function () {
    return (this._bitField & 67108864) === 67108864;
};

Promise.prototype._setLength = function (len) {
    this._bitField = (this._bitField & -65536) |
        (len & 65535);
};

Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 33554432;
    this._fireEvent("promiseFulfilled", this);
};

Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 16777216;
    this._fireEvent("promiseRejected", this);
};

Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 67108864;
    this._fireEvent("promiseResolved", this);
};

Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._isFinal = function () {
    return (this._bitField & 4194304) > 0;
};

Promise.prototype._unsetCancelled = function() {
    this._bitField = this._bitField & (~65536);
};

Promise.prototype._setCancelled = function() {
    this._bitField = this._bitField | 65536;
    this._fireEvent("promiseCancelled", this);
};

Promise.prototype._setWillBeCancelled = function() {
    this._bitField = this._bitField | 8388608;
};

Promise.prototype._setAsyncGuaranteed = function() {
    if (async.hasCustomScheduler()) return;
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._receiverAt = function (index) {
    var ret = index === 0 ? this._receiver0 : this[
            index * 4 - 4 + 3];
    if (ret === UNDEFINED_BINDING) {
        return undefined;
    } else if (ret === undefined && this._isBound()) {
        return this._boundValue();
    }
    return ret;
};

Promise.prototype._promiseAt = function (index) {
    return this[
            index * 4 - 4 + 2];
};

Promise.prototype._fulfillmentHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 0];
};

Promise.prototype._rejectionHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 1];
};

Promise.prototype._boundValue = function() {};

Promise.prototype._migrateCallback0 = function (follower) {
    var bitField = follower._bitField;
    var fulfill = follower._fulfillmentHandler0;
    var reject = follower._rejectionHandler0;
    var promise = follower._promise0;
    var receiver = follower._receiverAt(0);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._migrateCallbackAt = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);
    var reject = follower._rejectionHandlerAt(index);
    var promise = follower._promiseAt(index);
    var receiver = follower._receiverAt(index);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._addCallbacks = function (
    fulfill,
    reject,
    promise,
    receiver,
    domain
) {
    var index = this._length();

    if (index >= 65535 - 4) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        this._receiver0 = receiver;
        if (typeof fulfill === "function") {
            this._fulfillmentHandler0 =
                domain === null ? fulfill : util.domainBind(domain, fulfill);
        }
        if (typeof reject === "function") {
            this._rejectionHandler0 =
                domain === null ? reject : util.domainBind(domain, reject);
        }
    } else {
        var base = index * 4 - 4;
        this[base + 2] = promise;
        this[base + 3] = receiver;
        if (typeof fulfill === "function") {
            this[base + 0] =
                domain === null ? fulfill : util.domainBind(domain, fulfill);
        }
        if (typeof reject === "function") {
            this[base + 1] =
                domain === null ? reject : util.domainBind(domain, reject);
        }
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._proxy = function (proxyable, arg) {
    this._addCallbacks(undefined, undefined, arg, proxyable, null);
};

Promise.prototype._resolveCallback = function(value, shouldBind) {
    if (((this._bitField & 117506048) !== 0)) return;
    if (value === this)
        return this._rejectCallback(makeSelfResolutionError(), false);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    if (shouldBind) this._propagateFrom(maybePromise, 2);

    var promise = maybePromise._target();

    if (promise === this) {
        this._reject(makeSelfResolutionError());
        return;
    }

    var bitField = promise._bitField;
    if (((bitField & 50397184) === 0)) {
        var len = this._length();
        if (len > 0) promise._migrateCallback0(this);
        for (var i = 1; i < len; ++i) {
            promise._migrateCallbackAt(this, i);
        }
        this._setFollowing();
        this._setLength(0);
        this._setFollowee(promise);
    } else if (((bitField & 33554432) !== 0)) {
        this._fulfill(promise._value());
    } else if (((bitField & 16777216) !== 0)) {
        this._reject(promise._reason());
    } else {
        var reason = new CancellationError("late cancellation observer");
        promise._attachExtraTrace(reason);
        this._reject(reason);
    }
};

Promise.prototype._rejectCallback =
function(reason, synchronous, ignoreNonErrorWarnings) {
    var trace = util.ensureErrorObject(reason);
    var hasStack = trace === reason;
    if (!hasStack && !ignoreNonErrorWarnings && debug.warnings()) {
        var message = "a promise was rejected with a non-error: " +
            util.classString(reason);
        this._warn(message, true);
    }
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason);
};

Promise.prototype._resolveFromExecutor = function (executor) {
    var promise = this;
    this._captureStackTrace();
    this._pushContext();
    var synchronous = true;
    var r = this._execute(executor, function(value) {
        promise._resolveCallback(value);
    }, function (reason) {
        promise._rejectCallback(reason, synchronous);
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined) {
        promise._rejectCallback(r, true);
    }
};

Promise.prototype._settlePromiseFromHandler = function (
    handler, receiver, value, promise
) {
    var bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;
    promise._pushContext();
    var x;
    if (receiver === APPLY) {
        if (!value || typeof value.length !== "number") {
            x = errorObj;
            x.e = new TypeError("cannot .spread() a non-array: " +
                                    util.classString(value));
        } else {
            x = tryCatch(handler).apply(this._boundValue(), value);
        }
    } else {
        x = tryCatch(handler).call(receiver, value);
    }
    var promiseCreated = promise._popContext();
    bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;

    if (x === NEXT_FILTER) {
        promise._reject(value);
    } else if (x === errorObj) {
        promise._rejectCallback(x.e, false);
    } else {
        debug.checkForgottenReturns(x, promiseCreated, "",  promise, this);
        promise._resolveCallback(x);
    }
};

Promise.prototype._target = function() {
    var ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
};

Promise.prototype._followee = function() {
    return this._rejectionHandler0;
};

Promise.prototype._setFollowee = function(promise) {
    this._rejectionHandler0 = promise;
};

Promise.prototype._settlePromise = function(promise, handler, receiver, value) {
    var isPromise = promise instanceof Promise;
    var bitField = this._bitField;
    var asyncGuaranteed = ((bitField & 134217728) !== 0);
    if (((bitField & 65536) !== 0)) {
        if (isPromise) promise._invokeInternalOnCancel();

        if (receiver instanceof PassThroughHandlerContext &&
            receiver.isFinallyHandler()) {
            receiver.cancelPromise = promise;
            if (tryCatch(handler).call(receiver, value) === errorObj) {
                promise._reject(errorObj.e);
            }
        } else if (handler === reflectHandler) {
            promise._fulfill(reflectHandler.call(receiver));
        } else if (receiver instanceof Proxyable) {
            receiver._promiseCancelled(promise);
        } else if (isPromise || promise instanceof PromiseArray) {
            promise._cancel();
        } else {
            receiver.cancel();
        }
    } else if (typeof handler === "function") {
        if (!isPromise) {
            handler.call(receiver, value, promise);
        } else {
            if (asyncGuaranteed) promise._setAsyncGuaranteed();
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (receiver instanceof Proxyable) {
        if (!receiver._isResolved()) {
            if (((bitField & 33554432) !== 0)) {
                receiver._promiseFulfilled(value, promise);
            } else {
                receiver._promiseRejected(value, promise);
            }
        }
    } else if (isPromise) {
        if (asyncGuaranteed) promise._setAsyncGuaranteed();
        if (((bitField & 33554432) !== 0)) {
            promise._fulfill(value);
        } else {
            promise._reject(value);
        }
    }
};

Promise.prototype._settlePromiseLateCancellationObserver = function(ctx) {
    var handler = ctx.handler;
    var promise = ctx.promise;
    var receiver = ctx.receiver;
    var value = ctx.value;
    if (typeof handler === "function") {
        if (!(promise instanceof Promise)) {
            handler.call(receiver, value, promise);
        } else {
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (promise instanceof Promise) {
        promise._reject(value);
    }
};

Promise.prototype._settlePromiseCtx = function(ctx) {
    this._settlePromise(ctx.promise, ctx.handler, ctx.receiver, ctx.value);
};

Promise.prototype._settlePromise0 = function(handler, value, bitField) {
    var promise = this._promise0;
    var receiver = this._receiverAt(0);
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settlePromise(promise, handler, receiver, value);
};

Promise.prototype._clearCallbackDataAtIndex = function(index) {
    var base = index * 4 - 4;
    this[base + 2] =
    this[base + 3] =
    this[base + 0] =
    this[base + 1] = undefined;
};

Promise.prototype._fulfill = function (value) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._reject(err);
    }
    this._setFulfilled();
    this._rejectionHandler0 = value;

    if ((bitField & 65535) > 0) {
        if (((bitField & 134217728) !== 0)) {
            this._settlePromises();
        } else {
            async.settlePromises(this);
        }
    }
};

Promise.prototype._reject = function (reason) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    this._setRejected();
    this._fulfillmentHandler0 = reason;

    if (this._isFinal()) {
        return async.fatalError(reason, util.isNode);
    }

    if ((bitField & 65535) > 0) {
        async.settlePromises(this);
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._fulfillPromises = function (len, value) {
    for (var i = 1; i < len; i++) {
        var handler = this._fulfillmentHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, value);
    }
};

Promise.prototype._rejectPromises = function (len, reason) {
    for (var i = 1; i < len; i++) {
        var handler = this._rejectionHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, reason);
    }
};

Promise.prototype._settlePromises = function () {
    var bitField = this._bitField;
    var len = (bitField & 65535);

    if (len > 0) {
        if (((bitField & 16842752) !== 0)) {
            var reason = this._fulfillmentHandler0;
            this._settlePromise0(this._rejectionHandler0, reason, bitField);
            this._rejectPromises(len, reason);
        } else {
            var value = this._rejectionHandler0;
            this._settlePromise0(this._fulfillmentHandler0, value, bitField);
            this._fulfillPromises(len, value);
        }
        this._setLength(0);
    }
    this._clearCancellationData();
};

Promise.prototype._settledValue = function() {
    var bitField = this._bitField;
    if (((bitField & 33554432) !== 0)) {
        return this._rejectionHandler0;
    } else if (((bitField & 16777216) !== 0)) {
        return this._fulfillmentHandler0;
    }
};

function deferResolve(v) {this.promise._resolveCallback(v);}
function deferReject(v) {this.promise._rejectCallback(v, false);}

Promise.defer = Promise.pending = function() {
    debug.deprecated("Promise.defer", "new Promise");
    var promise = new Promise(INTERNAL);
    return {
        promise: promise,
        resolve: deferResolve,
        reject: deferReject
    };
};

util.notEnumerableProp(Promise,
                       "_makeSelfResolutionError",
                       makeSelfResolutionError);

require("./method")(Promise, INTERNAL, tryConvertToPromise, apiRejection,
    debug);
require("./bind")(Promise, INTERNAL, tryConvertToPromise, debug);
require("./cancel")(Promise, PromiseArray, apiRejection, debug);
require("./direct_resolve")(Promise);
require("./synchronous_inspection")(Promise);
require("./join")(
    Promise, PromiseArray, tryConvertToPromise, INTERNAL, async, getDomain);
Promise.Promise = Promise;
Promise.version = "3.4.7";
require('./map.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
require('./call_get.js')(Promise);
require('./using.js')(Promise, apiRejection, tryConvertToPromise, createContext, INTERNAL, debug);
require('./timers.js')(Promise, INTERNAL, debug);
require('./generators.js')(Promise, apiRejection, INTERNAL, tryConvertToPromise, Proxyable, debug);
require('./nodeify.js')(Promise);
require('./promisify.js')(Promise, INTERNAL);
require('./props.js')(Promise, PromiseArray, tryConvertToPromise, apiRejection);
require('./race.js')(Promise, INTERNAL, tryConvertToPromise, apiRejection);
require('./reduce.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
require('./settle.js')(Promise, PromiseArray, debug);
require('./some.js')(Promise, PromiseArray, apiRejection);
require('./filter.js')(Promise, INTERNAL);
require('./each.js')(Promise, INTERNAL);
require('./any.js')(Promise);
                                                         
    util.toFastProperties(Promise);                                          
    util.toFastProperties(Promise.prototype);                                
    function fillTypes(value) {                                              
        var p = new Promise(INTERNAL);                                       
        p._fulfillmentHandler0 = value;                                      
        p._rejectionHandler0 = value;                                        
        p._promise0 = value;                                                 
        p._receiver0 = value;                                                
    }                                                                        
    // Complete slack tracking, opt out of field-type tracking and           
    // stabilize map                                                         
    fillTypes({a: 1});                                                       
    fillTypes({b: 2});                                                       
    fillTypes({c: 3});                                                       
    fillTypes(1);                                                            
    fillTypes(function(){});                                                 
    fillTypes(undefined);                                                    
    fillTypes(false);                                                        
    fillTypes(new Promise(INTERNAL));                                        
    debug.setBounds(Async.firstLineError, util.lastLineError);               
    return Promise;                                                          

};

}).call(this,require('_process'))
},{"./any.js":48,"./async":49,"./bind":50,"./call_get.js":51,"./cancel":52,"./catch_filter":53,"./context":54,"./debuggability":55,"./direct_resolve":56,"./each.js":57,"./errors":58,"./es5":59,"./filter.js":60,"./finally":61,"./generators.js":62,"./join":63,"./map.js":64,"./method":65,"./nodeback":66,"./nodeify.js":67,"./promise_array":69,"./promisify.js":70,"./props.js":71,"./race.js":73,"./reduce.js":74,"./settle.js":76,"./some.js":77,"./synchronous_inspection":78,"./thenables":79,"./timers.js":80,"./using.js":81,"./util":82,"_process":101}],69:[function(require,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise,
    apiRejection, Proxyable) {
var util = require("./util");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -2: return [];
    case -3: return {};
    }
}

function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);
    if (values instanceof Promise) {
        promise._propagateFrom(values, 3);
    }
    promise._setOnCancel(this);
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
}
util.inherits(PromiseArray, Proxyable);

PromiseArray.prototype.length = function () {
    return this._length;
};

PromiseArray.prototype.promise = function () {
    return this._promise;
};

PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
        values = values._target();
        var bitField = values._bitField;
        ;
        this._values = values;

        if (((bitField & 50397184) === 0)) {
            this._promise._setAsyncGuaranteed();
            return values._then(
                init,
                this._reject,
                undefined,
                this,
                resolveValueIfEmpty
           );
        } else if (((bitField & 33554432) !== 0)) {
            values = values._value();
        } else if (((bitField & 16777216) !== 0)) {
            return this._reject(values._reason());
        } else {
            return this._cancel();
        }
    }
    values = util.asArray(values);
    if (values === null) {
        var err = apiRejection(
            "expecting an array or an iterable object but got " + util.classString(values)).reason();
        this._promise._rejectCallback(err, false);
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    this._iterate(values);
};

PromiseArray.prototype._iterate = function(values) {
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var result = this._promise;
    var isResolved = false;
    var bitField = null;
    for (var i = 0; i < len; ++i) {
        var maybePromise = tryConvertToPromise(values[i], result);

        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            bitField = maybePromise._bitField;
        } else {
            bitField = null;
        }

        if (isResolved) {
            if (bitField !== null) {
                maybePromise.suppressUnhandledRejections();
            }
        } else if (bitField !== null) {
            if (((bitField & 50397184) === 0)) {
                maybePromise._proxy(this, i);
                this._values[i] = maybePromise;
            } else if (((bitField & 33554432) !== 0)) {
                isResolved = this._promiseFulfilled(maybePromise._value(), i);
            } else if (((bitField & 16777216) !== 0)) {
                isResolved = this._promiseRejected(maybePromise._reason(), i);
            } else {
                isResolved = this._promiseCancelled(i);
            }
        } else {
            isResolved = this._promiseFulfilled(maybePromise, i);
        }
    }
    if (!isResolved) result._setAsyncGuaranteed();
};

PromiseArray.prototype._isResolved = function () {
    return this._values === null;
};

PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype._cancel = function() {
    if (this._isResolved() || !this._promise._isCancellable()) return;
    this._values = null;
    this._promise._cancel();
};

PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false);
};

PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

PromiseArray.prototype._promiseCancelled = function() {
    this._cancel();
    return true;
};

PromiseArray.prototype._promiseRejected = function (reason) {
    this._totalResolved++;
    this._reject(reason);
    return true;
};

PromiseArray.prototype._resultCancelled = function() {
    if (this._isResolved()) return;
    var values = this._values;
    this._cancel();
    if (values instanceof Promise) {
        values.cancel();
    } else {
        for (var i = 0; i < values.length; ++i) {
            if (values[i] instanceof Promise) {
                values[i].cancel();
            }
        }
    }
};

PromiseArray.prototype.shouldCopyValues = function () {
    return true;
};

PromiseArray.prototype.getActualLength = function (len) {
    return len;
};

return PromiseArray;
};

},{"./util":82}],70:[function(require,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var THIS = {};
var util = require("./util");
var nodebackForPromise = require("./nodeback");
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var TypeError = require("./errors").TypeError;
var defaultSuffix = "Async";
var defaultPromisified = {__isPromisified__: true};
var noCopyProps = [
    "arity",    "length",
    "name",
    "arguments",
    "caller",
    "callee",
    "prototype",
    "__isPromisified__"
];
var noCopyPropsPattern = new RegExp("^(?:" + noCopyProps.join("|") + ")$");

var defaultFilter = function(name) {
    return util.isIdentifier(name) &&
        name.charAt(0) !== "_" &&
        name !== "constructor";
};

function propsFilter(key) {
    return !noCopyPropsPattern.test(key);
}

function isPromisified(fn) {
    try {
        return fn.__isPromisified__ === true;
    }
    catch (e) {
        return false;
    }
}

function hasPromisified(obj, key, suffix) {
    var val = util.getDataPropertyOrDefault(obj, key + suffix,
                                            defaultPromisified);
    return val ? isPromisified(val) : false;
}
function checkValid(ret, suffix, suffixRegexp) {
    for (var i = 0; i < ret.length; i += 2) {
        var key = ret[i];
        if (suffixRegexp.test(key)) {
            var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
            for (var j = 0; j < ret.length; j += 2) {
                if (ret[j] === keyWithoutAsyncSuffix) {
                    throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/MqrFmX\u000a"
                        .replace("%s", suffix));
                }
            }
        }
    }
}

function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    var keys = util.inheritedDataKeys(obj);
    var ret = [];
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var value = obj[key];
        var passesDefaultFilter = filter === defaultFilter
            ? true : defaultFilter(key, value, obj);
        if (typeof value === "function" &&
            !isPromisified(value) &&
            !hasPromisified(obj, key, suffix) &&
            filter(key, value, obj, passesDefaultFilter)) {
            ret.push(key, value);
        }
    }
    checkValid(ret, suffix, suffixRegexp);
    return ret;
}

var escapeIdentRegex = function(str) {
    return str.replace(/([$])/, "\\$");
};

var makeNodePromisifiedEval;
if (!false) {
var switchCaseArgumentOrder = function(likelyArgumentCount) {
    var ret = [likelyArgumentCount];
    var min = Math.max(0, likelyArgumentCount - 1 - 3);
    for(var i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
    }
    for(var i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
    }
    return ret;
};

var argumentSequence = function(argumentCount) {
    return util.filledRange(argumentCount, "_arg", "");
};

var parameterDeclaration = function(parameterCount) {
    return util.filledRange(
        Math.max(parameterCount, 3), "_arg", "");
};

var parameterCount = function(fn) {
    if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
    }
    return 0;
};

makeNodePromisifiedEval =
function(callback, receiver, originalName, fn, _, multiArgs) {
    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
    var argumentOrder = switchCaseArgumentOrder(newParameterCount);
    var shouldProxyThis = typeof callback === "string" || receiver === THIS;

    function generateCallForArgumentCount(count) {
        var args = argumentSequence(count).join(", ");
        var comma = count > 0 ? ", " : "";
        var ret;
        if (shouldProxyThis) {
            ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
        } else {
            ret = receiver === undefined
                ? "ret = callback({{args}}, nodeback); break;\n"
                : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
        }
        return ret.replace("{{args}}", args).replace(", ", comma);
    }

    function generateArgumentSwitchCase() {
        var ret = "";
        for (var i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] +":" +
                generateCallForArgumentCount(argumentOrder[i]);
        }

        ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", (shouldProxyThis
                                ? "ret = callback.apply(this, args);\n"
                                : "ret = callback.apply(receiver, args);\n"));
        return ret;
    }

    var getFunctionCode = typeof callback === "string"
                                ? ("this != null ? this['"+callback+"'] : fn")
                                : "fn";
    var body = "'use strict';                                                \n\
        var ret = function (Parameters) {                                    \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._captureStackTrace();                                    \n\
            var nodeback = nodebackForPromise(promise, " + multiArgs + ");   \n\
            var ret;                                                         \n\
            var callback = tryCatch([GetFunctionCode]);                      \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true, true);\n\
            }                                                                \n\
            if (!promise._isFateSealed()) promise._setAsyncGuaranteed();     \n\
            return promise;                                                  \n\
        };                                                                   \n\
        notEnumerableProp(ret, '__isPromisified__', true);                   \n\
        return ret;                                                          \n\
    ".replace("[CodeForSwitchCase]", generateArgumentSwitchCase())
        .replace("[GetFunctionCode]", getFunctionCode);
    body = body.replace("Parameters", parameterDeclaration(newParameterCount));
    return new Function("Promise",
                        "fn",
                        "receiver",
                        "withAppended",
                        "maybeWrapAsError",
                        "nodebackForPromise",
                        "tryCatch",
                        "errorObj",
                        "notEnumerableProp",
                        "INTERNAL",
                        body)(
                    Promise,
                    fn,
                    receiver,
                    withAppended,
                    maybeWrapAsError,
                    nodebackForPromise,
                    util.tryCatch,
                    util.errorObj,
                    util.notEnumerableProp,
                    INTERNAL);
};
}

function makeNodePromisifiedClosure(callback, receiver, _, fn, __, multiArgs) {
    var defaultThis = (function() {return this;})();
    var method = callback;
    if (typeof method === "string") {
        callback = fn;
    }
    function promisified() {
        var _receiver = receiver;
        if (receiver === THIS) _receiver = this;
        var promise = new Promise(INTERNAL);
        promise._captureStackTrace();
        var cb = typeof method === "string" && this !== defaultThis
            ? this[method] : callback;
        var fn = nodebackForPromise(promise, multiArgs);
        try {
            cb.apply(_receiver, withAppended(arguments, fn));
        } catch(e) {
            promise._rejectCallback(maybeWrapAsError(e), true, true);
        }
        if (!promise._isFateSealed()) promise._setAsyncGuaranteed();
        return promise;
    }
    util.notEnumerableProp(promisified, "__isPromisified__", true);
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function promisifyAll(obj, suffix, filter, promisifier, multiArgs) {
    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    var methods =
        promisifiableMethods(obj, suffix, suffixRegexp, filter);

    for (var i = 0, len = methods.length; i < len; i+= 2) {
        var key = methods[i];
        var fn = methods[i+1];
        var promisifiedKey = key + suffix;
        if (promisifier === makeNodePromisified) {
            obj[promisifiedKey] =
                makeNodePromisified(key, THIS, key, fn, suffix, multiArgs);
        } else {
            var promisified = promisifier(fn, function() {
                return makeNodePromisified(key, THIS, key,
                                           fn, suffix, multiArgs);
            });
            util.notEnumerableProp(promisified, "__isPromisified__", true);
            obj[promisifiedKey] = promisified;
        }
    }
    util.toFastProperties(obj);
    return obj;
}

function promisify(callback, receiver, multiArgs) {
    return makeNodePromisified(callback, receiver, undefined,
                                callback, null, multiArgs);
}

Promise.promisify = function (fn, options) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    if (isPromisified(fn)) {
        return fn;
    }
    options = Object(options);
    var receiver = options.context === undefined ? THIS : options.context;
    var multiArgs = !!options.multiArgs;
    var ret = promisify(fn, receiver, multiArgs);
    util.copyDescriptors(fn, ret, propsFilter);
    return ret;
};

Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
        throw new TypeError("the target of promisifyAll must be an object or a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    options = Object(options);
    var multiArgs = !!options.multiArgs;
    var suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    var filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    var promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

    if (!util.isIdentifier(suffix)) {
        throw new RangeError("suffix must be a valid identifier\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    var keys = util.inheritedDataKeys(target);
    for (var i = 0; i < keys.length; ++i) {
        var value = target[keys[i]];
        if (keys[i] !== "constructor" &&
            util.isClass(value)) {
            promisifyAll(value.prototype, suffix, filter, promisifier,
                multiArgs);
            promisifyAll(value, suffix, filter, promisifier, multiArgs);
        }
    }

    return promisifyAll(target, suffix, filter, promisifier, multiArgs);
};
};


},{"./errors":58,"./nodeback":66,"./util":82}],71:[function(require,module,exports){
"use strict";
module.exports = function(
    Promise, PromiseArray, tryConvertToPromise, apiRejection) {
var util = require("./util");
var isObject = util.isObject;
var es5 = require("./es5");
var Es6Map;
if (typeof Map === "function") Es6Map = Map;

var mapToEntries = (function() {
    var index = 0;
    var size = 0;

    function extractEntry(value, key) {
        this[index] = value;
        this[index + size] = key;
        index++;
    }

    return function mapToEntries(map) {
        size = map.size;
        index = 0;
        var ret = new Array(map.size * 2);
        map.forEach(extractEntry, ret);
        return ret;
    };
})();

var entriesToMap = function(entries) {
    var ret = new Es6Map();
    var length = entries.length / 2 | 0;
    for (var i = 0; i < length; ++i) {
        var key = entries[length + i];
        var value = entries[i];
        ret.set(key, value);
    }
    return ret;
};

function PropertiesPromiseArray(obj) {
    var isMap = false;
    var entries;
    if (Es6Map !== undefined && obj instanceof Es6Map) {
        entries = mapToEntries(obj);
        isMap = true;
    } else {
        var keys = es5.keys(obj);
        var len = keys.length;
        entries = new Array(len * 2);
        for (var i = 0; i < len; ++i) {
            var key = keys[i];
            entries[i] = obj[key];
            entries[i + len] = key;
        }
    }
    this.constructor$(entries);
    this._isMap = isMap;
    this._init$(undefined, -3);
}
util.inherits(PropertiesPromiseArray, PromiseArray);

PropertiesPromiseArray.prototype._init = function () {};

PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        var val;
        if (this._isMap) {
            val = entriesToMap(this._values);
        } else {
            val = {};
            var keyOffset = this.length();
            for (var i = 0, len = this.length(); i < len; ++i) {
                val[this._values[i + keyOffset]] = this._values[i];
            }
        }
        this._resolve(val);
        return true;
    }
    return false;
};

PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
};

function props(promises) {
    var ret;
    var castValue = tryConvertToPromise(promises);

    if (!isObject(castValue)) {
        return apiRejection("cannot await properties of a non-object\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    } else if (castValue instanceof Promise) {
        ret = castValue._then(
            Promise.props, undefined, undefined, undefined, undefined);
    } else {
        ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
        ret._propagateFrom(castValue, 2);
    }
    return ret;
}

Promise.prototype.props = function () {
    return props(this);
};

Promise.props = function (promises) {
    return props(promises);
};
};

},{"./es5":59,"./util":82}],72:[function(require,module,exports){
"use strict";
function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
}

Queue.prototype._willBeOverCapacity = function (size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function (arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype.push = function (fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 1);
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    var moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

module.exports = Queue;

},{}],73:[function(require,module,exports){
"use strict";
module.exports = function(
    Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var util = require("./util");

var raceLater = function (promise) {
    return promise.then(function(array) {
        return race(array, promise);
    });
};

function race(promises, parent) {
    var maybePromise = tryConvertToPromise(promises);

    if (maybePromise instanceof Promise) {
        return raceLater(maybePromise);
    } else {
        promises = util.asArray(promises);
        if (promises === null)
            return apiRejection("expecting an array or an iterable object but got " + util.classString(promises));
    }

    var ret = new Promise(INTERNAL);
    if (parent !== undefined) {
        ret._propagateFrom(parent, 3);
    }
    var fulfill = ret._fulfill;
    var reject = ret._reject;
    for (var i = 0, len = promises.length; i < len; ++i) {
        var val = promises[i];

        if (val === undefined && !(i in promises)) {
            continue;
        }

        Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
    }
    return ret;
}

Promise.race = function (promises) {
    return race(promises, undefined);
};

Promise.prototype.race = function () {
    return race(this, undefined);
};

};

},{"./util":82}],74:[function(require,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL,
                          debug) {
var getDomain = Promise._getDomain;
var util = require("./util");
var tryCatch = util.tryCatch;

function ReductionPromiseArray(promises, fn, initialValue, _each) {
    this.constructor$(promises);
    var domain = getDomain();
    this._fn = domain === null ? fn : util.domainBind(domain, fn);
    if (initialValue !== undefined) {
        initialValue = Promise.resolve(initialValue);
        initialValue._attachCancellationCallback(this);
    }
    this._initialValue = initialValue;
    this._currentCancellable = null;
    if(_each === INTERNAL) {
        this._eachValues = Array(this._length);
    } else if (_each === 0) {
        this._eachValues = null;
    } else {
        this._eachValues = undefined;
    }
    this._promise._captureStackTrace();
    this._init$(undefined, -5);
}
util.inherits(ReductionPromiseArray, PromiseArray);

ReductionPromiseArray.prototype._gotAccum = function(accum) {
    if (this._eachValues !== undefined && 
        this._eachValues !== null && 
        accum !== INTERNAL) {
        this._eachValues.push(accum);
    }
};

ReductionPromiseArray.prototype._eachComplete = function(value) {
    if (this._eachValues !== null) {
        this._eachValues.push(value);
    }
    return this._eachValues;
};

ReductionPromiseArray.prototype._init = function() {};

ReductionPromiseArray.prototype._resolveEmptyArray = function() {
    this._resolve(this._eachValues !== undefined ? this._eachValues
                                                 : this._initialValue);
};

ReductionPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

ReductionPromiseArray.prototype._resolve = function(value) {
    this._promise._resolveCallback(value);
    this._values = null;
};

ReductionPromiseArray.prototype._resultCancelled = function(sender) {
    if (sender === this._initialValue) return this._cancel();
    if (this._isResolved()) return;
    this._resultCancelled$();
    if (this._currentCancellable instanceof Promise) {
        this._currentCancellable.cancel();
    }
    if (this._initialValue instanceof Promise) {
        this._initialValue.cancel();
    }
};

ReductionPromiseArray.prototype._iterate = function (values) {
    this._values = values;
    var value;
    var i;
    var length = values.length;
    if (this._initialValue !== undefined) {
        value = this._initialValue;
        i = 0;
    } else {
        value = Promise.resolve(values[0]);
        i = 1;
    }

    this._currentCancellable = value;

    if (!value.isRejected()) {
        for (; i < length; ++i) {
            var ctx = {
                accum: null,
                value: values[i],
                index: i,
                length: length,
                array: this
            };
            value = value._then(gotAccum, undefined, undefined, ctx, undefined);
        }
    }

    if (this._eachValues !== undefined) {
        value = value
            ._then(this._eachComplete, undefined, undefined, this, undefined);
    }
    value._then(completed, completed, undefined, value, this);
};

Promise.prototype.reduce = function (fn, initialValue) {
    return reduce(this, fn, initialValue, null);
};

Promise.reduce = function (promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
};

function completed(valueOrReason, array) {
    if (this.isFulfilled()) {
        array._resolve(valueOrReason);
    } else {
        array._reject(valueOrReason);
    }
}

function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
}

function gotAccum(accum) {
    this.accum = accum;
    this.array._gotAccum(accum);
    var value = tryConvertToPromise(this.value, this.array._promise);
    if (value instanceof Promise) {
        this.array._currentCancellable = value;
        return value._then(gotValue, undefined, undefined, this, undefined);
    } else {
        return gotValue.call(this, value);
    }
}

function gotValue(value) {
    var array = this.array;
    var promise = array._promise;
    var fn = tryCatch(array._fn);
    promise._pushContext();
    var ret;
    if (array._eachValues !== undefined) {
        ret = fn.call(promise._boundValue(), value, this.index, this.length);
    } else {
        ret = fn.call(promise._boundValue(),
                              this.accum, value, this.index, this.length);
    }
    if (ret instanceof Promise) {
        array._currentCancellable = ret;
    }
    var promiseCreated = promise._popContext();
    debug.checkForgottenReturns(
        ret,
        promiseCreated,
        array._eachValues !== undefined ? "Promise.each" : "Promise.reduce",
        promise
    );
    return ret;
}
};

},{"./util":82}],75:[function(require,module,exports){
(function (process,global){
"use strict";
var util = require("./util");
var schedule;
var noAsyncScheduler = function() {
    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var NativePromise = util.getNativePromise();
if (util.isNode && typeof MutationObserver === "undefined") {
    var GlobalSetImmediate = global.setImmediate;
    var ProcessNextTick = process.nextTick;
    schedule = util.isRecentNode
                ? function(fn) { GlobalSetImmediate.call(global, fn); }
                : function(fn) { ProcessNextTick.call(process, fn); };
} else if (typeof NativePromise === "function" &&
           typeof NativePromise.resolve === "function") {
    var nativePromise = NativePromise.resolve();
    schedule = function(fn) {
        nativePromise.then(fn);
    };
} else if ((typeof MutationObserver !== "undefined") &&
          !(typeof window !== "undefined" &&
            window.navigator &&
            (window.navigator.standalone || window.cordova))) {
    schedule = (function() {
        var div = document.createElement("div");
        var opts = {attributes: true};
        var toggleScheduled = false;
        var div2 = document.createElement("div");
        var o2 = new MutationObserver(function() {
            div.classList.toggle("foo");
            toggleScheduled = false;
        });
        o2.observe(div2, opts);

        var scheduleToggle = function() {
            if (toggleScheduled) return;
                toggleScheduled = true;
                div2.classList.toggle("foo");
            };

            return function schedule(fn) {
            var o = new MutationObserver(function() {
                o.disconnect();
                fn();
            });
            o.observe(div, opts);
            scheduleToggle();
        };
    })();
} else if (typeof setImmediate !== "undefined") {
    schedule = function (fn) {
        setImmediate(fn);
    };
} else if (typeof setTimeout !== "undefined") {
    schedule = function (fn) {
        setTimeout(fn, 0);
    };
} else {
    schedule = noAsyncScheduler;
}
module.exports = schedule;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./util":82,"_process":101}],76:[function(require,module,exports){
"use strict";
module.exports =
    function(Promise, PromiseArray, debug) {
var PromiseInspection = Promise.PromiseInspection;
var util = require("./util");

function SettledPromiseArray(values) {
    this.constructor$(values);
}
util.inherits(SettledPromiseArray, PromiseArray);

SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var ret = new PromiseInspection();
    ret._bitField = 33554432;
    ret._settledValueField = value;
    return this._promiseResolved(index, ret);
};
SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
    var ret = new PromiseInspection();
    ret._bitField = 16777216;
    ret._settledValueField = reason;
    return this._promiseResolved(index, ret);
};

Promise.settle = function (promises) {
    debug.deprecated(".settle()", ".reflect()");
    return new SettledPromiseArray(promises).promise();
};

Promise.prototype.settle = function () {
    return Promise.settle(this);
};
};

},{"./util":82}],77:[function(require,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, apiRejection) {
var util = require("./util");
var RangeError = require("./errors").RangeError;
var AggregateError = require("./errors").AggregateError;
var isArray = util.isArray;
var CANCELLATION = {};


function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
}
util.inherits(SomePromiseArray, PromiseArray);

SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
        return;
    }
    if (this._howMany === 0) {
        this._resolve([]);
        return;
    }
    this._init$(undefined, -5);
    var isArrayResolved = isArray(this._values);
    if (!this._isResolved() &&
        isArrayResolved &&
        this._howMany > this._canPossiblyFulfill()) {
        this._reject(this._getRangeError(this.length()));
    }
};

SomePromiseArray.prototype.init = function () {
    this._initialized = true;
    this._init();
};

SomePromiseArray.prototype.setUnwrap = function () {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function () {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany = function (count) {
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled = function (value) {
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
        this._values.length = this.howMany();
        if (this.howMany() === 1 && this._unwrap) {
            this._resolve(this._values[0]);
        } else {
            this._resolve(this._values);
        }
        return true;
    }
    return false;

};
SomePromiseArray.prototype._promiseRejected = function (reason) {
    this._addRejected(reason);
    return this._checkOutcome();
};

SomePromiseArray.prototype._promiseCancelled = function () {
    if (this._values instanceof Promise || this._values == null) {
        return this._cancel();
    }
    this._addRejected(CANCELLATION);
    return this._checkOutcome();
};

SomePromiseArray.prototype._checkOutcome = function() {
    if (this.howMany() > this._canPossiblyFulfill()) {
        var e = new AggregateError();
        for (var i = this.length(); i < this._values.length; ++i) {
            if (this._values[i] !== CANCELLATION) {
                e.push(this._values[i]);
            }
        }
        if (e.length > 0) {
            this._reject(e);
        } else {
            this._cancel();
        }
        return true;
    }
    return false;
};

SomePromiseArray.prototype._fulfilled = function () {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function () {
    return this._values.length - this.length();
};

SomePromiseArray.prototype._addRejected = function (reason) {
    this._values.push(reason);
};

SomePromiseArray.prototype._addFulfilled = function (value) {
    this._values[this._totalResolved++] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill = function () {
    return this.length() - this._rejected();
};

SomePromiseArray.prototype._getRangeError = function (count) {
    var message = "Input array must contain at least " +
            this._howMany + " items but contains only " + count + " items";
    return new RangeError(message);
};

SomePromiseArray.prototype._resolveEmptyArray = function () {
    this._reject(this._getRangeError(0));
};

function some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
        return apiRejection("expecting a positive integer\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(howMany);
    ret.init();
    return promise;
}

Promise.some = function (promises, howMany) {
    return some(promises, howMany);
};

Promise.prototype.some = function (howMany) {
    return some(this, howMany);
};

Promise._SomePromiseArray = SomePromiseArray;
};

},{"./errors":58,"./util":82}],78:[function(require,module,exports){
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== undefined) {
        promise = promise._target();
        this._bitField = promise._bitField;
        this._settledValueField = promise._isFateSealed()
            ? promise._settledValue() : undefined;
    }
    else {
        this._bitField = 0;
        this._settledValueField = undefined;
    }
}

PromiseInspection.prototype._settledValue = function() {
    return this._settledValueField;
};

var value = PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var reason = PromiseInspection.prototype.error =
PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var isFulfilled = PromiseInspection.prototype.isFulfilled = function() {
    return (this._bitField & 33554432) !== 0;
};

var isRejected = PromiseInspection.prototype.isRejected = function () {
    return (this._bitField & 16777216) !== 0;
};

var isPending = PromiseInspection.prototype.isPending = function () {
    return (this._bitField & 50397184) === 0;
};

var isResolved = PromiseInspection.prototype.isResolved = function () {
    return (this._bitField & 50331648) !== 0;
};

PromiseInspection.prototype.isCancelled = function() {
    return (this._bitField & 8454144) !== 0;
};

Promise.prototype.__isCancelled = function() {
    return (this._bitField & 65536) === 65536;
};

Promise.prototype._isCancelled = function() {
    return this._target().__isCancelled();
};

Promise.prototype.isCancelled = function() {
    return (this._target()._bitField & 8454144) !== 0;
};

Promise.prototype.isPending = function() {
    return isPending.call(this._target());
};

Promise.prototype.isRejected = function() {
    return isRejected.call(this._target());
};

Promise.prototype.isFulfilled = function() {
    return isFulfilled.call(this._target());
};

Promise.prototype.isResolved = function() {
    return isResolved.call(this._target());
};

Promise.prototype.value = function() {
    return value.call(this._target());
};

Promise.prototype.reason = function() {
    var target = this._target();
    target._unsetRejectionIsUnhandled();
    return reason.call(target);
};

Promise.prototype._value = function() {
    return this._settledValue();
};

Promise.prototype._reason = function() {
    this._unsetRejectionIsUnhandled();
    return this._settledValue();
};

Promise.PromiseInspection = PromiseInspection;
};

},{}],79:[function(require,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = require("./util");
var errorObj = util.errorObj;
var isObject = util.isObject;

function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
        if (obj instanceof Promise) return obj;
        var then = getThen(obj);
        if (then === errorObj) {
            if (context) context._pushContext();
            var ret = Promise.reject(then.e);
            if (context) context._popContext();
            return ret;
        } else if (typeof then === "function") {
            if (isAnyBluebirdPromise(obj)) {
                var ret = new Promise(INTERNAL);
                obj._then(
                    ret._fulfill,
                    ret._reject,
                    undefined,
                    ret,
                    null
                );
                return ret;
            }
            return doThenable(obj, then, context);
        }
    }
    return obj;
}

function doGetThen(obj) {
    return obj.then;
}

function getThen(obj) {
    try {
        return doGetThen(obj);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    try {
        return hasProp.call(obj, "_promise0");
    } catch (e) {
        return false;
    }
}

function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    var synchronous = true;
    var result = util.tryCatch(then).call(x, resolve, reject);
    synchronous = false;

    if (promise && result === errorObj) {
        promise._rejectCallback(result.e, true, true);
        promise = null;
    }

    function resolve(value) {
        if (!promise) return;
        promise._resolveCallback(value);
        promise = null;
    }

    function reject(reason) {
        if (!promise) return;
        promise._rejectCallback(reason, synchronous, true);
        promise = null;
    }
    return ret;
}

return tryConvertToPromise;
};

},{"./util":82}],80:[function(require,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, debug) {
var util = require("./util");
var TimeoutError = Promise.TimeoutError;

function HandleWrapper(handle)  {
    this.handle = handle;
}

HandleWrapper.prototype._resultCancelled = function() {
    clearTimeout(this.handle);
};

var afterValue = function(value) { return delay(+this).thenReturn(value); };
var delay = Promise.delay = function (ms, value) {
    var ret;
    var handle;
    if (value !== undefined) {
        ret = Promise.resolve(value)
                ._then(afterValue, null, null, ms, undefined);
        if (debug.cancellation() && value instanceof Promise) {
            ret._setOnCancel(value);
        }
    } else {
        ret = new Promise(INTERNAL);
        handle = setTimeout(function() { ret._fulfill(); }, +ms);
        if (debug.cancellation()) {
            ret._setOnCancel(new HandleWrapper(handle));
        }
        ret._captureStackTrace();
    }
    ret._setAsyncGuaranteed();
    return ret;
};

Promise.prototype.delay = function (ms) {
    return delay(ms, this);
};

var afterTimeout = function (promise, message, parent) {
    var err;
    if (typeof message !== "string") {
        if (message instanceof Error) {
            err = message;
        } else {
            err = new TimeoutError("operation timed out");
        }
    } else {
        err = new TimeoutError(message);
    }
    util.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._reject(err);

    if (parent != null) {
        parent.cancel();
    }
};

function successClear(value) {
    clearTimeout(this.handle);
    return value;
}

function failureClear(reason) {
    clearTimeout(this.handle);
    throw reason;
}

Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    var ret, parent;

    var handleWrapper = new HandleWrapper(setTimeout(function timeoutTimeout() {
        if (ret.isPending()) {
            afterTimeout(ret, message, parent);
        }
    }, ms));

    if (debug.cancellation()) {
        parent = this.then();
        ret = parent._then(successClear, failureClear,
                            undefined, handleWrapper, undefined);
        ret._setOnCancel(handleWrapper);
    } else {
        ret = this._then(successClear, failureClear,
                            undefined, handleWrapper, undefined);
    }

    return ret;
};

};

},{"./util":82}],81:[function(require,module,exports){
"use strict";
module.exports = function (Promise, apiRejection, tryConvertToPromise,
    createContext, INTERNAL, debug) {
    var util = require("./util");
    var TypeError = require("./errors").TypeError;
    var inherits = require("./util").inherits;
    var errorObj = util.errorObj;
    var tryCatch = util.tryCatch;
    var NULL = {};

    function thrower(e) {
        setTimeout(function(){throw e;}, 0);
    }

    function castPreservingDisposable(thenable) {
        var maybePromise = tryConvertToPromise(thenable);
        if (maybePromise !== thenable &&
            typeof thenable._isDisposable === "function" &&
            typeof thenable._getDisposer === "function" &&
            thenable._isDisposable()) {
            maybePromise._setDisposable(thenable._getDisposer());
        }
        return maybePromise;
    }
    function dispose(resources, inspection) {
        var i = 0;
        var len = resources.length;
        var ret = new Promise(INTERNAL);
        function iterator() {
            if (i >= len) return ret._fulfill();
            var maybePromise = castPreservingDisposable(resources[i++]);
            if (maybePromise instanceof Promise &&
                maybePromise._isDisposable()) {
                try {
                    maybePromise = tryConvertToPromise(
                        maybePromise._getDisposer().tryDispose(inspection),
                        resources.promise);
                } catch (e) {
                    return thrower(e);
                }
                if (maybePromise instanceof Promise) {
                    return maybePromise._then(iterator, thrower,
                                              null, null, null);
                }
            }
            iterator();
        }
        iterator();
        return ret;
    }

    function Disposer(data, promise, context) {
        this._data = data;
        this._promise = promise;
        this._context = context;
    }

    Disposer.prototype.data = function () {
        return this._data;
    };

    Disposer.prototype.promise = function () {
        return this._promise;
    };

    Disposer.prototype.resource = function () {
        if (this.promise().isFulfilled()) {
            return this.promise().value();
        }
        return NULL;
    };

    Disposer.prototype.tryDispose = function(inspection) {
        var resource = this.resource();
        var context = this._context;
        if (context !== undefined) context._pushContext();
        var ret = resource !== NULL
            ? this.doDispose(resource, inspection) : null;
        if (context !== undefined) context._popContext();
        this._promise._unsetDisposable();
        this._data = null;
        return ret;
    };

    Disposer.isDisposer = function (d) {
        return (d != null &&
                typeof d.resource === "function" &&
                typeof d.tryDispose === "function");
    };

    function FunctionDisposer(fn, promise, context) {
        this.constructor$(fn, promise, context);
    }
    inherits(FunctionDisposer, Disposer);

    FunctionDisposer.prototype.doDispose = function (resource, inspection) {
        var fn = this.data();
        return fn.call(resource, resource, inspection);
    };

    function maybeUnwrapDisposer(value) {
        if (Disposer.isDisposer(value)) {
            this.resources[this.index]._setDisposable(value);
            return value.promise();
        }
        return value;
    }

    function ResourceList(length) {
        this.length = length;
        this.promise = null;
        this[length-1] = null;
    }

    ResourceList.prototype._resultCancelled = function() {
        var len = this.length;
        for (var i = 0; i < len; ++i) {
            var item = this[i];
            if (item instanceof Promise) {
                item.cancel();
            }
        }
    };

    Promise.using = function () {
        var len = arguments.length;
        if (len < 2) return apiRejection(
                        "you must pass at least 2 arguments to Promise.using");
        var fn = arguments[len - 1];
        if (typeof fn !== "function") {
            return apiRejection("expecting a function but got " + util.classString(fn));
        }
        var input;
        var spreadArgs = true;
        if (len === 2 && Array.isArray(arguments[0])) {
            input = arguments[0];
            len = input.length;
            spreadArgs = false;
        } else {
            input = arguments;
            len--;
        }
        var resources = new ResourceList(len);
        for (var i = 0; i < len; ++i) {
            var resource = input[i];
            if (Disposer.isDisposer(resource)) {
                var disposer = resource;
                resource = resource.promise();
                resource._setDisposable(disposer);
            } else {
                var maybePromise = tryConvertToPromise(resource);
                if (maybePromise instanceof Promise) {
                    resource =
                        maybePromise._then(maybeUnwrapDisposer, null, null, {
                            resources: resources,
                            index: i
                    }, undefined);
                }
            }
            resources[i] = resource;
        }

        var reflectedResources = new Array(resources.length);
        for (var i = 0; i < reflectedResources.length; ++i) {
            reflectedResources[i] = Promise.resolve(resources[i]).reflect();
        }

        var resultPromise = Promise.all(reflectedResources)
            .then(function(inspections) {
                for (var i = 0; i < inspections.length; ++i) {
                    var inspection = inspections[i];
                    if (inspection.isRejected()) {
                        errorObj.e = inspection.error();
                        return errorObj;
                    } else if (!inspection.isFulfilled()) {
                        resultPromise.cancel();
                        return;
                    }
                    inspections[i] = inspection.value();
                }
                promise._pushContext();

                fn = tryCatch(fn);
                var ret = spreadArgs
                    ? fn.apply(undefined, inspections) : fn(inspections);
                var promiseCreated = promise._popContext();
                debug.checkForgottenReturns(
                    ret, promiseCreated, "Promise.using", promise);
                return ret;
            });

        var promise = resultPromise.lastly(function() {
            var inspection = new Promise.PromiseInspection(resultPromise);
            return dispose(resources, inspection);
        });
        resources.promise = promise;
        promise._setOnCancel(resources);
        return promise;
    };

    Promise.prototype._setDisposable = function (disposer) {
        this._bitField = this._bitField | 131072;
        this._disposer = disposer;
    };

    Promise.prototype._isDisposable = function () {
        return (this._bitField & 131072) > 0;
    };

    Promise.prototype._getDisposer = function () {
        return this._disposer;
    };

    Promise.prototype._unsetDisposable = function () {
        this._bitField = this._bitField & (~131072);
        this._disposer = undefined;
    };

    Promise.prototype.disposer = function (fn) {
        if (typeof fn === "function") {
            return new FunctionDisposer(fn, this, createContext());
        }
        throw new TypeError();
    };

};

},{"./errors":58,"./util":82}],82:[function(require,module,exports){
(function (process,global){
"use strict";
var es5 = require("./es5");
var canEvaluate = typeof navigator == "undefined";

var errorObj = {e: {}};
var tryCatchTarget;
var globalObject = typeof self !== "undefined" ? self :
    typeof window !== "undefined" ? window :
    typeof global !== "undefined" ? global :
    this !== undefined ? this : null;

function tryCatcher() {
    try {
        var target = tryCatchTarget;
        tryCatchTarget = null;
        return target.apply(this, arguments);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};


function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return typeof value === "function" ||
           typeof value === "object" && value !== null;
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);

        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    var excludedPrototypes = [
        Array.prototype,
        Object.prototype,
        Function.prototype
    ];

    var isExcludedProto = function(val) {
        for (var i = 0; i < excludedPrototypes.length; ++i) {
            if (excludedPrototypes[i] === val) {
                return true;
            }
        }
        return false;
    };

    if (es5.isES5) {
        var getKeys = Object.getOwnPropertyNames;
        return function(obj) {
            var ret = [];
            var visitedKeys = Object.create(null);
            while (obj != null && !isExcludedProto(obj)) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        var hasProp = {}.hasOwnProperty;
        return function(obj) {
            if (isExcludedProto(obj)) return [];
            var ret = [];

            /*jshint forin:false */
            enumeration: for (var key in obj) {
                if (hasProp.call(obj, key)) {
                    ret.push(key);
                } else {
                    for (var i = 0; i < excludedPrototypes.length; ++i) {
                        if (hasProp.call(excludedPrototypes[i], key)) {
                            continue enumeration;
                        }
                    }
                    ret.push(key);
                }
            }
            return ret;
        };
    }

})();

var thisAssignmentPattern = /this\s*\.\s*\S+\s*=/;
function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.names(fn.prototype);

            var hasMethods = es5.isES5 && keys.length > 1;
            var hasMethodsOtherThanConstructor = keys.length > 0 &&
                !(keys.length === 1 && keys[0] === "constructor");
            var hasThisAssignmentAndStaticMethods =
                thisAssignmentPattern.test(fn + "") && es5.names(fn).length > 0;

            if (hasMethods || hasMethodsOtherThanConstructor ||
                hasThisAssignmentAndStaticMethods) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027,-W055,-W031*/
    function FakeConstructor() {}
    FakeConstructor.prototype = obj;
    var l = 8;
    while (l--) new FakeConstructor();
    return obj;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

function safeToString(obj) {
    try {
        return obj + "";
    } catch (e) {
        return "[no string representation]";
    }
}

function isError(obj) {
    return obj !== null &&
           typeof obj === "object" &&
           typeof obj.message === "string" &&
           typeof obj.name === "string";
}

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
        e["isOperational"] === true);
}

function canAttachTrace(obj) {
    return isError(obj) && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = (function() {
    if (!("stack" in new Error())) {
        return function(value) {
            if (canAttachTrace(value)) return value;
            try {throw new Error(safeToString(value));}
            catch(err) {return err;}
        };
    } else {
        return function(value) {
            if (canAttachTrace(value)) return value;
            return new Error(safeToString(value));
        };
    }
})();

function classString(obj) {
    return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
    var keys = es5.names(from);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (filter(key)) {
            try {
                es5.defineProperty(to, key, es5.getDescriptor(from, key));
            } catch (ignore) {}
        }
    }
}

var asArray = function(v) {
    if (es5.isArray(v)) {
        return v;
    }
    return null;
};

if (typeof Symbol !== "undefined" && Symbol.iterator) {
    var ArrayFrom = typeof Array.from === "function" ? function(v) {
        return Array.from(v);
    } : function(v) {
        var ret = [];
        var it = v[Symbol.iterator]();
        var itResult;
        while (!((itResult = it.next()).done)) {
            ret.push(itResult.value);
        }
        return ret;
    };

    asArray = function(v) {
        if (es5.isArray(v)) {
            return v;
        } else if (v != null && typeof v[Symbol.iterator] === "function") {
            return ArrayFrom(v);
        }
        return null;
    };
}

var isNode = typeof process !== "undefined" &&
        classString(process).toLowerCase() === "[object process]";

var hasEnvVariables = typeof process !== "undefined" &&
    typeof process.env !== "undefined";

function env(key) {
    return hasEnvVariables ? process.env[key] : undefined;
}

function getNativePromise() {
    if (typeof Promise === "function") {
        try {
            var promise = new Promise(function(){});
            if ({}.toString.call(promise) === "[object Promise]") {
                return Promise;
            }
        } catch (e) {}
    }
}

function domainBind(self, cb) {
    return self.bind(cb);
}

var ret = {
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    asArray: asArray,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    isError: isError,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch: tryCatch,
    inherits: inherits,
    withAppended: withAppended,
    maybeWrapAsError: maybeWrapAsError,
    toFastProperties: toFastProperties,
    filledRange: filledRange,
    toString: safeToString,
    canAttachTrace: canAttachTrace,
    ensureErrorObject: ensureErrorObject,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    classString: classString,
    copyDescriptors: copyDescriptors,
    hasDevTools: typeof chrome !== "undefined" && chrome &&
                 typeof chrome.loadTimes === "function",
    isNode: isNode,
    hasEnvVariables: hasEnvVariables,
    env: env,
    global: globalObject,
    getNativePromise: getNativePromise,
    domainBind: domainBind
};
ret.isRecentNode = ret.isNode && (function() {
    var version = process.versions.node.split(".").map(Number);
    return (version[0] === 0 && version[1] > 10) || (version[0] > 0);
})();

if (ret.isNode) ret.toFastProperties(process);

try {throw new Error(); } catch (e) {ret.lastLineError = e;}
module.exports = ret;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./es5":59,"_process":101}],83:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":47,"ieee754":86,"isarray":87}],84:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dingbats = [
    { "Typeface name": "Symbol", "Dingbat dec": "32", "Dingbat hex": "20", "Unicode dec": "32", "Unicode hex": "20" },
    { "Typeface name": "Symbol", "Dingbat dec": "33", "Dingbat hex": "21", "Unicode dec": "33", "Unicode hex": "21" },
    { "Typeface name": "Symbol", "Dingbat dec": "34", "Dingbat hex": "22", "Unicode dec": "8704", "Unicode hex": "2200" },
    { "Typeface name": "Symbol", "Dingbat dec": "35", "Dingbat hex": "23", "Unicode dec": "35", "Unicode hex": "23" },
    { "Typeface name": "Symbol", "Dingbat dec": "36", "Dingbat hex": "24", "Unicode dec": "8707", "Unicode hex": "2203" },
    { "Typeface name": "Symbol", "Dingbat dec": "37", "Dingbat hex": "25", "Unicode dec": "37", "Unicode hex": "25" },
    { "Typeface name": "Symbol", "Dingbat dec": "38", "Dingbat hex": "26", "Unicode dec": "38", "Unicode hex": "26" },
    { "Typeface name": "Symbol", "Dingbat dec": "39", "Dingbat hex": "27", "Unicode dec": "8717", "Unicode hex": "220D" },
    { "Typeface name": "Symbol", "Dingbat dec": "40", "Dingbat hex": "28", "Unicode dec": "40", "Unicode hex": "28" },
    { "Typeface name": "Symbol", "Dingbat dec": "41", "Dingbat hex": "29", "Unicode dec": "41", "Unicode hex": "29" },
    { "Typeface name": "Symbol", "Dingbat dec": "42", "Dingbat hex": "2A", "Unicode dec": "42", "Unicode hex": "2A" },
    { "Typeface name": "Symbol", "Dingbat dec": "43", "Dingbat hex": "2B", "Unicode dec": "43", "Unicode hex": "2B" },
    { "Typeface name": "Symbol", "Dingbat dec": "44", "Dingbat hex": "2C", "Unicode dec": "44", "Unicode hex": "2C" },
    { "Typeface name": "Symbol", "Dingbat dec": "45", "Dingbat hex": "2D", "Unicode dec": "8722", "Unicode hex": "2212" },
    { "Typeface name": "Symbol", "Dingbat dec": "46", "Dingbat hex": "2E", "Unicode dec": "46", "Unicode hex": "2E" },
    { "Typeface name": "Symbol", "Dingbat dec": "47", "Dingbat hex": "2F", "Unicode dec": "47", "Unicode hex": "2F" },
    { "Typeface name": "Symbol", "Dingbat dec": "48", "Dingbat hex": "30", "Unicode dec": "48", "Unicode hex": "30" },
    { "Typeface name": "Symbol", "Dingbat dec": "49", "Dingbat hex": "31", "Unicode dec": "49", "Unicode hex": "31" },
    { "Typeface name": "Symbol", "Dingbat dec": "50", "Dingbat hex": "32", "Unicode dec": "50", "Unicode hex": "32" },
    { "Typeface name": "Symbol", "Dingbat dec": "51", "Dingbat hex": "33", "Unicode dec": "51", "Unicode hex": "33" },
    { "Typeface name": "Symbol", "Dingbat dec": "52", "Dingbat hex": "34", "Unicode dec": "52", "Unicode hex": "34" },
    { "Typeface name": "Symbol", "Dingbat dec": "53", "Dingbat hex": "35", "Unicode dec": "53", "Unicode hex": "35" },
    { "Typeface name": "Symbol", "Dingbat dec": "54", "Dingbat hex": "36", "Unicode dec": "54", "Unicode hex": "36" },
    { "Typeface name": "Symbol", "Dingbat dec": "55", "Dingbat hex": "37", "Unicode dec": "55", "Unicode hex": "37" },
    { "Typeface name": "Symbol", "Dingbat dec": "56", "Dingbat hex": "38", "Unicode dec": "56", "Unicode hex": "38" },
    { "Typeface name": "Symbol", "Dingbat dec": "57", "Dingbat hex": "39", "Unicode dec": "57", "Unicode hex": "39" },
    { "Typeface name": "Symbol", "Dingbat dec": "58", "Dingbat hex": "3A", "Unicode dec": "58", "Unicode hex": "3A" },
    { "Typeface name": "Symbol", "Dingbat dec": "59", "Dingbat hex": "3B", "Unicode dec": "59", "Unicode hex": "3B" },
    { "Typeface name": "Symbol", "Dingbat dec": "60", "Dingbat hex": "3C", "Unicode dec": "60", "Unicode hex": "3C" },
    { "Typeface name": "Symbol", "Dingbat dec": "61", "Dingbat hex": "3D", "Unicode dec": "61", "Unicode hex": "3D" },
    { "Typeface name": "Symbol", "Dingbat dec": "62", "Dingbat hex": "3E", "Unicode dec": "62", "Unicode hex": "3E" },
    { "Typeface name": "Symbol", "Dingbat dec": "63", "Dingbat hex": "3F", "Unicode dec": "63", "Unicode hex": "3F" },
    { "Typeface name": "Symbol", "Dingbat dec": "64", "Dingbat hex": "40", "Unicode dec": "8773", "Unicode hex": "2245" },
    { "Typeface name": "Symbol", "Dingbat dec": "65", "Dingbat hex": "41", "Unicode dec": "913", "Unicode hex": "391" },
    { "Typeface name": "Symbol", "Dingbat dec": "66", "Dingbat hex": "42", "Unicode dec": "914", "Unicode hex": "392" },
    { "Typeface name": "Symbol", "Dingbat dec": "67", "Dingbat hex": "43", "Unicode dec": "935", "Unicode hex": "3A7" },
    { "Typeface name": "Symbol", "Dingbat dec": "68", "Dingbat hex": "44", "Unicode dec": "916", "Unicode hex": "394" },
    { "Typeface name": "Symbol", "Dingbat dec": "69", "Dingbat hex": "45", "Unicode dec": "917", "Unicode hex": "395" },
    { "Typeface name": "Symbol", "Dingbat dec": "70", "Dingbat hex": "46", "Unicode dec": "934", "Unicode hex": "3A6" },
    { "Typeface name": "Symbol", "Dingbat dec": "71", "Dingbat hex": "47", "Unicode dec": "915", "Unicode hex": "393" },
    { "Typeface name": "Symbol", "Dingbat dec": "72", "Dingbat hex": "48", "Unicode dec": "919", "Unicode hex": "397" },
    { "Typeface name": "Symbol", "Dingbat dec": "73", "Dingbat hex": "49", "Unicode dec": "921", "Unicode hex": "399" },
    { "Typeface name": "Symbol", "Dingbat dec": "74", "Dingbat hex": "4A", "Unicode dec": "977", "Unicode hex": "3D1" },
    { "Typeface name": "Symbol", "Dingbat dec": "75", "Dingbat hex": "4B", "Unicode dec": "922", "Unicode hex": "39A" },
    { "Typeface name": "Symbol", "Dingbat dec": "76", "Dingbat hex": "4C", "Unicode dec": "923", "Unicode hex": "39B" },
    { "Typeface name": "Symbol", "Dingbat dec": "77", "Dingbat hex": "4D", "Unicode dec": "924", "Unicode hex": "39C" },
    { "Typeface name": "Symbol", "Dingbat dec": "78", "Dingbat hex": "4E", "Unicode dec": "925", "Unicode hex": "39D" },
    { "Typeface name": "Symbol", "Dingbat dec": "79", "Dingbat hex": "4F", "Unicode dec": "927", "Unicode hex": "39F" },
    { "Typeface name": "Symbol", "Dingbat dec": "80", "Dingbat hex": "50", "Unicode dec": "928", "Unicode hex": "3A0" },
    { "Typeface name": "Symbol", "Dingbat dec": "81", "Dingbat hex": "51", "Unicode dec": "920", "Unicode hex": "398" },
    { "Typeface name": "Symbol", "Dingbat dec": "82", "Dingbat hex": "52", "Unicode dec": "929", "Unicode hex": "3A1" },
    { "Typeface name": "Symbol", "Dingbat dec": "83", "Dingbat hex": "53", "Unicode dec": "931", "Unicode hex": "3A3" },
    { "Typeface name": "Symbol", "Dingbat dec": "84", "Dingbat hex": "54", "Unicode dec": "932", "Unicode hex": "3A4" },
    { "Typeface name": "Symbol", "Dingbat dec": "85", "Dingbat hex": "55", "Unicode dec": "933", "Unicode hex": "3A5" },
    { "Typeface name": "Symbol", "Dingbat dec": "86", "Dingbat hex": "56", "Unicode dec": "962", "Unicode hex": "3C2" },
    { "Typeface name": "Symbol", "Dingbat dec": "87", "Dingbat hex": "57", "Unicode dec": "937", "Unicode hex": "3A9" },
    { "Typeface name": "Symbol", "Dingbat dec": "88", "Dingbat hex": "58", "Unicode dec": "926", "Unicode hex": "39E" },
    { "Typeface name": "Symbol", "Dingbat dec": "89", "Dingbat hex": "59", "Unicode dec": "936", "Unicode hex": "3A8" },
    { "Typeface name": "Symbol", "Dingbat dec": "90", "Dingbat hex": "5A", "Unicode dec": "918", "Unicode hex": "396" },
    { "Typeface name": "Symbol", "Dingbat dec": "91", "Dingbat hex": "5B", "Unicode dec": "91", "Unicode hex": "5B" },
    { "Typeface name": "Symbol", "Dingbat dec": "92", "Dingbat hex": "5C", "Unicode dec": "8756", "Unicode hex": "2234" },
    { "Typeface name": "Symbol", "Dingbat dec": "93", "Dingbat hex": "5D", "Unicode dec": "93", "Unicode hex": "5D" },
    { "Typeface name": "Symbol", "Dingbat dec": "94", "Dingbat hex": "5E", "Unicode dec": "8869", "Unicode hex": "22A5" },
    { "Typeface name": "Symbol", "Dingbat dec": "95", "Dingbat hex": "5F", "Unicode dec": "95", "Unicode hex": "5F" },
    { "Typeface name": "Symbol", "Dingbat dec": "96", "Dingbat hex": "60", "Unicode dec": "8254", "Unicode hex": "203E" },
    { "Typeface name": "Symbol", "Dingbat dec": "97", "Dingbat hex": "61", "Unicode dec": "945", "Unicode hex": "3B1" },
    { "Typeface name": "Symbol", "Dingbat dec": "98", "Dingbat hex": "62", "Unicode dec": "946", "Unicode hex": "3B2" },
    { "Typeface name": "Symbol", "Dingbat dec": "99", "Dingbat hex": "63", "Unicode dec": "967", "Unicode hex": "3C7" },
    { "Typeface name": "Symbol", "Dingbat dec": "100", "Dingbat hex": "64", "Unicode dec": "948", "Unicode hex": "3B4" },
    { "Typeface name": "Symbol", "Dingbat dec": "101", "Dingbat hex": "65", "Unicode dec": "949", "Unicode hex": "3B5" },
    { "Typeface name": "Symbol", "Dingbat dec": "102", "Dingbat hex": "66", "Unicode dec": "966", "Unicode hex": "3C6" },
    { "Typeface name": "Symbol", "Dingbat dec": "103", "Dingbat hex": "67", "Unicode dec": "947", "Unicode hex": "3B3" },
    { "Typeface name": "Symbol", "Dingbat dec": "104", "Dingbat hex": "68", "Unicode dec": "951", "Unicode hex": "3B7" },
    { "Typeface name": "Symbol", "Dingbat dec": "105", "Dingbat hex": "69", "Unicode dec": "953", "Unicode hex": "3B9" },
    { "Typeface name": "Symbol", "Dingbat dec": "106", "Dingbat hex": "6A", "Unicode dec": "981", "Unicode hex": "3D5" },
    { "Typeface name": "Symbol", "Dingbat dec": "107", "Dingbat hex": "6B", "Unicode dec": "954", "Unicode hex": "3BA" },
    { "Typeface name": "Symbol", "Dingbat dec": "108", "Dingbat hex": "6C", "Unicode dec": "955", "Unicode hex": "3BB" },
    { "Typeface name": "Symbol", "Dingbat dec": "109", "Dingbat hex": "6D", "Unicode dec": "956", "Unicode hex": "3BC" },
    { "Typeface name": "Symbol", "Dingbat dec": "110", "Dingbat hex": "6E", "Unicode dec": "957", "Unicode hex": "3BD" },
    { "Typeface name": "Symbol", "Dingbat dec": "111", "Dingbat hex": "6F", "Unicode dec": "959", "Unicode hex": "3BF" },
    { "Typeface name": "Symbol", "Dingbat dec": "112", "Dingbat hex": "70", "Unicode dec": "960", "Unicode hex": "3C0" },
    { "Typeface name": "Symbol", "Dingbat dec": "113", "Dingbat hex": "71", "Unicode dec": "952", "Unicode hex": "3B8" },
    { "Typeface name": "Symbol", "Dingbat dec": "114", "Dingbat hex": "72", "Unicode dec": "961", "Unicode hex": "3C1" },
    { "Typeface name": "Symbol", "Dingbat dec": "115", "Dingbat hex": "73", "Unicode dec": "963", "Unicode hex": "3C3" },
    { "Typeface name": "Symbol", "Dingbat dec": "116", "Dingbat hex": "74", "Unicode dec": "964", "Unicode hex": "3C4" },
    { "Typeface name": "Symbol", "Dingbat dec": "117", "Dingbat hex": "75", "Unicode dec": "965", "Unicode hex": "3C5" },
    { "Typeface name": "Symbol", "Dingbat dec": "118", "Dingbat hex": "76", "Unicode dec": "982", "Unicode hex": "3D6" },
    { "Typeface name": "Symbol", "Dingbat dec": "119", "Dingbat hex": "77", "Unicode dec": "969", "Unicode hex": "3C9" },
    { "Typeface name": "Symbol", "Dingbat dec": "120", "Dingbat hex": "78", "Unicode dec": "958", "Unicode hex": "3BE" },
    { "Typeface name": "Symbol", "Dingbat dec": "121", "Dingbat hex": "79", "Unicode dec": "968", "Unicode hex": "3C8" },
    { "Typeface name": "Symbol", "Dingbat dec": "122", "Dingbat hex": "7A", "Unicode dec": "950", "Unicode hex": "3B6" },
    { "Typeface name": "Symbol", "Dingbat dec": "123", "Dingbat hex": "7B", "Unicode dec": "123", "Unicode hex": "7B" },
    { "Typeface name": "Symbol", "Dingbat dec": "124", "Dingbat hex": "7C", "Unicode dec": "124", "Unicode hex": "7C" },
    { "Typeface name": "Symbol", "Dingbat dec": "125", "Dingbat hex": "7D", "Unicode dec": "125", "Unicode hex": "7D" },
    { "Typeface name": "Symbol", "Dingbat dec": "126", "Dingbat hex": "7E", "Unicode dec": "126", "Unicode hex": "7E" },
    { "Typeface name": "Symbol", "Dingbat dec": "160", "Dingbat hex": "A0", "Unicode dec": "8364", "Unicode hex": "20AC" },
    { "Typeface name": "Symbol", "Dingbat dec": "161", "Dingbat hex": "A1", "Unicode dec": "978", "Unicode hex": "3D2" },
    { "Typeface name": "Symbol", "Dingbat dec": "162", "Dingbat hex": "A2", "Unicode dec": "8242", "Unicode hex": "2032" },
    { "Typeface name": "Symbol", "Dingbat dec": "163", "Dingbat hex": "A3", "Unicode dec": "8804", "Unicode hex": "2264" },
    { "Typeface name": "Symbol", "Dingbat dec": "164", "Dingbat hex": "A4", "Unicode dec": "8260", "Unicode hex": "2044" },
    { "Typeface name": "Symbol", "Dingbat dec": "165", "Dingbat hex": "A5", "Unicode dec": "8734", "Unicode hex": "221E" },
    { "Typeface name": "Symbol", "Dingbat dec": "166", "Dingbat hex": "A6", "Unicode dec": "402", "Unicode hex": "192" },
    { "Typeface name": "Symbol", "Dingbat dec": "167", "Dingbat hex": "A7", "Unicode dec": "9827", "Unicode hex": "2663" },
    { "Typeface name": "Symbol", "Dingbat dec": "168", "Dingbat hex": "A8", "Unicode dec": "9830", "Unicode hex": "2666" },
    { "Typeface name": "Symbol", "Dingbat dec": "169", "Dingbat hex": "A9", "Unicode dec": "9829", "Unicode hex": "2665" },
    { "Typeface name": "Symbol", "Dingbat dec": "170", "Dingbat hex": "AA", "Unicode dec": "9824", "Unicode hex": "2660" },
    { "Typeface name": "Symbol", "Dingbat dec": "171", "Dingbat hex": "AB", "Unicode dec": "8596", "Unicode hex": "2194" },
    { "Typeface name": "Symbol", "Dingbat dec": "172", "Dingbat hex": "AC", "Unicode dec": "8592", "Unicode hex": "2190" },
    { "Typeface name": "Symbol", "Dingbat dec": "173", "Dingbat hex": "AD", "Unicode dec": "8593", "Unicode hex": "2191" },
    { "Typeface name": "Symbol", "Dingbat dec": "174", "Dingbat hex": "AE", "Unicode dec": "8594", "Unicode hex": "2192" },
    { "Typeface name": "Symbol", "Dingbat dec": "175", "Dingbat hex": "AF", "Unicode dec": "8595", "Unicode hex": "2193" },
    { "Typeface name": "Symbol", "Dingbat dec": "176", "Dingbat hex": "B0", "Unicode dec": "176", "Unicode hex": "B0" },
    { "Typeface name": "Symbol", "Dingbat dec": "177", "Dingbat hex": "B1", "Unicode dec": "177", "Unicode hex": "B1" },
    { "Typeface name": "Symbol", "Dingbat dec": "178", "Dingbat hex": "B2", "Unicode dec": "8243", "Unicode hex": "2033" },
    { "Typeface name": "Symbol", "Dingbat dec": "179", "Dingbat hex": "B3", "Unicode dec": "8805", "Unicode hex": "2265" },
    { "Typeface name": "Symbol", "Dingbat dec": "180", "Dingbat hex": "B4", "Unicode dec": "215", "Unicode hex": "D7" },
    { "Typeface name": "Symbol", "Dingbat dec": "181", "Dingbat hex": "B5", "Unicode dec": "8733", "Unicode hex": "221D" },
    { "Typeface name": "Symbol", "Dingbat dec": "182", "Dingbat hex": "B6", "Unicode dec": "8706", "Unicode hex": "2202" },
    { "Typeface name": "Symbol", "Dingbat dec": "183", "Dingbat hex": "B7", "Unicode dec": "8226", "Unicode hex": "2022" },
    { "Typeface name": "Symbol", "Dingbat dec": "184", "Dingbat hex": "B8", "Unicode dec": "247", "Unicode hex": "F7" },
    { "Typeface name": "Symbol", "Dingbat dec": "185", "Dingbat hex": "B9", "Unicode dec": "8800", "Unicode hex": "2260" },
    { "Typeface name": "Symbol", "Dingbat dec": "186", "Dingbat hex": "BA", "Unicode dec": "8801", "Unicode hex": "2261" },
    { "Typeface name": "Symbol", "Dingbat dec": "187", "Dingbat hex": "BB", "Unicode dec": "8776", "Unicode hex": "2248" },
    { "Typeface name": "Symbol", "Dingbat dec": "188", "Dingbat hex": "BC", "Unicode dec": "8230", "Unicode hex": "2026" },
    { "Typeface name": "Symbol", "Dingbat dec": "189", "Dingbat hex": "BD", "Unicode dec": "9168", "Unicode hex": "23D0" },
    { "Typeface name": "Symbol", "Dingbat dec": "190", "Dingbat hex": "BE", "Unicode dec": "9135", "Unicode hex": "23AF" },
    { "Typeface name": "Symbol", "Dingbat dec": "191", "Dingbat hex": "BF", "Unicode dec": "8629", "Unicode hex": "21B5" },
    { "Typeface name": "Symbol", "Dingbat dec": "192", "Dingbat hex": "C0", "Unicode dec": "8501", "Unicode hex": "2135" },
    { "Typeface name": "Symbol", "Dingbat dec": "193", "Dingbat hex": "C1", "Unicode dec": "8465", "Unicode hex": "2111" },
    { "Typeface name": "Symbol", "Dingbat dec": "194", "Dingbat hex": "C2", "Unicode dec": "8476", "Unicode hex": "211C" },
    { "Typeface name": "Symbol", "Dingbat dec": "195", "Dingbat hex": "C3", "Unicode dec": "8472", "Unicode hex": "2118" },
    { "Typeface name": "Symbol", "Dingbat dec": "196", "Dingbat hex": "C4", "Unicode dec": "8855", "Unicode hex": "2297" },
    { "Typeface name": "Symbol", "Dingbat dec": "197", "Dingbat hex": "C5", "Unicode dec": "8853", "Unicode hex": "2295" },
    { "Typeface name": "Symbol", "Dingbat dec": "198", "Dingbat hex": "C6", "Unicode dec": "8709", "Unicode hex": "2205" },
    { "Typeface name": "Symbol", "Dingbat dec": "199", "Dingbat hex": "C7", "Unicode dec": "8745", "Unicode hex": "2229" },
    { "Typeface name": "Symbol", "Dingbat dec": "200", "Dingbat hex": "C8", "Unicode dec": "8746", "Unicode hex": "222A" },
    { "Typeface name": "Symbol", "Dingbat dec": "201", "Dingbat hex": "C9", "Unicode dec": "8835", "Unicode hex": "2283" },
    { "Typeface name": "Symbol", "Dingbat dec": "202", "Dingbat hex": "CA", "Unicode dec": "8839", "Unicode hex": "2287" },
    { "Typeface name": "Symbol", "Dingbat dec": "203", "Dingbat hex": "CB", "Unicode dec": "8836", "Unicode hex": "2284" },
    { "Typeface name": "Symbol", "Dingbat dec": "204", "Dingbat hex": "CC", "Unicode dec": "8834", "Unicode hex": "2282" },
    { "Typeface name": "Symbol", "Dingbat dec": "205", "Dingbat hex": "CD", "Unicode dec": "8838", "Unicode hex": "2286" },
    { "Typeface name": "Symbol", "Dingbat dec": "206", "Dingbat hex": "CE", "Unicode dec": "8712", "Unicode hex": "2208" },
    { "Typeface name": "Symbol", "Dingbat dec": "207", "Dingbat hex": "CF", "Unicode dec": "8713", "Unicode hex": "2209" },
    { "Typeface name": "Symbol", "Dingbat dec": "208", "Dingbat hex": "D0", "Unicode dec": "8736", "Unicode hex": "2220" },
    { "Typeface name": "Symbol", "Dingbat dec": "209", "Dingbat hex": "D1", "Unicode dec": "8711", "Unicode hex": "2207" },
    { "Typeface name": "Symbol", "Dingbat dec": "210", "Dingbat hex": "D2", "Unicode dec": "174", "Unicode hex": "AE" },
    { "Typeface name": "Symbol", "Dingbat dec": "211", "Dingbat hex": "D3", "Unicode dec": "169", "Unicode hex": "A9" },
    { "Typeface name": "Symbol", "Dingbat dec": "212", "Dingbat hex": "D4", "Unicode dec": "8482", "Unicode hex": "2122" },
    { "Typeface name": "Symbol", "Dingbat dec": "213", "Dingbat hex": "D5", "Unicode dec": "8719", "Unicode hex": "220F" },
    { "Typeface name": "Symbol", "Dingbat dec": "214", "Dingbat hex": "D6", "Unicode dec": "8730", "Unicode hex": "221A" },
    { "Typeface name": "Symbol", "Dingbat dec": "215", "Dingbat hex": "D7", "Unicode dec": "8901", "Unicode hex": "22C5" },
    { "Typeface name": "Symbol", "Dingbat dec": "216", "Dingbat hex": "D8", "Unicode dec": "172", "Unicode hex": "AC" },
    { "Typeface name": "Symbol", "Dingbat dec": "217", "Dingbat hex": "D9", "Unicode dec": "8743", "Unicode hex": "2227" },
    { "Typeface name": "Symbol", "Dingbat dec": "218", "Dingbat hex": "DA", "Unicode dec": "8744", "Unicode hex": "2228" },
    { "Typeface name": "Symbol", "Dingbat dec": "219", "Dingbat hex": "DB", "Unicode dec": "8660", "Unicode hex": "21D4" },
    { "Typeface name": "Symbol", "Dingbat dec": "220", "Dingbat hex": "DC", "Unicode dec": "8656", "Unicode hex": "21D0" },
    { "Typeface name": "Symbol", "Dingbat dec": "221", "Dingbat hex": "DD", "Unicode dec": "8657", "Unicode hex": "21D1" },
    { "Typeface name": "Symbol", "Dingbat dec": "222", "Dingbat hex": "DE", "Unicode dec": "8658", "Unicode hex": "21D2" },
    { "Typeface name": "Symbol", "Dingbat dec": "223", "Dingbat hex": "DF", "Unicode dec": "8659", "Unicode hex": "21D3" },
    { "Typeface name": "Symbol", "Dingbat dec": "224", "Dingbat hex": "E0", "Unicode dec": "9674", "Unicode hex": "25CA" },
    { "Typeface name": "Symbol", "Dingbat dec": "225", "Dingbat hex": "E1", "Unicode dec": "12296", "Unicode hex": "3008" },
    { "Typeface name": "Symbol", "Dingbat dec": "226", "Dingbat hex": "E2", "Unicode dec": "174", "Unicode hex": "AE" },
    { "Typeface name": "Symbol", "Dingbat dec": "227", "Dingbat hex": "E3", "Unicode dec": "169", "Unicode hex": "A9" },
    { "Typeface name": "Symbol", "Dingbat dec": "228", "Dingbat hex": "E4", "Unicode dec": "8482", "Unicode hex": "2122" },
    { "Typeface name": "Symbol", "Dingbat dec": "229", "Dingbat hex": "E5", "Unicode dec": "8721", "Unicode hex": "2211" },
    { "Typeface name": "Symbol", "Dingbat dec": "230", "Dingbat hex": "E6", "Unicode dec": "9115", "Unicode hex": "239B" },
    { "Typeface name": "Symbol", "Dingbat dec": "231", "Dingbat hex": "E7", "Unicode dec": "9116", "Unicode hex": "239C" },
    { "Typeface name": "Symbol", "Dingbat dec": "232", "Dingbat hex": "E8", "Unicode dec": "9117", "Unicode hex": "239D" },
    { "Typeface name": "Symbol", "Dingbat dec": "233", "Dingbat hex": "E9", "Unicode dec": "9121", "Unicode hex": "23A1" },
    { "Typeface name": "Symbol", "Dingbat dec": "234", "Dingbat hex": "EA", "Unicode dec": "9122", "Unicode hex": "23A2" },
    { "Typeface name": "Symbol", "Dingbat dec": "235", "Dingbat hex": "EB", "Unicode dec": "9123", "Unicode hex": "23A3" },
    { "Typeface name": "Symbol", "Dingbat dec": "236", "Dingbat hex": "EC", "Unicode dec": "9127", "Unicode hex": "23A7" },
    { "Typeface name": "Symbol", "Dingbat dec": "237", "Dingbat hex": "ED", "Unicode dec": "9128", "Unicode hex": "23A8" },
    { "Typeface name": "Symbol", "Dingbat dec": "238", "Dingbat hex": "EE", "Unicode dec": "9129", "Unicode hex": "23A9" },
    { "Typeface name": "Symbol", "Dingbat dec": "239", "Dingbat hex": "EF", "Unicode dec": "9130", "Unicode hex": "23AA" },
    { "Typeface name": "Symbol", "Dingbat dec": "240", "Dingbat hex": "F0", "Unicode dec": "63743", "Unicode hex": "F8FF" },
    { "Typeface name": "Symbol", "Dingbat dec": "241", "Dingbat hex": "F1", "Unicode dec": "12297", "Unicode hex": "3009" },
    { "Typeface name": "Symbol", "Dingbat dec": "242", "Dingbat hex": "F2", "Unicode dec": "8747", "Unicode hex": "222B" },
    { "Typeface name": "Symbol", "Dingbat dec": "243", "Dingbat hex": "F3", "Unicode dec": "8992", "Unicode hex": "2320" },
    { "Typeface name": "Symbol", "Dingbat dec": "244", "Dingbat hex": "F4", "Unicode dec": "9134", "Unicode hex": "23AE" },
    { "Typeface name": "Symbol", "Dingbat dec": "245", "Dingbat hex": "F5", "Unicode dec": "8993", "Unicode hex": "2321" },
    { "Typeface name": "Symbol", "Dingbat dec": "246", "Dingbat hex": "F6", "Unicode dec": "9118", "Unicode hex": "239E" },
    { "Typeface name": "Symbol", "Dingbat dec": "247", "Dingbat hex": "F7", "Unicode dec": "9119", "Unicode hex": "239F" },
    { "Typeface name": "Symbol", "Dingbat dec": "248", "Dingbat hex": "F8", "Unicode dec": "9120", "Unicode hex": "23A0" },
    { "Typeface name": "Symbol", "Dingbat dec": "249", "Dingbat hex": "F9", "Unicode dec": "9124", "Unicode hex": "23A4" },
    { "Typeface name": "Symbol", "Dingbat dec": "250", "Dingbat hex": "FA", "Unicode dec": "9125", "Unicode hex": "23A5" },
    { "Typeface name": "Symbol", "Dingbat dec": "251", "Dingbat hex": "FB", "Unicode dec": "9126", "Unicode hex": "23A6" },
    { "Typeface name": "Symbol", "Dingbat dec": "252", "Dingbat hex": "FC", "Unicode dec": "9131", "Unicode hex": "23AB" },
    { "Typeface name": "Symbol", "Dingbat dec": "253", "Dingbat hex": "FD", "Unicode dec": "9132", "Unicode hex": "23AC" },
    { "Typeface name": "Symbol", "Dingbat dec": "254", "Dingbat hex": "FE", "Unicode dec": "9133", "Unicode hex": "23AD" },
    { "Typeface name": "Webdings", "Dingbat dec": "32", "Dingbat hex": "20", "Unicode dec": "32", "Unicode hex": "20" },
    { "Typeface name": "Webdings", "Dingbat dec": "33", "Dingbat hex": "21", "Unicode dec": "128375", "Unicode hex": "1F577" },
    { "Typeface name": "Webdings", "Dingbat dec": "34", "Dingbat hex": "22", "Unicode dec": "128376", "Unicode hex": "1F578" },
    { "Typeface name": "Webdings", "Dingbat dec": "35", "Dingbat hex": "23", "Unicode dec": "128370", "Unicode hex": "1F572" },
    { "Typeface name": "Webdings", "Dingbat dec": "36", "Dingbat hex": "24", "Unicode dec": "128374", "Unicode hex": "1F576" },
    { "Typeface name": "Webdings", "Dingbat dec": "37", "Dingbat hex": "25", "Unicode dec": "127942", "Unicode hex": "1F3C6" },
    { "Typeface name": "Webdings", "Dingbat dec": "38", "Dingbat hex": "26", "Unicode dec": "127894", "Unicode hex": "1F396" },
    { "Typeface name": "Webdings", "Dingbat dec": "39", "Dingbat hex": "27", "Unicode dec": "128391", "Unicode hex": "1F587" },
    { "Typeface name": "Webdings", "Dingbat dec": "40", "Dingbat hex": "28", "Unicode dec": "128488", "Unicode hex": "1F5E8" },
    { "Typeface name": "Webdings", "Dingbat dec": "41", "Dingbat hex": "29", "Unicode dec": "128489", "Unicode hex": "1F5E9" },
    { "Typeface name": "Webdings", "Dingbat dec": "42", "Dingbat hex": "2A", "Unicode dec": "128496", "Unicode hex": "1F5F0" },
    { "Typeface name": "Webdings", "Dingbat dec": "43", "Dingbat hex": "2B", "Unicode dec": "128497", "Unicode hex": "1F5F1" },
    { "Typeface name": "Webdings", "Dingbat dec": "44", "Dingbat hex": "2C", "Unicode dec": "127798", "Unicode hex": "1F336" },
    { "Typeface name": "Webdings", "Dingbat dec": "45", "Dingbat hex": "2D", "Unicode dec": "127895", "Unicode hex": "1F397" },
    { "Typeface name": "Webdings", "Dingbat dec": "46", "Dingbat hex": "2E", "Unicode dec": "128638", "Unicode hex": "1F67E" },
    { "Typeface name": "Webdings", "Dingbat dec": "47", "Dingbat hex": "2F", "Unicode dec": "128636", "Unicode hex": "1F67C" },
    { "Typeface name": "Webdings", "Dingbat dec": "48", "Dingbat hex": "30", "Unicode dec": "128469", "Unicode hex": "1F5D5" },
    { "Typeface name": "Webdings", "Dingbat dec": "49", "Dingbat hex": "31", "Unicode dec": "128470", "Unicode hex": "1F5D6" },
    { "Typeface name": "Webdings", "Dingbat dec": "50", "Dingbat hex": "32", "Unicode dec": "128471", "Unicode hex": "1F5D7" },
    { "Typeface name": "Webdings", "Dingbat dec": "51", "Dingbat hex": "33", "Unicode dec": "9204", "Unicode hex": "23F4" },
    { "Typeface name": "Webdings", "Dingbat dec": "52", "Dingbat hex": "34", "Unicode dec": "9205", "Unicode hex": "23F5" },
    { "Typeface name": "Webdings", "Dingbat dec": "53", "Dingbat hex": "35", "Unicode dec": "9206", "Unicode hex": "23F6" },
    { "Typeface name": "Webdings", "Dingbat dec": "54", "Dingbat hex": "36", "Unicode dec": "9207", "Unicode hex": "23F7" },
    { "Typeface name": "Webdings", "Dingbat dec": "55", "Dingbat hex": "37", "Unicode dec": "9194", "Unicode hex": "23EA" },
    { "Typeface name": "Webdings", "Dingbat dec": "56", "Dingbat hex": "38", "Unicode dec": "9193", "Unicode hex": "23E9" },
    { "Typeface name": "Webdings", "Dingbat dec": "57", "Dingbat hex": "39", "Unicode dec": "9198", "Unicode hex": "23EE" },
    { "Typeface name": "Webdings", "Dingbat dec": "58", "Dingbat hex": "3A", "Unicode dec": "9197", "Unicode hex": "23ED" },
    { "Typeface name": "Webdings", "Dingbat dec": "59", "Dingbat hex": "3B", "Unicode dec": "9208", "Unicode hex": "23F8" },
    { "Typeface name": "Webdings", "Dingbat dec": "60", "Dingbat hex": "3C", "Unicode dec": "9209", "Unicode hex": "23F9" },
    { "Typeface name": "Webdings", "Dingbat dec": "61", "Dingbat hex": "3D", "Unicode dec": "9210", "Unicode hex": "23FA" },
    { "Typeface name": "Webdings", "Dingbat dec": "62", "Dingbat hex": "3E", "Unicode dec": "128474", "Unicode hex": "1F5DA" },
    { "Typeface name": "Webdings", "Dingbat dec": "63", "Dingbat hex": "3F", "Unicode dec": "128499", "Unicode hex": "1F5F3" },
    { "Typeface name": "Webdings", "Dingbat dec": "64", "Dingbat hex": "40", "Unicode dec": "128736", "Unicode hex": "1F6E0" },
    { "Typeface name": "Webdings", "Dingbat dec": "65", "Dingbat hex": "41", "Unicode dec": "127959", "Unicode hex": "1F3D7" },
    { "Typeface name": "Webdings", "Dingbat dec": "66", "Dingbat hex": "42", "Unicode dec": "127960", "Unicode hex": "1F3D8" },
    { "Typeface name": "Webdings", "Dingbat dec": "67", "Dingbat hex": "43", "Unicode dec": "127961", "Unicode hex": "1F3D9" },
    { "Typeface name": "Webdings", "Dingbat dec": "68", "Dingbat hex": "44", "Unicode dec": "127962", "Unicode hex": "1F3DA" },
    { "Typeface name": "Webdings", "Dingbat dec": "69", "Dingbat hex": "45", "Unicode dec": "127964", "Unicode hex": "1F3DC" },
    { "Typeface name": "Webdings", "Dingbat dec": "70", "Dingbat hex": "46", "Unicode dec": "127981", "Unicode hex": "1F3ED" },
    { "Typeface name": "Webdings", "Dingbat dec": "71", "Dingbat hex": "47", "Unicode dec": "127963", "Unicode hex": "1F3DB" },
    { "Typeface name": "Webdings", "Dingbat dec": "72", "Dingbat hex": "48", "Unicode dec": "127968", "Unicode hex": "1F3E0" },
    { "Typeface name": "Webdings", "Dingbat dec": "73", "Dingbat hex": "49", "Unicode dec": "127958", "Unicode hex": "1F3D6" },
    { "Typeface name": "Webdings", "Dingbat dec": "74", "Dingbat hex": "4A", "Unicode dec": "127965", "Unicode hex": "1F3DD" },
    { "Typeface name": "Webdings", "Dingbat dec": "75", "Dingbat hex": "4B", "Unicode dec": "128739", "Unicode hex": "1F6E3" },
    { "Typeface name": "Webdings", "Dingbat dec": "76", "Dingbat hex": "4C", "Unicode dec": "128269", "Unicode hex": "1F50D" },
    { "Typeface name": "Webdings", "Dingbat dec": "77", "Dingbat hex": "4D", "Unicode dec": "127956", "Unicode hex": "1F3D4" },
    { "Typeface name": "Webdings", "Dingbat dec": "78", "Dingbat hex": "4E", "Unicode dec": "128065", "Unicode hex": "1F441" },
    { "Typeface name": "Webdings", "Dingbat dec": "79", "Dingbat hex": "4F", "Unicode dec": "128066", "Unicode hex": "1F442" },
    { "Typeface name": "Webdings", "Dingbat dec": "80", "Dingbat hex": "50", "Unicode dec": "127966", "Unicode hex": "1F3DE" },
    { "Typeface name": "Webdings", "Dingbat dec": "81", "Dingbat hex": "51", "Unicode dec": "127957", "Unicode hex": "1F3D5" },
    { "Typeface name": "Webdings", "Dingbat dec": "82", "Dingbat hex": "52", "Unicode dec": "128740", "Unicode hex": "1F6E4" },
    { "Typeface name": "Webdings", "Dingbat dec": "83", "Dingbat hex": "53", "Unicode dec": "127967", "Unicode hex": "1F3DF" },
    { "Typeface name": "Webdings", "Dingbat dec": "84", "Dingbat hex": "54", "Unicode dec": "128755", "Unicode hex": "1F6F3" },
    { "Typeface name": "Webdings", "Dingbat dec": "85", "Dingbat hex": "55", "Unicode dec": "128364", "Unicode hex": "1F56C" },
    { "Typeface name": "Webdings", "Dingbat dec": "86", "Dingbat hex": "56", "Unicode dec": "128363", "Unicode hex": "1F56B" },
    { "Typeface name": "Webdings", "Dingbat dec": "87", "Dingbat hex": "57", "Unicode dec": "128360", "Unicode hex": "1F568" },
    { "Typeface name": "Webdings", "Dingbat dec": "88", "Dingbat hex": "58", "Unicode dec": "128264", "Unicode hex": "1F508" },
    { "Typeface name": "Webdings", "Dingbat dec": "89", "Dingbat hex": "59", "Unicode dec": "127892", "Unicode hex": "1F394" },
    { "Typeface name": "Webdings", "Dingbat dec": "90", "Dingbat hex": "5A", "Unicode dec": "127893", "Unicode hex": "1F395" },
    { "Typeface name": "Webdings", "Dingbat dec": "91", "Dingbat hex": "5B", "Unicode dec": "128492", "Unicode hex": "1F5EC" },
    { "Typeface name": "Webdings", "Dingbat dec": "92", "Dingbat hex": "5C", "Unicode dec": "128637", "Unicode hex": "1F67D" },
    { "Typeface name": "Webdings", "Dingbat dec": "93", "Dingbat hex": "5D", "Unicode dec": "128493", "Unicode hex": "1F5ED" },
    { "Typeface name": "Webdings", "Dingbat dec": "94", "Dingbat hex": "5E", "Unicode dec": "128490", "Unicode hex": "1F5EA" },
    { "Typeface name": "Webdings", "Dingbat dec": "95", "Dingbat hex": "5F", "Unicode dec": "128491", "Unicode hex": "1F5EB" },
    { "Typeface name": "Webdings", "Dingbat dec": "96", "Dingbat hex": "60", "Unicode dec": "11156", "Unicode hex": "2B94" },
    { "Typeface name": "Webdings", "Dingbat dec": "97", "Dingbat hex": "61", "Unicode dec": "10004", "Unicode hex": "2714" },
    { "Typeface name": "Webdings", "Dingbat dec": "98", "Dingbat hex": "62", "Unicode dec": "128690", "Unicode hex": "1F6B2" },
    { "Typeface name": "Webdings", "Dingbat dec": "99", "Dingbat hex": "63", "Unicode dec": "11036", "Unicode hex": "2B1C" },
    { "Typeface name": "Webdings", "Dingbat dec": "100", "Dingbat hex": "64", "Unicode dec": "128737", "Unicode hex": "1F6E1" },
    { "Typeface name": "Webdings", "Dingbat dec": "101", "Dingbat hex": "65", "Unicode dec": "128230", "Unicode hex": "1F4E6" },
    { "Typeface name": "Webdings", "Dingbat dec": "102", "Dingbat hex": "66", "Unicode dec": "128753", "Unicode hex": "1F6F1" },
    { "Typeface name": "Webdings", "Dingbat dec": "103", "Dingbat hex": "67", "Unicode dec": "11035", "Unicode hex": "2B1B" },
    { "Typeface name": "Webdings", "Dingbat dec": "104", "Dingbat hex": "68", "Unicode dec": "128657", "Unicode hex": "1F691" },
    { "Typeface name": "Webdings", "Dingbat dec": "105", "Dingbat hex": "69", "Unicode dec": "128712", "Unicode hex": "1F6C8" },
    { "Typeface name": "Webdings", "Dingbat dec": "106", "Dingbat hex": "6A", "Unicode dec": "128745", "Unicode hex": "1F6E9" },
    { "Typeface name": "Webdings", "Dingbat dec": "107", "Dingbat hex": "6B", "Unicode dec": "128752", "Unicode hex": "1F6F0" },
    { "Typeface name": "Webdings", "Dingbat dec": "108", "Dingbat hex": "6C", "Unicode dec": "128968", "Unicode hex": "1F7C8" },
    { "Typeface name": "Webdings", "Dingbat dec": "109", "Dingbat hex": "6D", "Unicode dec": "128372", "Unicode hex": "1F574" },
    { "Typeface name": "Webdings", "Dingbat dec": "110", "Dingbat hex": "6E", "Unicode dec": "11044", "Unicode hex": "2B24" },
    { "Typeface name": "Webdings", "Dingbat dec": "111", "Dingbat hex": "6F", "Unicode dec": "128741", "Unicode hex": "1F6E5" },
    { "Typeface name": "Webdings", "Dingbat dec": "112", "Dingbat hex": "70", "Unicode dec": "128660", "Unicode hex": "1F694" },
    { "Typeface name": "Webdings", "Dingbat dec": "113", "Dingbat hex": "71", "Unicode dec": "128472", "Unicode hex": "1F5D8" },
    { "Typeface name": "Webdings", "Dingbat dec": "114", "Dingbat hex": "72", "Unicode dec": "128473", "Unicode hex": "1F5D9" },
    { "Typeface name": "Webdings", "Dingbat dec": "115", "Dingbat hex": "73", "Unicode dec": "10067", "Unicode hex": "2753" },
    { "Typeface name": "Webdings", "Dingbat dec": "116", "Dingbat hex": "74", "Unicode dec": "128754", "Unicode hex": "1F6F2" },
    { "Typeface name": "Webdings", "Dingbat dec": "117", "Dingbat hex": "75", "Unicode dec": "128647", "Unicode hex": "1F687" },
    { "Typeface name": "Webdings", "Dingbat dec": "118", "Dingbat hex": "76", "Unicode dec": "128653", "Unicode hex": "1F68D" },
    { "Typeface name": "Webdings", "Dingbat dec": "119", "Dingbat hex": "77", "Unicode dec": "9971", "Unicode hex": "26F3" },
    { "Typeface name": "Webdings", "Dingbat dec": "120", "Dingbat hex": "78", "Unicode dec": "10680", "Unicode hex": "29B8" },
    { "Typeface name": "Webdings", "Dingbat dec": "121", "Dingbat hex": "79", "Unicode dec": "8854", "Unicode hex": "2296" },
    { "Typeface name": "Webdings", "Dingbat dec": "122", "Dingbat hex": "7A", "Unicode dec": "128685", "Unicode hex": "1F6AD" },
    { "Typeface name": "Webdings", "Dingbat dec": "123", "Dingbat hex": "7B", "Unicode dec": "128494", "Unicode hex": "1F5EE" },
    { "Typeface name": "Webdings", "Dingbat dec": "124", "Dingbat hex": "7C", "Unicode dec": "9168", "Unicode hex": "23D0" },
    { "Typeface name": "Webdings", "Dingbat dec": "125", "Dingbat hex": "7D", "Unicode dec": "128495", "Unicode hex": "1F5EF" },
    { "Typeface name": "Webdings", "Dingbat dec": "126", "Dingbat hex": "7E", "Unicode dec": "128498", "Unicode hex": "1F5F2" },
    { "Typeface name": "Webdings", "Dingbat dec": "128", "Dingbat hex": "80", "Unicode dec": "128697", "Unicode hex": "1F6B9" },
    { "Typeface name": "Webdings", "Dingbat dec": "129", "Dingbat hex": "81", "Unicode dec": "128698", "Unicode hex": "1F6BA" },
    { "Typeface name": "Webdings", "Dingbat dec": "130", "Dingbat hex": "82", "Unicode dec": "128713", "Unicode hex": "1F6C9" },
    { "Typeface name": "Webdings", "Dingbat dec": "131", "Dingbat hex": "83", "Unicode dec": "128714", "Unicode hex": "1F6CA" },
    { "Typeface name": "Webdings", "Dingbat dec": "132", "Dingbat hex": "84", "Unicode dec": "128700", "Unicode hex": "1F6BC" },
    { "Typeface name": "Webdings", "Dingbat dec": "133", "Dingbat hex": "85", "Unicode dec": "128125", "Unicode hex": "1F47D" },
    { "Typeface name": "Webdings", "Dingbat dec": "134", "Dingbat hex": "86", "Unicode dec": "127947", "Unicode hex": "1F3CB" },
    { "Typeface name": "Webdings", "Dingbat dec": "135", "Dingbat hex": "87", "Unicode dec": "9975", "Unicode hex": "26F7" },
    { "Typeface name": "Webdings", "Dingbat dec": "136", "Dingbat hex": "88", "Unicode dec": "127938", "Unicode hex": "1F3C2" },
    { "Typeface name": "Webdings", "Dingbat dec": "137", "Dingbat hex": "89", "Unicode dec": "127948", "Unicode hex": "1F3CC" },
    { "Typeface name": "Webdings", "Dingbat dec": "138", "Dingbat hex": "8A", "Unicode dec": "127946", "Unicode hex": "1F3CA" },
    { "Typeface name": "Webdings", "Dingbat dec": "139", "Dingbat hex": "8B", "Unicode dec": "127940", "Unicode hex": "1F3C4" },
    { "Typeface name": "Webdings", "Dingbat dec": "140", "Dingbat hex": "8C", "Unicode dec": "127949", "Unicode hex": "1F3CD" },
    { "Typeface name": "Webdings", "Dingbat dec": "141", "Dingbat hex": "8D", "Unicode dec": "127950", "Unicode hex": "1F3CE" },
    { "Typeface name": "Webdings", "Dingbat dec": "142", "Dingbat hex": "8E", "Unicode dec": "128664", "Unicode hex": "1F698" },
    { "Typeface name": "Webdings", "Dingbat dec": "143", "Dingbat hex": "8F", "Unicode dec": "128480", "Unicode hex": "1F5E0" },
    { "Typeface name": "Webdings", "Dingbat dec": "144", "Dingbat hex": "90", "Unicode dec": "128738", "Unicode hex": "1F6E2" },
    { "Typeface name": "Webdings", "Dingbat dec": "145", "Dingbat hex": "91", "Unicode dec": "128176", "Unicode hex": "1F4B0" },
    { "Typeface name": "Webdings", "Dingbat dec": "146", "Dingbat hex": "92", "Unicode dec": "127991", "Unicode hex": "1F3F7" },
    { "Typeface name": "Webdings", "Dingbat dec": "147", "Dingbat hex": "93", "Unicode dec": "128179", "Unicode hex": "1F4B3" },
    { "Typeface name": "Webdings", "Dingbat dec": "148", "Dingbat hex": "94", "Unicode dec": "128106", "Unicode hex": "1F46A" },
    { "Typeface name": "Webdings", "Dingbat dec": "149", "Dingbat hex": "95", "Unicode dec": "128481", "Unicode hex": "1F5E1" },
    { "Typeface name": "Webdings", "Dingbat dec": "150", "Dingbat hex": "96", "Unicode dec": "128482", "Unicode hex": "1F5E2" },
    { "Typeface name": "Webdings", "Dingbat dec": "151", "Dingbat hex": "97", "Unicode dec": "128483", "Unicode hex": "1F5E3" },
    { "Typeface name": "Webdings", "Dingbat dec": "152", "Dingbat hex": "98", "Unicode dec": "10031", "Unicode hex": "272F" },
    { "Typeface name": "Webdings", "Dingbat dec": "153", "Dingbat hex": "99", "Unicode dec": "128388", "Unicode hex": "1F584" },
    { "Typeface name": "Webdings", "Dingbat dec": "154", "Dingbat hex": "9A", "Unicode dec": "128389", "Unicode hex": "1F585" },
    { "Typeface name": "Webdings", "Dingbat dec": "155", "Dingbat hex": "9B", "Unicode dec": "128387", "Unicode hex": "1F583" },
    { "Typeface name": "Webdings", "Dingbat dec": "156", "Dingbat hex": "9C", "Unicode dec": "128390", "Unicode hex": "1F586" },
    { "Typeface name": "Webdings", "Dingbat dec": "157", "Dingbat hex": "9D", "Unicode dec": "128441", "Unicode hex": "1F5B9" },
    { "Typeface name": "Webdings", "Dingbat dec": "158", "Dingbat hex": "9E", "Unicode dec": "128442", "Unicode hex": "1F5BA" },
    { "Typeface name": "Webdings", "Dingbat dec": "159", "Dingbat hex": "9F", "Unicode dec": "128443", "Unicode hex": "1F5BB" },
    { "Typeface name": "Webdings", "Dingbat dec": "160", "Dingbat hex": "A0", "Unicode dec": "128373", "Unicode hex": "1F575" },
    { "Typeface name": "Webdings", "Dingbat dec": "161", "Dingbat hex": "A1", "Unicode dec": "128368", "Unicode hex": "1F570" },
    { "Typeface name": "Webdings", "Dingbat dec": "162", "Dingbat hex": "A2", "Unicode dec": "128445", "Unicode hex": "1F5BD" },
    { "Typeface name": "Webdings", "Dingbat dec": "163", "Dingbat hex": "A3", "Unicode dec": "128446", "Unicode hex": "1F5BE" },
    { "Typeface name": "Webdings", "Dingbat dec": "164", "Dingbat hex": "A4", "Unicode dec": "128203", "Unicode hex": "1F4CB" },
    { "Typeface name": "Webdings", "Dingbat dec": "165", "Dingbat hex": "A5", "Unicode dec": "128466", "Unicode hex": "1F5D2" },
    { "Typeface name": "Webdings", "Dingbat dec": "166", "Dingbat hex": "A6", "Unicode dec": "128467", "Unicode hex": "1F5D3" },
    { "Typeface name": "Webdings", "Dingbat dec": "167", "Dingbat hex": "A7", "Unicode dec": "128366", "Unicode hex": "1F56E" },
    { "Typeface name": "Webdings", "Dingbat dec": "168", "Dingbat hex": "A8", "Unicode dec": "128218", "Unicode hex": "1F4DA" },
    { "Typeface name": "Webdings", "Dingbat dec": "169", "Dingbat hex": "A9", "Unicode dec": "128478", "Unicode hex": "1F5DE" },
    { "Typeface name": "Webdings", "Dingbat dec": "170", "Dingbat hex": "AA", "Unicode dec": "128479", "Unicode hex": "1F5DF" },
    { "Typeface name": "Webdings", "Dingbat dec": "171", "Dingbat hex": "AB", "Unicode dec": "128451", "Unicode hex": "1F5C3" },
    { "Typeface name": "Webdings", "Dingbat dec": "172", "Dingbat hex": "AC", "Unicode dec": "128450", "Unicode hex": "1F5C2" },
    { "Typeface name": "Webdings", "Dingbat dec": "173", "Dingbat hex": "AD", "Unicode dec": "128444", "Unicode hex": "1F5BC" },
    { "Typeface name": "Webdings", "Dingbat dec": "174", "Dingbat hex": "AE", "Unicode dec": "127917", "Unicode hex": "1F3AD" },
    { "Typeface name": "Webdings", "Dingbat dec": "175", "Dingbat hex": "AF", "Unicode dec": "127900", "Unicode hex": "1F39C" },
    { "Typeface name": "Webdings", "Dingbat dec": "176", "Dingbat hex": "B0", "Unicode dec": "127896", "Unicode hex": "1F398" },
    { "Typeface name": "Webdings", "Dingbat dec": "177", "Dingbat hex": "B1", "Unicode dec": "127897", "Unicode hex": "1F399" },
    { "Typeface name": "Webdings", "Dingbat dec": "178", "Dingbat hex": "B2", "Unicode dec": "127911", "Unicode hex": "1F3A7" },
    { "Typeface name": "Webdings", "Dingbat dec": "179", "Dingbat hex": "B3", "Unicode dec": "128191", "Unicode hex": "1F4BF" },
    { "Typeface name": "Webdings", "Dingbat dec": "180", "Dingbat hex": "B4", "Unicode dec": "127902", "Unicode hex": "1F39E" },
    { "Typeface name": "Webdings", "Dingbat dec": "181", "Dingbat hex": "B5", "Unicode dec": "128247", "Unicode hex": "1F4F7" },
    { "Typeface name": "Webdings", "Dingbat dec": "182", "Dingbat hex": "B6", "Unicode dec": "127903", "Unicode hex": "1F39F" },
    { "Typeface name": "Webdings", "Dingbat dec": "183", "Dingbat hex": "B7", "Unicode dec": "127916", "Unicode hex": "1F3AC" },
    { "Typeface name": "Webdings", "Dingbat dec": "184", "Dingbat hex": "B8", "Unicode dec": "128253", "Unicode hex": "1F4FD" },
    { "Typeface name": "Webdings", "Dingbat dec": "185", "Dingbat hex": "B9", "Unicode dec": "128249", "Unicode hex": "1F4F9" },
    { "Typeface name": "Webdings", "Dingbat dec": "186", "Dingbat hex": "BA", "Unicode dec": "128254", "Unicode hex": "1F4FE" },
    { "Typeface name": "Webdings", "Dingbat dec": "187", "Dingbat hex": "BB", "Unicode dec": "128251", "Unicode hex": "1F4FB" },
    { "Typeface name": "Webdings", "Dingbat dec": "188", "Dingbat hex": "BC", "Unicode dec": "127898", "Unicode hex": "1F39A" },
    { "Typeface name": "Webdings", "Dingbat dec": "189", "Dingbat hex": "BD", "Unicode dec": "127899", "Unicode hex": "1F39B" },
    { "Typeface name": "Webdings", "Dingbat dec": "190", "Dingbat hex": "BE", "Unicode dec": "128250", "Unicode hex": "1F4FA" },
    { "Typeface name": "Webdings", "Dingbat dec": "191", "Dingbat hex": "BF", "Unicode dec": "128187", "Unicode hex": "1F4BB" },
    { "Typeface name": "Webdings", "Dingbat dec": "192", "Dingbat hex": "C0", "Unicode dec": "128421", "Unicode hex": "1F5A5" },
    { "Typeface name": "Webdings", "Dingbat dec": "193", "Dingbat hex": "C1", "Unicode dec": "128422", "Unicode hex": "1F5A6" },
    { "Typeface name": "Webdings", "Dingbat dec": "194", "Dingbat hex": "C2", "Unicode dec": "128423", "Unicode hex": "1F5A7" },
    { "Typeface name": "Webdings", "Dingbat dec": "195", "Dingbat hex": "C3", "Unicode dec": "128377", "Unicode hex": "1F579" },
    { "Typeface name": "Webdings", "Dingbat dec": "196", "Dingbat hex": "C4", "Unicode dec": "127918", "Unicode hex": "1F3AE" },
    { "Typeface name": "Webdings", "Dingbat dec": "197", "Dingbat hex": "C5", "Unicode dec": "128379", "Unicode hex": "1F57B" },
    { "Typeface name": "Webdings", "Dingbat dec": "198", "Dingbat hex": "C6", "Unicode dec": "128380", "Unicode hex": "1F57C" },
    { "Typeface name": "Webdings", "Dingbat dec": "199", "Dingbat hex": "C7", "Unicode dec": "128223", "Unicode hex": "1F4DF" },
    { "Typeface name": "Webdings", "Dingbat dec": "200", "Dingbat hex": "C8", "Unicode dec": "128385", "Unicode hex": "1F581" },
    { "Typeface name": "Webdings", "Dingbat dec": "201", "Dingbat hex": "C9", "Unicode dec": "128384", "Unicode hex": "1F580" },
    { "Typeface name": "Webdings", "Dingbat dec": "202", "Dingbat hex": "CA", "Unicode dec": "128424", "Unicode hex": "1F5A8" },
    { "Typeface name": "Webdings", "Dingbat dec": "203", "Dingbat hex": "CB", "Unicode dec": "128425", "Unicode hex": "1F5A9" },
    { "Typeface name": "Webdings", "Dingbat dec": "204", "Dingbat hex": "CC", "Unicode dec": "128447", "Unicode hex": "1F5BF" },
    { "Typeface name": "Webdings", "Dingbat dec": "205", "Dingbat hex": "CD", "Unicode dec": "128426", "Unicode hex": "1F5AA" },
    { "Typeface name": "Webdings", "Dingbat dec": "206", "Dingbat hex": "CE", "Unicode dec": "128476", "Unicode hex": "1F5DC" },
    { "Typeface name": "Webdings", "Dingbat dec": "207", "Dingbat hex": "CF", "Unicode dec": "128274", "Unicode hex": "1F512" },
    { "Typeface name": "Webdings", "Dingbat dec": "208", "Dingbat hex": "D0", "Unicode dec": "128275", "Unicode hex": "1F513" },
    { "Typeface name": "Webdings", "Dingbat dec": "209", "Dingbat hex": "D1", "Unicode dec": "128477", "Unicode hex": "1F5DD" },
    { "Typeface name": "Webdings", "Dingbat dec": "210", "Dingbat hex": "D2", "Unicode dec": "128229", "Unicode hex": "1F4E5" },
    { "Typeface name": "Webdings", "Dingbat dec": "211", "Dingbat hex": "D3", "Unicode dec": "128228", "Unicode hex": "1F4E4" },
    { "Typeface name": "Webdings", "Dingbat dec": "212", "Dingbat hex": "D4", "Unicode dec": "128371", "Unicode hex": "1F573" },
    { "Typeface name": "Webdings", "Dingbat dec": "213", "Dingbat hex": "D5", "Unicode dec": "127779", "Unicode hex": "1F323" },
    { "Typeface name": "Webdings", "Dingbat dec": "214", "Dingbat hex": "D6", "Unicode dec": "127780", "Unicode hex": "1F324" },
    { "Typeface name": "Webdings", "Dingbat dec": "215", "Dingbat hex": "D7", "Unicode dec": "127781", "Unicode hex": "1F325" },
    { "Typeface name": "Webdings", "Dingbat dec": "216", "Dingbat hex": "D8", "Unicode dec": "127782", "Unicode hex": "1F326" },
    { "Typeface name": "Webdings", "Dingbat dec": "217", "Dingbat hex": "D9", "Unicode dec": "9729", "Unicode hex": "2601" },
    { "Typeface name": "Webdings", "Dingbat dec": "218", "Dingbat hex": "DA", "Unicode dec": "127784", "Unicode hex": "1F328" },
    { "Typeface name": "Webdings", "Dingbat dec": "219", "Dingbat hex": "DB", "Unicode dec": "127783", "Unicode hex": "1F327" },
    { "Typeface name": "Webdings", "Dingbat dec": "220", "Dingbat hex": "DC", "Unicode dec": "127785", "Unicode hex": "1F329" },
    { "Typeface name": "Webdings", "Dingbat dec": "221", "Dingbat hex": "DD", "Unicode dec": "127786", "Unicode hex": "1F32A" },
    { "Typeface name": "Webdings", "Dingbat dec": "222", "Dingbat hex": "DE", "Unicode dec": "127788", "Unicode hex": "1F32C" },
    { "Typeface name": "Webdings", "Dingbat dec": "223", "Dingbat hex": "DF", "Unicode dec": "127787", "Unicode hex": "1F32B" },
    { "Typeface name": "Webdings", "Dingbat dec": "224", "Dingbat hex": "E0", "Unicode dec": "127772", "Unicode hex": "1F31C" },
    { "Typeface name": "Webdings", "Dingbat dec": "225", "Dingbat hex": "E1", "Unicode dec": "127777", "Unicode hex": "1F321" },
    { "Typeface name": "Webdings", "Dingbat dec": "226", "Dingbat hex": "E2", "Unicode dec": "128715", "Unicode hex": "1F6CB" },
    { "Typeface name": "Webdings", "Dingbat dec": "227", "Dingbat hex": "E3", "Unicode dec": "128719", "Unicode hex": "1F6CF" },
    { "Typeface name": "Webdings", "Dingbat dec": "228", "Dingbat hex": "E4", "Unicode dec": "127869", "Unicode hex": "1F37D" },
    { "Typeface name": "Webdings", "Dingbat dec": "229", "Dingbat hex": "E5", "Unicode dec": "127864", "Unicode hex": "1F378" },
    { "Typeface name": "Webdings", "Dingbat dec": "230", "Dingbat hex": "E6", "Unicode dec": "128718", "Unicode hex": "1F6CE" },
    { "Typeface name": "Webdings", "Dingbat dec": "231", "Dingbat hex": "E7", "Unicode dec": "128717", "Unicode hex": "1F6CD" },
    { "Typeface name": "Webdings", "Dingbat dec": "232", "Dingbat hex": "E8", "Unicode dec": "9413", "Unicode hex": "24C5" },
    { "Typeface name": "Webdings", "Dingbat dec": "233", "Dingbat hex": "E9", "Unicode dec": "9855", "Unicode hex": "267F" },
    { "Typeface name": "Webdings", "Dingbat dec": "234", "Dingbat hex": "EA", "Unicode dec": "128710", "Unicode hex": "1F6C6" },
    { "Typeface name": "Webdings", "Dingbat dec": "235", "Dingbat hex": "EB", "Unicode dec": "128392", "Unicode hex": "1F588" },
    { "Typeface name": "Webdings", "Dingbat dec": "236", "Dingbat hex": "EC", "Unicode dec": "127891", "Unicode hex": "1F393" },
    { "Typeface name": "Webdings", "Dingbat dec": "237", "Dingbat hex": "ED", "Unicode dec": "128484", "Unicode hex": "1F5E4" },
    { "Typeface name": "Webdings", "Dingbat dec": "238", "Dingbat hex": "EE", "Unicode dec": "128485", "Unicode hex": "1F5E5" },
    { "Typeface name": "Webdings", "Dingbat dec": "239", "Dingbat hex": "EF", "Unicode dec": "128486", "Unicode hex": "1F5E6" },
    { "Typeface name": "Webdings", "Dingbat dec": "240", "Dingbat hex": "F0", "Unicode dec": "128487", "Unicode hex": "1F5E7" },
    { "Typeface name": "Webdings", "Dingbat dec": "241", "Dingbat hex": "F1", "Unicode dec": "128746", "Unicode hex": "1F6EA" },
    { "Typeface name": "Webdings", "Dingbat dec": "242", "Dingbat hex": "F2", "Unicode dec": "128063", "Unicode hex": "1F43F" },
    { "Typeface name": "Webdings", "Dingbat dec": "243", "Dingbat hex": "F3", "Unicode dec": "128038", "Unicode hex": "1F426" },
    { "Typeface name": "Webdings", "Dingbat dec": "244", "Dingbat hex": "F4", "Unicode dec": "128031", "Unicode hex": "1F41F" },
    { "Typeface name": "Webdings", "Dingbat dec": "245", "Dingbat hex": "F5", "Unicode dec": "128021", "Unicode hex": "1F415" },
    { "Typeface name": "Webdings", "Dingbat dec": "246", "Dingbat hex": "F6", "Unicode dec": "128008", "Unicode hex": "1F408" },
    { "Typeface name": "Webdings", "Dingbat dec": "247", "Dingbat hex": "F7", "Unicode dec": "128620", "Unicode hex": "1F66C" },
    { "Typeface name": "Webdings", "Dingbat dec": "248", "Dingbat hex": "F8", "Unicode dec": "128622", "Unicode hex": "1F66E" },
    { "Typeface name": "Webdings", "Dingbat dec": "249", "Dingbat hex": "F9", "Unicode dec": "128621", "Unicode hex": "1F66D" },
    { "Typeface name": "Webdings", "Dingbat dec": "250", "Dingbat hex": "FA", "Unicode dec": "128623", "Unicode hex": "1F66F" },
    { "Typeface name": "Webdings", "Dingbat dec": "251", "Dingbat hex": "FB", "Unicode dec": "128506", "Unicode hex": "1F5FA" },
    { "Typeface name": "Webdings", "Dingbat dec": "252", "Dingbat hex": "FC", "Unicode dec": "127757", "Unicode hex": "1F30D" },
    { "Typeface name": "Webdings", "Dingbat dec": "253", "Dingbat hex": "FD", "Unicode dec": "127759", "Unicode hex": "1F30F" },
    { "Typeface name": "Webdings", "Dingbat dec": "254", "Dingbat hex": "FE", "Unicode dec": "127758", "Unicode hex": "1F30E" },
    { "Typeface name": "Webdings", "Dingbat dec": "255", "Dingbat hex": "FF", "Unicode dec": "128330", "Unicode hex": "1F54A" },
    { "Typeface name": "Wingdings", "Dingbat dec": "32", "Dingbat hex": "20", "Unicode dec": "32", "Unicode hex": "20" },
    { "Typeface name": "Wingdings", "Dingbat dec": "33", "Dingbat hex": "21", "Unicode dec": "128393", "Unicode hex": "1F589" },
    { "Typeface name": "Wingdings", "Dingbat dec": "34", "Dingbat hex": "22", "Unicode dec": "9986", "Unicode hex": "2702" },
    { "Typeface name": "Wingdings", "Dingbat dec": "35", "Dingbat hex": "23", "Unicode dec": "9985", "Unicode hex": "2701" },
    { "Typeface name": "Wingdings", "Dingbat dec": "36", "Dingbat hex": "24", "Unicode dec": "128083", "Unicode hex": "1F453" },
    { "Typeface name": "Wingdings", "Dingbat dec": "37", "Dingbat hex": "25", "Unicode dec": "128365", "Unicode hex": "1F56D" },
    { "Typeface name": "Wingdings", "Dingbat dec": "38", "Dingbat hex": "26", "Unicode dec": "128366", "Unicode hex": "1F56E" },
    { "Typeface name": "Wingdings", "Dingbat dec": "39", "Dingbat hex": "27", "Unicode dec": "128367", "Unicode hex": "1F56F" },
    { "Typeface name": "Wingdings", "Dingbat dec": "40", "Dingbat hex": "28", "Unicode dec": "128383", "Unicode hex": "1F57F" },
    { "Typeface name": "Wingdings", "Dingbat dec": "41", "Dingbat hex": "29", "Unicode dec": "9990", "Unicode hex": "2706" },
    { "Typeface name": "Wingdings", "Dingbat dec": "42", "Dingbat hex": "2A", "Unicode dec": "128386", "Unicode hex": "1F582" },
    { "Typeface name": "Wingdings", "Dingbat dec": "43", "Dingbat hex": "2B", "Unicode dec": "128387", "Unicode hex": "1F583" },
    { "Typeface name": "Wingdings", "Dingbat dec": "44", "Dingbat hex": "2C", "Unicode dec": "128234", "Unicode hex": "1F4EA" },
    { "Typeface name": "Wingdings", "Dingbat dec": "45", "Dingbat hex": "2D", "Unicode dec": "128235", "Unicode hex": "1F4EB" },
    { "Typeface name": "Wingdings", "Dingbat dec": "46", "Dingbat hex": "2E", "Unicode dec": "128236", "Unicode hex": "1F4EC" },
    { "Typeface name": "Wingdings", "Dingbat dec": "47", "Dingbat hex": "2F", "Unicode dec": "128237", "Unicode hex": "1F4ED" },
    { "Typeface name": "Wingdings", "Dingbat dec": "48", "Dingbat hex": "30", "Unicode dec": "128448", "Unicode hex": "1F5C0" },
    { "Typeface name": "Wingdings", "Dingbat dec": "49", "Dingbat hex": "31", "Unicode dec": "128449", "Unicode hex": "1F5C1" },
    { "Typeface name": "Wingdings", "Dingbat dec": "50", "Dingbat hex": "32", "Unicode dec": "128462", "Unicode hex": "1F5CE" },
    { "Typeface name": "Wingdings", "Dingbat dec": "51", "Dingbat hex": "33", "Unicode dec": "128463", "Unicode hex": "1F5CF" },
    { "Typeface name": "Wingdings", "Dingbat dec": "52", "Dingbat hex": "34", "Unicode dec": "128464", "Unicode hex": "1F5D0" },
    { "Typeface name": "Wingdings", "Dingbat dec": "53", "Dingbat hex": "35", "Unicode dec": "128452", "Unicode hex": "1F5C4" },
    { "Typeface name": "Wingdings", "Dingbat dec": "54", "Dingbat hex": "36", "Unicode dec": "8987", "Unicode hex": "231B" },
    { "Typeface name": "Wingdings", "Dingbat dec": "55", "Dingbat hex": "37", "Unicode dec": "128430", "Unicode hex": "1F5AE" },
    { "Typeface name": "Wingdings", "Dingbat dec": "56", "Dingbat hex": "38", "Unicode dec": "128432", "Unicode hex": "1F5B0" },
    { "Typeface name": "Wingdings", "Dingbat dec": "57", "Dingbat hex": "39", "Unicode dec": "128434", "Unicode hex": "1F5B2" },
    { "Typeface name": "Wingdings", "Dingbat dec": "58", "Dingbat hex": "3A", "Unicode dec": "128435", "Unicode hex": "1F5B3" },
    { "Typeface name": "Wingdings", "Dingbat dec": "59", "Dingbat hex": "3B", "Unicode dec": "128436", "Unicode hex": "1F5B4" },
    { "Typeface name": "Wingdings", "Dingbat dec": "60", "Dingbat hex": "3C", "Unicode dec": "128427", "Unicode hex": "1F5AB" },
    { "Typeface name": "Wingdings", "Dingbat dec": "61", "Dingbat hex": "3D", "Unicode dec": "128428", "Unicode hex": "1F5AC" },
    { "Typeface name": "Wingdings", "Dingbat dec": "62", "Dingbat hex": "3E", "Unicode dec": "9991", "Unicode hex": "2707" },
    { "Typeface name": "Wingdings", "Dingbat dec": "63", "Dingbat hex": "3F", "Unicode dec": "9997", "Unicode hex": "270D" },
    { "Typeface name": "Wingdings", "Dingbat dec": "64", "Dingbat hex": "40", "Unicode dec": "128398", "Unicode hex": "1F58E" },
    { "Typeface name": "Wingdings", "Dingbat dec": "65", "Dingbat hex": "41", "Unicode dec": "9996", "Unicode hex": "270C" },
    { "Typeface name": "Wingdings", "Dingbat dec": "66", "Dingbat hex": "42", "Unicode dec": "128399", "Unicode hex": "1F58F" },
    { "Typeface name": "Wingdings", "Dingbat dec": "67", "Dingbat hex": "43", "Unicode dec": "128077", "Unicode hex": "1F44D" },
    { "Typeface name": "Wingdings", "Dingbat dec": "68", "Dingbat hex": "44", "Unicode dec": "128078", "Unicode hex": "1F44E" },
    { "Typeface name": "Wingdings", "Dingbat dec": "69", "Dingbat hex": "45", "Unicode dec": "9756", "Unicode hex": "261C" },
    { "Typeface name": "Wingdings", "Dingbat dec": "70", "Dingbat hex": "46", "Unicode dec": "9758", "Unicode hex": "261E" },
    { "Typeface name": "Wingdings", "Dingbat dec": "71", "Dingbat hex": "47", "Unicode dec": "9757", "Unicode hex": "261D" },
    { "Typeface name": "Wingdings", "Dingbat dec": "72", "Dingbat hex": "48", "Unicode dec": "9759", "Unicode hex": "261F" },
    { "Typeface name": "Wingdings", "Dingbat dec": "73", "Dingbat hex": "49", "Unicode dec": "128400", "Unicode hex": "1F590" },
    { "Typeface name": "Wingdings", "Dingbat dec": "74", "Dingbat hex": "4A", "Unicode dec": "9786", "Unicode hex": "263A" },
    { "Typeface name": "Wingdings", "Dingbat dec": "75", "Dingbat hex": "4B", "Unicode dec": "128528", "Unicode hex": "1F610" },
    { "Typeface name": "Wingdings", "Dingbat dec": "76", "Dingbat hex": "4C", "Unicode dec": "9785", "Unicode hex": "2639" },
    { "Typeface name": "Wingdings", "Dingbat dec": "77", "Dingbat hex": "4D", "Unicode dec": "128163", "Unicode hex": "1F4A3" },
    { "Typeface name": "Wingdings", "Dingbat dec": "78", "Dingbat hex": "4E", "Unicode dec": "128369", "Unicode hex": "1F571" },
    { "Typeface name": "Wingdings", "Dingbat dec": "79", "Dingbat hex": "4F", "Unicode dec": "127987", "Unicode hex": "1F3F3" },
    { "Typeface name": "Wingdings", "Dingbat dec": "80", "Dingbat hex": "50", "Unicode dec": "127985", "Unicode hex": "1F3F1" },
    { "Typeface name": "Wingdings", "Dingbat dec": "81", "Dingbat hex": "51", "Unicode dec": "9992", "Unicode hex": "2708" },
    { "Typeface name": "Wingdings", "Dingbat dec": "82", "Dingbat hex": "52", "Unicode dec": "9788", "Unicode hex": "263C" },
    { "Typeface name": "Wingdings", "Dingbat dec": "83", "Dingbat hex": "53", "Unicode dec": "127778", "Unicode hex": "1F322" },
    { "Typeface name": "Wingdings", "Dingbat dec": "84", "Dingbat hex": "54", "Unicode dec": "10052", "Unicode hex": "2744" },
    { "Typeface name": "Wingdings", "Dingbat dec": "85", "Dingbat hex": "55", "Unicode dec": "128326", "Unicode hex": "1F546" },
    { "Typeface name": "Wingdings", "Dingbat dec": "86", "Dingbat hex": "56", "Unicode dec": "10014", "Unicode hex": "271E" },
    { "Typeface name": "Wingdings", "Dingbat dec": "87", "Dingbat hex": "57", "Unicode dec": "128328", "Unicode hex": "1F548" },
    { "Typeface name": "Wingdings", "Dingbat dec": "88", "Dingbat hex": "58", "Unicode dec": "10016", "Unicode hex": "2720" },
    { "Typeface name": "Wingdings", "Dingbat dec": "89", "Dingbat hex": "59", "Unicode dec": "10017", "Unicode hex": "2721" },
    { "Typeface name": "Wingdings", "Dingbat dec": "90", "Dingbat hex": "5A", "Unicode dec": "9770", "Unicode hex": "262A" },
    { "Typeface name": "Wingdings", "Dingbat dec": "91", "Dingbat hex": "5B", "Unicode dec": "9775", "Unicode hex": "262F" },
    { "Typeface name": "Wingdings", "Dingbat dec": "92", "Dingbat hex": "5C", "Unicode dec": "128329", "Unicode hex": "1F549" },
    { "Typeface name": "Wingdings", "Dingbat dec": "93", "Dingbat hex": "5D", "Unicode dec": "9784", "Unicode hex": "2638" },
    { "Typeface name": "Wingdings", "Dingbat dec": "94", "Dingbat hex": "5E", "Unicode dec": "9800", "Unicode hex": "2648" },
    { "Typeface name": "Wingdings", "Dingbat dec": "95", "Dingbat hex": "5F", "Unicode dec": "9801", "Unicode hex": "2649" },
    { "Typeface name": "Wingdings", "Dingbat dec": "96", "Dingbat hex": "60", "Unicode dec": "9802", "Unicode hex": "264A" },
    { "Typeface name": "Wingdings", "Dingbat dec": "97", "Dingbat hex": "61", "Unicode dec": "9803", "Unicode hex": "264B" },
    { "Typeface name": "Wingdings", "Dingbat dec": "98", "Dingbat hex": "62", "Unicode dec": "9804", "Unicode hex": "264C" },
    { "Typeface name": "Wingdings", "Dingbat dec": "99", "Dingbat hex": "63", "Unicode dec": "9805", "Unicode hex": "264D" },
    { "Typeface name": "Wingdings", "Dingbat dec": "100", "Dingbat hex": "64", "Unicode dec": "9806", "Unicode hex": "264E" },
    { "Typeface name": "Wingdings", "Dingbat dec": "101", "Dingbat hex": "65", "Unicode dec": "9807", "Unicode hex": "264F" },
    { "Typeface name": "Wingdings", "Dingbat dec": "102", "Dingbat hex": "66", "Unicode dec": "9808", "Unicode hex": "2650" },
    { "Typeface name": "Wingdings", "Dingbat dec": "103", "Dingbat hex": "67", "Unicode dec": "9809", "Unicode hex": "2651" },
    { "Typeface name": "Wingdings", "Dingbat dec": "104", "Dingbat hex": "68", "Unicode dec": "9810", "Unicode hex": "2652" },
    { "Typeface name": "Wingdings", "Dingbat dec": "105", "Dingbat hex": "69", "Unicode dec": "9811", "Unicode hex": "2653" },
    { "Typeface name": "Wingdings", "Dingbat dec": "106", "Dingbat hex": "6A", "Unicode dec": "128624", "Unicode hex": "1F670" },
    { "Typeface name": "Wingdings", "Dingbat dec": "107", "Dingbat hex": "6B", "Unicode dec": "128629", "Unicode hex": "1F675" },
    { "Typeface name": "Wingdings", "Dingbat dec": "108", "Dingbat hex": "6C", "Unicode dec": "9899", "Unicode hex": "26AB" },
    { "Typeface name": "Wingdings", "Dingbat dec": "109", "Dingbat hex": "6D", "Unicode dec": "128318", "Unicode hex": "1F53E" },
    { "Typeface name": "Wingdings", "Dingbat dec": "110", "Dingbat hex": "6E", "Unicode dec": "9724", "Unicode hex": "25FC" },
    { "Typeface name": "Wingdings", "Dingbat dec": "111", "Dingbat hex": "6F", "Unicode dec": "128911", "Unicode hex": "1F78F" },
    { "Typeface name": "Wingdings", "Dingbat dec": "112", "Dingbat hex": "70", "Unicode dec": "128912", "Unicode hex": "1F790" },
    { "Typeface name": "Wingdings", "Dingbat dec": "113", "Dingbat hex": "71", "Unicode dec": "10065", "Unicode hex": "2751" },
    { "Typeface name": "Wingdings", "Dingbat dec": "114", "Dingbat hex": "72", "Unicode dec": "10066", "Unicode hex": "2752" },
    { "Typeface name": "Wingdings", "Dingbat dec": "115", "Dingbat hex": "73", "Unicode dec": "128927", "Unicode hex": "1F79F" },
    { "Typeface name": "Wingdings", "Dingbat dec": "116", "Dingbat hex": "74", "Unicode dec": "10731", "Unicode hex": "29EB" },
    { "Typeface name": "Wingdings", "Dingbat dec": "117", "Dingbat hex": "75", "Unicode dec": "9670", "Unicode hex": "25C6" },
    { "Typeface name": "Wingdings", "Dingbat dec": "118", "Dingbat hex": "76", "Unicode dec": "10070", "Unicode hex": "2756" },
    { "Typeface name": "Wingdings", "Dingbat dec": "119", "Dingbat hex": "77", "Unicode dec": "11049", "Unicode hex": "2B29" },
    { "Typeface name": "Wingdings", "Dingbat dec": "120", "Dingbat hex": "78", "Unicode dec": "8999", "Unicode hex": "2327" },
    { "Typeface name": "Wingdings", "Dingbat dec": "121", "Dingbat hex": "79", "Unicode dec": "11193", "Unicode hex": "2BB9" },
    { "Typeface name": "Wingdings", "Dingbat dec": "122", "Dingbat hex": "7A", "Unicode dec": "8984", "Unicode hex": "2318" },
    { "Typeface name": "Wingdings", "Dingbat dec": "123", "Dingbat hex": "7B", "Unicode dec": "127989", "Unicode hex": "1F3F5" },
    { "Typeface name": "Wingdings", "Dingbat dec": "124", "Dingbat hex": "7C", "Unicode dec": "127990", "Unicode hex": "1F3F6" },
    { "Typeface name": "Wingdings", "Dingbat dec": "125", "Dingbat hex": "7D", "Unicode dec": "128630", "Unicode hex": "1F676" },
    { "Typeface name": "Wingdings", "Dingbat dec": "126", "Dingbat hex": "7E", "Unicode dec": "128631", "Unicode hex": "1F677" },
    { "Typeface name": "Wingdings", "Dingbat dec": "127", "Dingbat hex": "7F", "Unicode dec": "9647", "Unicode hex": "25AF" },
    { "Typeface name": "Wingdings", "Dingbat dec": "128", "Dingbat hex": "80", "Unicode dec": "127243", "Unicode hex": "1F10B" },
    { "Typeface name": "Wingdings", "Dingbat dec": "129", "Dingbat hex": "81", "Unicode dec": "10112", "Unicode hex": "2780" },
    { "Typeface name": "Wingdings", "Dingbat dec": "130", "Dingbat hex": "82", "Unicode dec": "10113", "Unicode hex": "2781" },
    { "Typeface name": "Wingdings", "Dingbat dec": "131", "Dingbat hex": "83", "Unicode dec": "10114", "Unicode hex": "2782" },
    { "Typeface name": "Wingdings", "Dingbat dec": "132", "Dingbat hex": "84", "Unicode dec": "10115", "Unicode hex": "2783" },
    { "Typeface name": "Wingdings", "Dingbat dec": "133", "Dingbat hex": "85", "Unicode dec": "10116", "Unicode hex": "2784" },
    { "Typeface name": "Wingdings", "Dingbat dec": "134", "Dingbat hex": "86", "Unicode dec": "10117", "Unicode hex": "2785" },
    { "Typeface name": "Wingdings", "Dingbat dec": "135", "Dingbat hex": "87", "Unicode dec": "10118", "Unicode hex": "2786" },
    { "Typeface name": "Wingdings", "Dingbat dec": "136", "Dingbat hex": "88", "Unicode dec": "10119", "Unicode hex": "2787" },
    { "Typeface name": "Wingdings", "Dingbat dec": "137", "Dingbat hex": "89", "Unicode dec": "10120", "Unicode hex": "2788" },
    { "Typeface name": "Wingdings", "Dingbat dec": "138", "Dingbat hex": "8A", "Unicode dec": "10121", "Unicode hex": "2789" },
    { "Typeface name": "Wingdings", "Dingbat dec": "139", "Dingbat hex": "8B", "Unicode dec": "127244", "Unicode hex": "1F10C" },
    { "Typeface name": "Wingdings", "Dingbat dec": "140", "Dingbat hex": "8C", "Unicode dec": "10122", "Unicode hex": "278A" },
    { "Typeface name": "Wingdings", "Dingbat dec": "141", "Dingbat hex": "8D", "Unicode dec": "10123", "Unicode hex": "278B" },
    { "Typeface name": "Wingdings", "Dingbat dec": "142", "Dingbat hex": "8E", "Unicode dec": "10124", "Unicode hex": "278C" },
    { "Typeface name": "Wingdings", "Dingbat dec": "143", "Dingbat hex": "8F", "Unicode dec": "10125", "Unicode hex": "278D" },
    { "Typeface name": "Wingdings", "Dingbat dec": "144", "Dingbat hex": "90", "Unicode dec": "10126", "Unicode hex": "278E" },
    { "Typeface name": "Wingdings", "Dingbat dec": "145", "Dingbat hex": "91", "Unicode dec": "10127", "Unicode hex": "278F" },
    { "Typeface name": "Wingdings", "Dingbat dec": "146", "Dingbat hex": "92", "Unicode dec": "10128", "Unicode hex": "2790" },
    { "Typeface name": "Wingdings", "Dingbat dec": "147", "Dingbat hex": "93", "Unicode dec": "10129", "Unicode hex": "2791" },
    { "Typeface name": "Wingdings", "Dingbat dec": "148", "Dingbat hex": "94", "Unicode dec": "10130", "Unicode hex": "2792" },
    { "Typeface name": "Wingdings", "Dingbat dec": "149", "Dingbat hex": "95", "Unicode dec": "10131", "Unicode hex": "2793" },
    { "Typeface name": "Wingdings", "Dingbat dec": "150", "Dingbat hex": "96", "Unicode dec": "128610", "Unicode hex": "1F662" },
    { "Typeface name": "Wingdings", "Dingbat dec": "151", "Dingbat hex": "97", "Unicode dec": "128608", "Unicode hex": "1F660" },
    { "Typeface name": "Wingdings", "Dingbat dec": "152", "Dingbat hex": "98", "Unicode dec": "128609", "Unicode hex": "1F661" },
    { "Typeface name": "Wingdings", "Dingbat dec": "153", "Dingbat hex": "99", "Unicode dec": "128611", "Unicode hex": "1F663" },
    { "Typeface name": "Wingdings", "Dingbat dec": "154", "Dingbat hex": "9A", "Unicode dec": "128606", "Unicode hex": "1F65E" },
    { "Typeface name": "Wingdings", "Dingbat dec": "155", "Dingbat hex": "9B", "Unicode dec": "128604", "Unicode hex": "1F65C" },
    { "Typeface name": "Wingdings", "Dingbat dec": "156", "Dingbat hex": "9C", "Unicode dec": "128605", "Unicode hex": "1F65D" },
    { "Typeface name": "Wingdings", "Dingbat dec": "157", "Dingbat hex": "9D", "Unicode dec": "128607", "Unicode hex": "1F65F" },
    { "Typeface name": "Wingdings", "Dingbat dec": "158", "Dingbat hex": "9E", "Unicode dec": "8729", "Unicode hex": "2219" },
    { "Typeface name": "Wingdings", "Dingbat dec": "159", "Dingbat hex": "9F", "Unicode dec": "8226", "Unicode hex": "2022" },
    { "Typeface name": "Wingdings", "Dingbat dec": "160", "Dingbat hex": "A0", "Unicode dec": "11037", "Unicode hex": "2B1D" },
    { "Typeface name": "Wingdings", "Dingbat dec": "161", "Dingbat hex": "A1", "Unicode dec": "11096", "Unicode hex": "2B58" },
    { "Typeface name": "Wingdings", "Dingbat dec": "162", "Dingbat hex": "A2", "Unicode dec": "128902", "Unicode hex": "1F786" },
    { "Typeface name": "Wingdings", "Dingbat dec": "163", "Dingbat hex": "A3", "Unicode dec": "128904", "Unicode hex": "1F788" },
    { "Typeface name": "Wingdings", "Dingbat dec": "164", "Dingbat hex": "A4", "Unicode dec": "128906", "Unicode hex": "1F78A" },
    { "Typeface name": "Wingdings", "Dingbat dec": "165", "Dingbat hex": "A5", "Unicode dec": "128907", "Unicode hex": "1F78B" },
    { "Typeface name": "Wingdings", "Dingbat dec": "166", "Dingbat hex": "A6", "Unicode dec": "128319", "Unicode hex": "1F53F" },
    { "Typeface name": "Wingdings", "Dingbat dec": "167", "Dingbat hex": "A7", "Unicode dec": "9642", "Unicode hex": "25AA" },
    { "Typeface name": "Wingdings", "Dingbat dec": "168", "Dingbat hex": "A8", "Unicode dec": "128910", "Unicode hex": "1F78E" },
    { "Typeface name": "Wingdings", "Dingbat dec": "169", "Dingbat hex": "A9", "Unicode dec": "128961", "Unicode hex": "1F7C1" },
    { "Typeface name": "Wingdings", "Dingbat dec": "170", "Dingbat hex": "AA", "Unicode dec": "128965", "Unicode hex": "1F7C5" },
    { "Typeface name": "Wingdings", "Dingbat dec": "171", "Dingbat hex": "AB", "Unicode dec": "9733", "Unicode hex": "2605" },
    { "Typeface name": "Wingdings", "Dingbat dec": "172", "Dingbat hex": "AC", "Unicode dec": "128971", "Unicode hex": "1F7CB" },
    { "Typeface name": "Wingdings", "Dingbat dec": "173", "Dingbat hex": "AD", "Unicode dec": "128975", "Unicode hex": "1F7CF" },
    { "Typeface name": "Wingdings", "Dingbat dec": "174", "Dingbat hex": "AE", "Unicode dec": "128979", "Unicode hex": "1F7D3" },
    { "Typeface name": "Wingdings", "Dingbat dec": "175", "Dingbat hex": "AF", "Unicode dec": "128977", "Unicode hex": "1F7D1" },
    { "Typeface name": "Wingdings", "Dingbat dec": "176", "Dingbat hex": "B0", "Unicode dec": "11216", "Unicode hex": "2BD0" },
    { "Typeface name": "Wingdings", "Dingbat dec": "177", "Dingbat hex": "B1", "Unicode dec": "8982", "Unicode hex": "2316" },
    { "Typeface name": "Wingdings", "Dingbat dec": "178", "Dingbat hex": "B2", "Unicode dec": "11214", "Unicode hex": "2BCE" },
    { "Typeface name": "Wingdings", "Dingbat dec": "179", "Dingbat hex": "B3", "Unicode dec": "11215", "Unicode hex": "2BCF" },
    { "Typeface name": "Wingdings", "Dingbat dec": "180", "Dingbat hex": "B4", "Unicode dec": "11217", "Unicode hex": "2BD1" },
    { "Typeface name": "Wingdings", "Dingbat dec": "181", "Dingbat hex": "B5", "Unicode dec": "10026", "Unicode hex": "272A" },
    { "Typeface name": "Wingdings", "Dingbat dec": "182", "Dingbat hex": "B6", "Unicode dec": "10032", "Unicode hex": "2730" },
    { "Typeface name": "Wingdings", "Dingbat dec": "183", "Dingbat hex": "B7", "Unicode dec": "128336", "Unicode hex": "1F550" },
    { "Typeface name": "Wingdings", "Dingbat dec": "184", "Dingbat hex": "B8", "Unicode dec": "128337", "Unicode hex": "1F551" },
    { "Typeface name": "Wingdings", "Dingbat dec": "185", "Dingbat hex": "B9", "Unicode dec": "128338", "Unicode hex": "1F552" },
    { "Typeface name": "Wingdings", "Dingbat dec": "186", "Dingbat hex": "BA", "Unicode dec": "128339", "Unicode hex": "1F553" },
    { "Typeface name": "Wingdings", "Dingbat dec": "187", "Dingbat hex": "BB", "Unicode dec": "128340", "Unicode hex": "1F554" },
    { "Typeface name": "Wingdings", "Dingbat dec": "188", "Dingbat hex": "BC", "Unicode dec": "128341", "Unicode hex": "1F555" },
    { "Typeface name": "Wingdings", "Dingbat dec": "189", "Dingbat hex": "BD", "Unicode dec": "128342", "Unicode hex": "1F556" },
    { "Typeface name": "Wingdings", "Dingbat dec": "190", "Dingbat hex": "BE", "Unicode dec": "128343", "Unicode hex": "1F557" },
    { "Typeface name": "Wingdings", "Dingbat dec": "191", "Dingbat hex": "BF", "Unicode dec": "128344", "Unicode hex": "1F558" },
    { "Typeface name": "Wingdings", "Dingbat dec": "192", "Dingbat hex": "C0", "Unicode dec": "128345", "Unicode hex": "1F559" },
    { "Typeface name": "Wingdings", "Dingbat dec": "193", "Dingbat hex": "C1", "Unicode dec": "128346", "Unicode hex": "1F55A" },
    { "Typeface name": "Wingdings", "Dingbat dec": "194", "Dingbat hex": "C2", "Unicode dec": "128347", "Unicode hex": "1F55B" },
    { "Typeface name": "Wingdings", "Dingbat dec": "195", "Dingbat hex": "C3", "Unicode dec": "11184", "Unicode hex": "2BB0" },
    { "Typeface name": "Wingdings", "Dingbat dec": "196", "Dingbat hex": "C4", "Unicode dec": "11185", "Unicode hex": "2BB1" },
    { "Typeface name": "Wingdings", "Dingbat dec": "197", "Dingbat hex": "C5", "Unicode dec": "11186", "Unicode hex": "2BB2" },
    { "Typeface name": "Wingdings", "Dingbat dec": "198", "Dingbat hex": "C6", "Unicode dec": "11187", "Unicode hex": "2BB3" },
    { "Typeface name": "Wingdings", "Dingbat dec": "199", "Dingbat hex": "C7", "Unicode dec": "11188", "Unicode hex": "2BB4" },
    { "Typeface name": "Wingdings", "Dingbat dec": "200", "Dingbat hex": "C8", "Unicode dec": "11189", "Unicode hex": "2BB5" },
    { "Typeface name": "Wingdings", "Dingbat dec": "201", "Dingbat hex": "C9", "Unicode dec": "11190", "Unicode hex": "2BB6" },
    { "Typeface name": "Wingdings", "Dingbat dec": "202", "Dingbat hex": "CA", "Unicode dec": "11191", "Unicode hex": "2BB7" },
    { "Typeface name": "Wingdings", "Dingbat dec": "203", "Dingbat hex": "CB", "Unicode dec": "128618", "Unicode hex": "1F66A" },
    { "Typeface name": "Wingdings", "Dingbat dec": "204", "Dingbat hex": "CC", "Unicode dec": "128619", "Unicode hex": "1F66B" },
    { "Typeface name": "Wingdings", "Dingbat dec": "205", "Dingbat hex": "CD", "Unicode dec": "128597", "Unicode hex": "1F655" },
    { "Typeface name": "Wingdings", "Dingbat dec": "206", "Dingbat hex": "CE", "Unicode dec": "128596", "Unicode hex": "1F654" },
    { "Typeface name": "Wingdings", "Dingbat dec": "207", "Dingbat hex": "CF", "Unicode dec": "128599", "Unicode hex": "1F657" },
    { "Typeface name": "Wingdings", "Dingbat dec": "208", "Dingbat hex": "D0", "Unicode dec": "128598", "Unicode hex": "1F656" },
    { "Typeface name": "Wingdings", "Dingbat dec": "209", "Dingbat hex": "D1", "Unicode dec": "128592", "Unicode hex": "1F650" },
    { "Typeface name": "Wingdings", "Dingbat dec": "210", "Dingbat hex": "D2", "Unicode dec": "128593", "Unicode hex": "1F651" },
    { "Typeface name": "Wingdings", "Dingbat dec": "211", "Dingbat hex": "D3", "Unicode dec": "128594", "Unicode hex": "1F652" },
    { "Typeface name": "Wingdings", "Dingbat dec": "212", "Dingbat hex": "D4", "Unicode dec": "128595", "Unicode hex": "1F653" },
    { "Typeface name": "Wingdings", "Dingbat dec": "213", "Dingbat hex": "D5", "Unicode dec": "9003", "Unicode hex": "232B" },
    { "Typeface name": "Wingdings", "Dingbat dec": "214", "Dingbat hex": "D6", "Unicode dec": "8998", "Unicode hex": "2326" },
    { "Typeface name": "Wingdings", "Dingbat dec": "215", "Dingbat hex": "D7", "Unicode dec": "11160", "Unicode hex": "2B98" },
    { "Typeface name": "Wingdings", "Dingbat dec": "216", "Dingbat hex": "D8", "Unicode dec": "11162", "Unicode hex": "2B9A" },
    { "Typeface name": "Wingdings", "Dingbat dec": "217", "Dingbat hex": "D9", "Unicode dec": "11161", "Unicode hex": "2B99" },
    { "Typeface name": "Wingdings", "Dingbat dec": "218", "Dingbat hex": "DA", "Unicode dec": "11163", "Unicode hex": "2B9B" },
    { "Typeface name": "Wingdings", "Dingbat dec": "219", "Dingbat hex": "DB", "Unicode dec": "11144", "Unicode hex": "2B88" },
    { "Typeface name": "Wingdings", "Dingbat dec": "220", "Dingbat hex": "DC", "Unicode dec": "11146", "Unicode hex": "2B8A" },
    { "Typeface name": "Wingdings", "Dingbat dec": "221", "Dingbat hex": "DD", "Unicode dec": "11145", "Unicode hex": "2B89" },
    { "Typeface name": "Wingdings", "Dingbat dec": "222", "Dingbat hex": "DE", "Unicode dec": "11147", "Unicode hex": "2B8B" },
    { "Typeface name": "Wingdings", "Dingbat dec": "223", "Dingbat hex": "DF", "Unicode dec": "129128", "Unicode hex": "1F868" },
    { "Typeface name": "Wingdings", "Dingbat dec": "224", "Dingbat hex": "E0", "Unicode dec": "129130", "Unicode hex": "1F86A" },
    { "Typeface name": "Wingdings", "Dingbat dec": "225", "Dingbat hex": "E1", "Unicode dec": "129129", "Unicode hex": "1F869" },
    { "Typeface name": "Wingdings", "Dingbat dec": "226", "Dingbat hex": "E2", "Unicode dec": "129131", "Unicode hex": "1F86B" },
    { "Typeface name": "Wingdings", "Dingbat dec": "227", "Dingbat hex": "E3", "Unicode dec": "129132", "Unicode hex": "1F86C" },
    { "Typeface name": "Wingdings", "Dingbat dec": "228", "Dingbat hex": "E4", "Unicode dec": "129133", "Unicode hex": "1F86D" },
    { "Typeface name": "Wingdings", "Dingbat dec": "229", "Dingbat hex": "E5", "Unicode dec": "129135", "Unicode hex": "1F86F" },
    { "Typeface name": "Wingdings", "Dingbat dec": "230", "Dingbat hex": "E6", "Unicode dec": "129134", "Unicode hex": "1F86E" },
    { "Typeface name": "Wingdings", "Dingbat dec": "231", "Dingbat hex": "E7", "Unicode dec": "129144", "Unicode hex": "1F878" },
    { "Typeface name": "Wingdings", "Dingbat dec": "232", "Dingbat hex": "E8", "Unicode dec": "129146", "Unicode hex": "1F87A" },
    { "Typeface name": "Wingdings", "Dingbat dec": "233", "Dingbat hex": "E9", "Unicode dec": "129145", "Unicode hex": "1F879" },
    { "Typeface name": "Wingdings", "Dingbat dec": "234", "Dingbat hex": "EA", "Unicode dec": "129147", "Unicode hex": "1F87B" },
    { "Typeface name": "Wingdings", "Dingbat dec": "235", "Dingbat hex": "EB", "Unicode dec": "129148", "Unicode hex": "1F87C" },
    { "Typeface name": "Wingdings", "Dingbat dec": "236", "Dingbat hex": "EC", "Unicode dec": "129149", "Unicode hex": "1F87D" },
    { "Typeface name": "Wingdings", "Dingbat dec": "237", "Dingbat hex": "ED", "Unicode dec": "129151", "Unicode hex": "1F87F" },
    { "Typeface name": "Wingdings", "Dingbat dec": "238", "Dingbat hex": "EE", "Unicode dec": "129150", "Unicode hex": "1F87E" },
    { "Typeface name": "Wingdings", "Dingbat dec": "239", "Dingbat hex": "EF", "Unicode dec": "8678", "Unicode hex": "21E6" },
    { "Typeface name": "Wingdings", "Dingbat dec": "240", "Dingbat hex": "F0", "Unicode dec": "8680", "Unicode hex": "21E8" },
    { "Typeface name": "Wingdings", "Dingbat dec": "241", "Dingbat hex": "F1", "Unicode dec": "8679", "Unicode hex": "21E7" },
    { "Typeface name": "Wingdings", "Dingbat dec": "242", "Dingbat hex": "F2", "Unicode dec": "8681", "Unicode hex": "21E9" },
    { "Typeface name": "Wingdings", "Dingbat dec": "243", "Dingbat hex": "F3", "Unicode dec": "11012", "Unicode hex": "2B04" },
    { "Typeface name": "Wingdings", "Dingbat dec": "244", "Dingbat hex": "F4", "Unicode dec": "8691", "Unicode hex": "21F3" },
    { "Typeface name": "Wingdings", "Dingbat dec": "245", "Dingbat hex": "F5", "Unicode dec": "11009", "Unicode hex": "2B01" },
    { "Typeface name": "Wingdings", "Dingbat dec": "246", "Dingbat hex": "F6", "Unicode dec": "11008", "Unicode hex": "2B00" },
    { "Typeface name": "Wingdings", "Dingbat dec": "247", "Dingbat hex": "F7", "Unicode dec": "11011", "Unicode hex": "2B03" },
    { "Typeface name": "Wingdings", "Dingbat dec": "248", "Dingbat hex": "F8", "Unicode dec": "11010", "Unicode hex": "2B02" },
    { "Typeface name": "Wingdings", "Dingbat dec": "249", "Dingbat hex": "F9", "Unicode dec": "129196", "Unicode hex": "1F8AC" },
    { "Typeface name": "Wingdings", "Dingbat dec": "250", "Dingbat hex": "FA", "Unicode dec": "129197", "Unicode hex": "1F8AD" },
    { "Typeface name": "Wingdings", "Dingbat dec": "251", "Dingbat hex": "FB", "Unicode dec": "128502", "Unicode hex": "1F5F6" },
    { "Typeface name": "Wingdings", "Dingbat dec": "252", "Dingbat hex": "FC", "Unicode dec": "10003", "Unicode hex": "2713" },
    { "Typeface name": "Wingdings", "Dingbat dec": "253", "Dingbat hex": "FD", "Unicode dec": "128503", "Unicode hex": "1F5F7" },
    { "Typeface name": "Wingdings", "Dingbat dec": "254", "Dingbat hex": "FE", "Unicode dec": "128505", "Unicode hex": "1F5F9" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "32", "Dingbat hex": "20", "Unicode dec": "32", "Unicode hex": "20" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "33", "Dingbat hex": "21", "Unicode dec": "128394", "Unicode hex": "1F58A" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "34", "Dingbat hex": "22", "Unicode dec": "128395", "Unicode hex": "1F58B" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "35", "Dingbat hex": "23", "Unicode dec": "128396", "Unicode hex": "1F58C" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "36", "Dingbat hex": "24", "Unicode dec": "128397", "Unicode hex": "1F58D" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "37", "Dingbat hex": "25", "Unicode dec": "9988", "Unicode hex": "2704" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "38", "Dingbat hex": "26", "Unicode dec": "9984", "Unicode hex": "2700" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "39", "Dingbat hex": "27", "Unicode dec": "128382", "Unicode hex": "1F57E" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "40", "Dingbat hex": "28", "Unicode dec": "128381", "Unicode hex": "1F57D" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "41", "Dingbat hex": "29", "Unicode dec": "128453", "Unicode hex": "1F5C5" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "42", "Dingbat hex": "2A", "Unicode dec": "128454", "Unicode hex": "1F5C6" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "43", "Dingbat hex": "2B", "Unicode dec": "128455", "Unicode hex": "1F5C7" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "44", "Dingbat hex": "2C", "Unicode dec": "128456", "Unicode hex": "1F5C8" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "45", "Dingbat hex": "2D", "Unicode dec": "128457", "Unicode hex": "1F5C9" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "46", "Dingbat hex": "2E", "Unicode dec": "128458", "Unicode hex": "1F5CA" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "47", "Dingbat hex": "2F", "Unicode dec": "128459", "Unicode hex": "1F5CB" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "48", "Dingbat hex": "30", "Unicode dec": "128460", "Unicode hex": "1F5CC" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "49", "Dingbat hex": "31", "Unicode dec": "128461", "Unicode hex": "1F5CD" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "50", "Dingbat hex": "32", "Unicode dec": "128203", "Unicode hex": "1F4CB" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "51", "Dingbat hex": "33", "Unicode dec": "128465", "Unicode hex": "1F5D1" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "52", "Dingbat hex": "34", "Unicode dec": "128468", "Unicode hex": "1F5D4" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "53", "Dingbat hex": "35", "Unicode dec": "128437", "Unicode hex": "1F5B5" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "54", "Dingbat hex": "36", "Unicode dec": "128438", "Unicode hex": "1F5B6" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "55", "Dingbat hex": "37", "Unicode dec": "128439", "Unicode hex": "1F5B7" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "56", "Dingbat hex": "38", "Unicode dec": "128440", "Unicode hex": "1F5B8" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "57", "Dingbat hex": "39", "Unicode dec": "128429", "Unicode hex": "1F5AD" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "58", "Dingbat hex": "3A", "Unicode dec": "128431", "Unicode hex": "1F5AF" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "59", "Dingbat hex": "3B", "Unicode dec": "128433", "Unicode hex": "1F5B1" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "60", "Dingbat hex": "3C", "Unicode dec": "128402", "Unicode hex": "1F592" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "61", "Dingbat hex": "3D", "Unicode dec": "128403", "Unicode hex": "1F593" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "62", "Dingbat hex": "3E", "Unicode dec": "128408", "Unicode hex": "1F598" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "63", "Dingbat hex": "3F", "Unicode dec": "128409", "Unicode hex": "1F599" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "64", "Dingbat hex": "40", "Unicode dec": "128410", "Unicode hex": "1F59A" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "65", "Dingbat hex": "41", "Unicode dec": "128411", "Unicode hex": "1F59B" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "66", "Dingbat hex": "42", "Unicode dec": "128072", "Unicode hex": "1F448" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "67", "Dingbat hex": "43", "Unicode dec": "128073", "Unicode hex": "1F449" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "68", "Dingbat hex": "44", "Unicode dec": "128412", "Unicode hex": "1F59C" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "69", "Dingbat hex": "45", "Unicode dec": "128413", "Unicode hex": "1F59D" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "70", "Dingbat hex": "46", "Unicode dec": "128414", "Unicode hex": "1F59E" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "71", "Dingbat hex": "47", "Unicode dec": "128415", "Unicode hex": "1F59F" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "72", "Dingbat hex": "48", "Unicode dec": "128416", "Unicode hex": "1F5A0" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "73", "Dingbat hex": "49", "Unicode dec": "128417", "Unicode hex": "1F5A1" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "74", "Dingbat hex": "4A", "Unicode dec": "128070", "Unicode hex": "1F446" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "75", "Dingbat hex": "4B", "Unicode dec": "128071", "Unicode hex": "1F447" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "76", "Dingbat hex": "4C", "Unicode dec": "128418", "Unicode hex": "1F5A2" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "77", "Dingbat hex": "4D", "Unicode dec": "128419", "Unicode hex": "1F5A3" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "78", "Dingbat hex": "4E", "Unicode dec": "128401", "Unicode hex": "1F591" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "79", "Dingbat hex": "4F", "Unicode dec": "128500", "Unicode hex": "1F5F4" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "80", "Dingbat hex": "50", "Unicode dec": "128504", "Unicode hex": "1F5F8" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "81", "Dingbat hex": "51", "Unicode dec": "128501", "Unicode hex": "1F5F5" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "82", "Dingbat hex": "52", "Unicode dec": "9745", "Unicode hex": "2611" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "83", "Dingbat hex": "53", "Unicode dec": "11197", "Unicode hex": "2BBD" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "84", "Dingbat hex": "54", "Unicode dec": "9746", "Unicode hex": "2612" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "85", "Dingbat hex": "55", "Unicode dec": "11198", "Unicode hex": "2BBE" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "86", "Dingbat hex": "56", "Unicode dec": "11199", "Unicode hex": "2BBF" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "87", "Dingbat hex": "57", "Unicode dec": "128711", "Unicode hex": "1F6C7" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "88", "Dingbat hex": "58", "Unicode dec": "10680", "Unicode hex": "29B8" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "89", "Dingbat hex": "59", "Unicode dec": "128625", "Unicode hex": "1F671" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "90", "Dingbat hex": "5A", "Unicode dec": "128628", "Unicode hex": "1F674" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "91", "Dingbat hex": "5B", "Unicode dec": "128626", "Unicode hex": "1F672" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "92", "Dingbat hex": "5C", "Unicode dec": "128627", "Unicode hex": "1F673" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "93", "Dingbat hex": "5D", "Unicode dec": "8253", "Unicode hex": "203D" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "94", "Dingbat hex": "5E", "Unicode dec": "128633", "Unicode hex": "1F679" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "95", "Dingbat hex": "5F", "Unicode dec": "128634", "Unicode hex": "1F67A" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "96", "Dingbat hex": "60", "Unicode dec": "128635", "Unicode hex": "1F67B" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "97", "Dingbat hex": "61", "Unicode dec": "128614", "Unicode hex": "1F666" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "98", "Dingbat hex": "62", "Unicode dec": "128612", "Unicode hex": "1F664" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "99", "Dingbat hex": "63", "Unicode dec": "128613", "Unicode hex": "1F665" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "100", "Dingbat hex": "64", "Unicode dec": "128615", "Unicode hex": "1F667" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "101", "Dingbat hex": "65", "Unicode dec": "128602", "Unicode hex": "1F65A" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "102", "Dingbat hex": "66", "Unicode dec": "128600", "Unicode hex": "1F658" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "103", "Dingbat hex": "67", "Unicode dec": "128601", "Unicode hex": "1F659" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "104", "Dingbat hex": "68", "Unicode dec": "128603", "Unicode hex": "1F65B" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "105", "Dingbat hex": "69", "Unicode dec": "9450", "Unicode hex": "24EA" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "106", "Dingbat hex": "6A", "Unicode dec": "9312", "Unicode hex": "2460" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "107", "Dingbat hex": "6B", "Unicode dec": "9313", "Unicode hex": "2461" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "108", "Dingbat hex": "6C", "Unicode dec": "9314", "Unicode hex": "2462" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "109", "Dingbat hex": "6D", "Unicode dec": "9315", "Unicode hex": "2463" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "110", "Dingbat hex": "6E", "Unicode dec": "9316", "Unicode hex": "2464" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "111", "Dingbat hex": "6F", "Unicode dec": "9317", "Unicode hex": "2465" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "112", "Dingbat hex": "70", "Unicode dec": "9318", "Unicode hex": "2466" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "113", "Dingbat hex": "71", "Unicode dec": "9319", "Unicode hex": "2467" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "114", "Dingbat hex": "72", "Unicode dec": "9320", "Unicode hex": "2468" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "115", "Dingbat hex": "73", "Unicode dec": "9321", "Unicode hex": "2469" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "116", "Dingbat hex": "74", "Unicode dec": "9471", "Unicode hex": "24FF" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "117", "Dingbat hex": "75", "Unicode dec": "10102", "Unicode hex": "2776" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "118", "Dingbat hex": "76", "Unicode dec": "10103", "Unicode hex": "2777" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "119", "Dingbat hex": "77", "Unicode dec": "10104", "Unicode hex": "2778" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "120", "Dingbat hex": "78", "Unicode dec": "10105", "Unicode hex": "2779" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "121", "Dingbat hex": "79", "Unicode dec": "10106", "Unicode hex": "277A" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "122", "Dingbat hex": "7A", "Unicode dec": "10107", "Unicode hex": "277B" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "123", "Dingbat hex": "7B", "Unicode dec": "10108", "Unicode hex": "277C" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "124", "Dingbat hex": "7C", "Unicode dec": "10109", "Unicode hex": "277D" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "125", "Dingbat hex": "7D", "Unicode dec": "10110", "Unicode hex": "277E" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "126", "Dingbat hex": "7E", "Unicode dec": "10111", "Unicode hex": "277F" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "128", "Dingbat hex": "80", "Unicode dec": "9737", "Unicode hex": "2609" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "129", "Dingbat hex": "81", "Unicode dec": "127765", "Unicode hex": "1F315" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "130", "Dingbat hex": "82", "Unicode dec": "9789", "Unicode hex": "263D" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "131", "Dingbat hex": "83", "Unicode dec": "9790", "Unicode hex": "263E" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "132", "Dingbat hex": "84", "Unicode dec": "11839", "Unicode hex": "2E3F" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "133", "Dingbat hex": "85", "Unicode dec": "10013", "Unicode hex": "271D" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "134", "Dingbat hex": "86", "Unicode dec": "128327", "Unicode hex": "1F547" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "135", "Dingbat hex": "87", "Unicode dec": "128348", "Unicode hex": "1F55C" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "136", "Dingbat hex": "88", "Unicode dec": "128349", "Unicode hex": "1F55D" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "137", "Dingbat hex": "89", "Unicode dec": "128350", "Unicode hex": "1F55E" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "138", "Dingbat hex": "8A", "Unicode dec": "128351", "Unicode hex": "1F55F" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "139", "Dingbat hex": "8B", "Unicode dec": "128352", "Unicode hex": "1F560" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "140", "Dingbat hex": "8C", "Unicode dec": "128353", "Unicode hex": "1F561" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "141", "Dingbat hex": "8D", "Unicode dec": "128354", "Unicode hex": "1F562" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "142", "Dingbat hex": "8E", "Unicode dec": "128355", "Unicode hex": "1F563" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "143", "Dingbat hex": "8F", "Unicode dec": "128356", "Unicode hex": "1F564" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "144", "Dingbat hex": "90", "Unicode dec": "128357", "Unicode hex": "1F565" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "145", "Dingbat hex": "91", "Unicode dec": "128358", "Unicode hex": "1F566" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "146", "Dingbat hex": "92", "Unicode dec": "128359", "Unicode hex": "1F567" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "147", "Dingbat hex": "93", "Unicode dec": "128616", "Unicode hex": "1F668" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "148", "Dingbat hex": "94", "Unicode dec": "128617", "Unicode hex": "1F669" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "149", "Dingbat hex": "95", "Unicode dec": "8901", "Unicode hex": "22C5" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "150", "Dingbat hex": "96", "Unicode dec": "128900", "Unicode hex": "1F784" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "151", "Dingbat hex": "97", "Unicode dec": "10625", "Unicode hex": "2981" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "152", "Dingbat hex": "98", "Unicode dec": "9679", "Unicode hex": "25CF" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "153", "Dingbat hex": "99", "Unicode dec": "9675", "Unicode hex": "25CB" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "154", "Dingbat hex": "9A", "Unicode dec": "128901", "Unicode hex": "1F785" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "155", "Dingbat hex": "9B", "Unicode dec": "128903", "Unicode hex": "1F787" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "156", "Dingbat hex": "9C", "Unicode dec": "128905", "Unicode hex": "1F789" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "157", "Dingbat hex": "9D", "Unicode dec": "8857", "Unicode hex": "2299" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "158", "Dingbat hex": "9E", "Unicode dec": "10687", "Unicode hex": "29BF" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "159", "Dingbat hex": "9F", "Unicode dec": "128908", "Unicode hex": "1F78C" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "160", "Dingbat hex": "A0", "Unicode dec": "128909", "Unicode hex": "1F78D" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "161", "Dingbat hex": "A1", "Unicode dec": "9726", "Unicode hex": "25FE" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "162", "Dingbat hex": "A2", "Unicode dec": "9632", "Unicode hex": "25A0" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "163", "Dingbat hex": "A3", "Unicode dec": "9633", "Unicode hex": "25A1" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "164", "Dingbat hex": "A4", "Unicode dec": "128913", "Unicode hex": "1F791" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "165", "Dingbat hex": "A5", "Unicode dec": "128914", "Unicode hex": "1F792" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "166", "Dingbat hex": "A6", "Unicode dec": "128915", "Unicode hex": "1F793" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "167", "Dingbat hex": "A7", "Unicode dec": "128916", "Unicode hex": "1F794" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "168", "Dingbat hex": "A8", "Unicode dec": "9635", "Unicode hex": "25A3" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "169", "Dingbat hex": "A9", "Unicode dec": "128917", "Unicode hex": "1F795" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "170", "Dingbat hex": "AA", "Unicode dec": "128918", "Unicode hex": "1F796" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "171", "Dingbat hex": "AB", "Unicode dec": "128919", "Unicode hex": "1F797" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "172", "Dingbat hex": "AC", "Unicode dec": "128920", "Unicode hex": "1F798" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "173", "Dingbat hex": "AD", "Unicode dec": "11049", "Unicode hex": "2B29" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "174", "Dingbat hex": "AE", "Unicode dec": "11045", "Unicode hex": "2B25" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "175", "Dingbat hex": "AF", "Unicode dec": "9671", "Unicode hex": "25C7" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "176", "Dingbat hex": "B0", "Unicode dec": "128922", "Unicode hex": "1F79A" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "177", "Dingbat hex": "B1", "Unicode dec": "9672", "Unicode hex": "25C8" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "178", "Dingbat hex": "B2", "Unicode dec": "128923", "Unicode hex": "1F79B" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "179", "Dingbat hex": "B3", "Unicode dec": "128924", "Unicode hex": "1F79C" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "180", "Dingbat hex": "B4", "Unicode dec": "128925", "Unicode hex": "1F79D" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "181", "Dingbat hex": "B5", "Unicode dec": "128926", "Unicode hex": "1F79E" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "182", "Dingbat hex": "B6", "Unicode dec": "11050", "Unicode hex": "2B2A" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "183", "Dingbat hex": "B7", "Unicode dec": "11047", "Unicode hex": "2B27" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "184", "Dingbat hex": "B8", "Unicode dec": "9674", "Unicode hex": "25CA" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "185", "Dingbat hex": "B9", "Unicode dec": "128928", "Unicode hex": "1F7A0" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "186", "Dingbat hex": "BA", "Unicode dec": "9686", "Unicode hex": "25D6" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "187", "Dingbat hex": "BB", "Unicode dec": "9687", "Unicode hex": "25D7" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "188", "Dingbat hex": "BC", "Unicode dec": "11210", "Unicode hex": "2BCA" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "189", "Dingbat hex": "BD", "Unicode dec": "11211", "Unicode hex": "2BCB" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "190", "Dingbat hex": "BE", "Unicode dec": "11200", "Unicode hex": "2BC0" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "191", "Dingbat hex": "BF", "Unicode dec": "11201", "Unicode hex": "2BC1" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "192", "Dingbat hex": "C0", "Unicode dec": "11039", "Unicode hex": "2B1F" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "193", "Dingbat hex": "C1", "Unicode dec": "11202", "Unicode hex": "2BC2" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "194", "Dingbat hex": "C2", "Unicode dec": "11043", "Unicode hex": "2B23" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "195", "Dingbat hex": "C3", "Unicode dec": "11042", "Unicode hex": "2B22" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "196", "Dingbat hex": "C4", "Unicode dec": "11203", "Unicode hex": "2BC3" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "197", "Dingbat hex": "C5", "Unicode dec": "11204", "Unicode hex": "2BC4" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "198", "Dingbat hex": "C6", "Unicode dec": "128929", "Unicode hex": "1F7A1" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "199", "Dingbat hex": "C7", "Unicode dec": "128930", "Unicode hex": "1F7A2" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "200", "Dingbat hex": "C8", "Unicode dec": "128931", "Unicode hex": "1F7A3" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "201", "Dingbat hex": "C9", "Unicode dec": "128932", "Unicode hex": "1F7A4" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "202", "Dingbat hex": "CA", "Unicode dec": "128933", "Unicode hex": "1F7A5" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "203", "Dingbat hex": "CB", "Unicode dec": "128934", "Unicode hex": "1F7A6" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "204", "Dingbat hex": "CC", "Unicode dec": "128935", "Unicode hex": "1F7A7" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "205", "Dingbat hex": "CD", "Unicode dec": "128936", "Unicode hex": "1F7A8" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "206", "Dingbat hex": "CE", "Unicode dec": "128937", "Unicode hex": "1F7A9" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "207", "Dingbat hex": "CF", "Unicode dec": "128938", "Unicode hex": "1F7AA" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "208", "Dingbat hex": "D0", "Unicode dec": "128939", "Unicode hex": "1F7AB" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "209", "Dingbat hex": "D1", "Unicode dec": "128940", "Unicode hex": "1F7AC" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "210", "Dingbat hex": "D2", "Unicode dec": "128941", "Unicode hex": "1F7AD" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "211", "Dingbat hex": "D3", "Unicode dec": "128942", "Unicode hex": "1F7AE" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "212", "Dingbat hex": "D4", "Unicode dec": "128943", "Unicode hex": "1F7AF" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "213", "Dingbat hex": "D5", "Unicode dec": "128944", "Unicode hex": "1F7B0" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "214", "Dingbat hex": "D6", "Unicode dec": "128945", "Unicode hex": "1F7B1" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "215", "Dingbat hex": "D7", "Unicode dec": "128946", "Unicode hex": "1F7B2" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "216", "Dingbat hex": "D8", "Unicode dec": "128947", "Unicode hex": "1F7B3" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "217", "Dingbat hex": "D9", "Unicode dec": "128948", "Unicode hex": "1F7B4" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "218", "Dingbat hex": "DA", "Unicode dec": "128949", "Unicode hex": "1F7B5" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "219", "Dingbat hex": "DB", "Unicode dec": "128950", "Unicode hex": "1F7B6" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "220", "Dingbat hex": "DC", "Unicode dec": "128951", "Unicode hex": "1F7B7" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "221", "Dingbat hex": "DD", "Unicode dec": "128952", "Unicode hex": "1F7B8" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "222", "Dingbat hex": "DE", "Unicode dec": "128953", "Unicode hex": "1F7B9" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "223", "Dingbat hex": "DF", "Unicode dec": "128954", "Unicode hex": "1F7BA" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "224", "Dingbat hex": "E0", "Unicode dec": "128955", "Unicode hex": "1F7BB" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "225", "Dingbat hex": "E1", "Unicode dec": "128956", "Unicode hex": "1F7BC" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "226", "Dingbat hex": "E2", "Unicode dec": "128957", "Unicode hex": "1F7BD" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "227", "Dingbat hex": "E3", "Unicode dec": "128958", "Unicode hex": "1F7BE" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "228", "Dingbat hex": "E4", "Unicode dec": "128959", "Unicode hex": "1F7BF" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "229", "Dingbat hex": "E5", "Unicode dec": "128960", "Unicode hex": "1F7C0" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "230", "Dingbat hex": "E6", "Unicode dec": "128962", "Unicode hex": "1F7C2" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "231", "Dingbat hex": "E7", "Unicode dec": "128964", "Unicode hex": "1F7C4" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "232", "Dingbat hex": "E8", "Unicode dec": "128966", "Unicode hex": "1F7C6" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "233", "Dingbat hex": "E9", "Unicode dec": "128969", "Unicode hex": "1F7C9" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "234", "Dingbat hex": "EA", "Unicode dec": "128970", "Unicode hex": "1F7CA" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "235", "Dingbat hex": "EB", "Unicode dec": "10038", "Unicode hex": "2736" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "236", "Dingbat hex": "EC", "Unicode dec": "128972", "Unicode hex": "1F7CC" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "237", "Dingbat hex": "ED", "Unicode dec": "128974", "Unicode hex": "1F7CE" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "238", "Dingbat hex": "EE", "Unicode dec": "128976", "Unicode hex": "1F7D0" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "239", "Dingbat hex": "EF", "Unicode dec": "128978", "Unicode hex": "1F7D2" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "240", "Dingbat hex": "F0", "Unicode dec": "10041", "Unicode hex": "2739" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "241", "Dingbat hex": "F1", "Unicode dec": "128963", "Unicode hex": "1F7C3" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "242", "Dingbat hex": "F2", "Unicode dec": "128967", "Unicode hex": "1F7C7" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "243", "Dingbat hex": "F3", "Unicode dec": "10031", "Unicode hex": "272F" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "244", "Dingbat hex": "F4", "Unicode dec": "128973", "Unicode hex": "1F7CD" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "245", "Dingbat hex": "F5", "Unicode dec": "128980", "Unicode hex": "1F7D4" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "246", "Dingbat hex": "F6", "Unicode dec": "11212", "Unicode hex": "2BCC" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "247", "Dingbat hex": "F7", "Unicode dec": "11213", "Unicode hex": "2BCD" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "248", "Dingbat hex": "F8", "Unicode dec": "8251", "Unicode hex": "203B" },
    { "Typeface name": "Wingdings 2", "Dingbat dec": "249", "Dingbat hex": "F9", "Unicode dec": "8258", "Unicode hex": "2042" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "32", "Dingbat hex": "20", "Unicode dec": "32", "Unicode hex": "20" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "33", "Dingbat hex": "21", "Unicode dec": "11104", "Unicode hex": "2B60" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "34", "Dingbat hex": "22", "Unicode dec": "11106", "Unicode hex": "2B62" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "35", "Dingbat hex": "23", "Unicode dec": "11105", "Unicode hex": "2B61" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "36", "Dingbat hex": "24", "Unicode dec": "11107", "Unicode hex": "2B63" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "37", "Dingbat hex": "25", "Unicode dec": "11110", "Unicode hex": "2B66" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "38", "Dingbat hex": "26", "Unicode dec": "11111", "Unicode hex": "2B67" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "39", "Dingbat hex": "27", "Unicode dec": "11113", "Unicode hex": "2B69" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "40", "Dingbat hex": "28", "Unicode dec": "11112", "Unicode hex": "2B68" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "41", "Dingbat hex": "29", "Unicode dec": "11120", "Unicode hex": "2B70" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "42", "Dingbat hex": "2A", "Unicode dec": "11122", "Unicode hex": "2B72" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "43", "Dingbat hex": "2B", "Unicode dec": "11121", "Unicode hex": "2B71" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "44", "Dingbat hex": "2C", "Unicode dec": "11123", "Unicode hex": "2B73" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "45", "Dingbat hex": "2D", "Unicode dec": "11126", "Unicode hex": "2B76" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "46", "Dingbat hex": "2E", "Unicode dec": "11128", "Unicode hex": "2B78" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "47", "Dingbat hex": "2F", "Unicode dec": "11131", "Unicode hex": "2B7B" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "48", "Dingbat hex": "30", "Unicode dec": "11133", "Unicode hex": "2B7D" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "49", "Dingbat hex": "31", "Unicode dec": "11108", "Unicode hex": "2B64" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "50", "Dingbat hex": "32", "Unicode dec": "11109", "Unicode hex": "2B65" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "51", "Dingbat hex": "33", "Unicode dec": "11114", "Unicode hex": "2B6A" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "52", "Dingbat hex": "34", "Unicode dec": "11116", "Unicode hex": "2B6C" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "53", "Dingbat hex": "35", "Unicode dec": "11115", "Unicode hex": "2B6B" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "54", "Dingbat hex": "36", "Unicode dec": "11117", "Unicode hex": "2B6D" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "55", "Dingbat hex": "37", "Unicode dec": "11085", "Unicode hex": "2B4D" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "56", "Dingbat hex": "38", "Unicode dec": "11168", "Unicode hex": "2BA0" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "57", "Dingbat hex": "39", "Unicode dec": "11169", "Unicode hex": "2BA1" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "58", "Dingbat hex": "3A", "Unicode dec": "11170", "Unicode hex": "2BA2" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "59", "Dingbat hex": "3B", "Unicode dec": "11171", "Unicode hex": "2BA3" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "60", "Dingbat hex": "3C", "Unicode dec": "11172", "Unicode hex": "2BA4" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "61", "Dingbat hex": "3D", "Unicode dec": "11173", "Unicode hex": "2BA5" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "62", "Dingbat hex": "3E", "Unicode dec": "11174", "Unicode hex": "2BA6" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "63", "Dingbat hex": "3F", "Unicode dec": "11175", "Unicode hex": "2BA7" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "64", "Dingbat hex": "40", "Unicode dec": "11152", "Unicode hex": "2B90" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "65", "Dingbat hex": "41", "Unicode dec": "11153", "Unicode hex": "2B91" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "66", "Dingbat hex": "42", "Unicode dec": "11154", "Unicode hex": "2B92" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "67", "Dingbat hex": "43", "Unicode dec": "11155", "Unicode hex": "2B93" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "68", "Dingbat hex": "44", "Unicode dec": "11136", "Unicode hex": "2B80" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "69", "Dingbat hex": "45", "Unicode dec": "11139", "Unicode hex": "2B83" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "70", "Dingbat hex": "46", "Unicode dec": "11134", "Unicode hex": "2B7E" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "71", "Dingbat hex": "47", "Unicode dec": "11135", "Unicode hex": "2B7F" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "72", "Dingbat hex": "48", "Unicode dec": "11140", "Unicode hex": "2B84" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "73", "Dingbat hex": "49", "Unicode dec": "11142", "Unicode hex": "2B86" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "74", "Dingbat hex": "4A", "Unicode dec": "11141", "Unicode hex": "2B85" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "75", "Dingbat hex": "4B", "Unicode dec": "11143", "Unicode hex": "2B87" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "76", "Dingbat hex": "4C", "Unicode dec": "11151", "Unicode hex": "2B8F" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "77", "Dingbat hex": "4D", "Unicode dec": "11149", "Unicode hex": "2B8D" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "78", "Dingbat hex": "4E", "Unicode dec": "11150", "Unicode hex": "2B8E" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "79", "Dingbat hex": "4F", "Unicode dec": "11148", "Unicode hex": "2B8C" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "80", "Dingbat hex": "50", "Unicode dec": "11118", "Unicode hex": "2B6E" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "81", "Dingbat hex": "51", "Unicode dec": "11119", "Unicode hex": "2B6F" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "82", "Dingbat hex": "52", "Unicode dec": "9099", "Unicode hex": "238B" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "83", "Dingbat hex": "53", "Unicode dec": "8996", "Unicode hex": "2324" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "84", "Dingbat hex": "54", "Unicode dec": "8963", "Unicode hex": "2303" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "85", "Dingbat hex": "55", "Unicode dec": "8997", "Unicode hex": "2325" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "86", "Dingbat hex": "56", "Unicode dec": "9251", "Unicode hex": "2423" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "87", "Dingbat hex": "57", "Unicode dec": "9085", "Unicode hex": "237D" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "88", "Dingbat hex": "58", "Unicode dec": "8682", "Unicode hex": "21EA" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "89", "Dingbat hex": "59", "Unicode dec": "11192", "Unicode hex": "2BB8" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "90", "Dingbat hex": "5A", "Unicode dec": "129184", "Unicode hex": "1F8A0" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "91", "Dingbat hex": "5B", "Unicode dec": "129185", "Unicode hex": "1F8A1" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "92", "Dingbat hex": "5C", "Unicode dec": "129186", "Unicode hex": "1F8A2" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "93", "Dingbat hex": "5D", "Unicode dec": "129187", "Unicode hex": "1F8A3" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "94", "Dingbat hex": "5E", "Unicode dec": "129188", "Unicode hex": "1F8A4" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "95", "Dingbat hex": "5F", "Unicode dec": "129189", "Unicode hex": "1F8A5" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "96", "Dingbat hex": "60", "Unicode dec": "129190", "Unicode hex": "1F8A6" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "97", "Dingbat hex": "61", "Unicode dec": "129191", "Unicode hex": "1F8A7" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "98", "Dingbat hex": "62", "Unicode dec": "129192", "Unicode hex": "1F8A8" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "99", "Dingbat hex": "63", "Unicode dec": "129193", "Unicode hex": "1F8A9" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "100", "Dingbat hex": "64", "Unicode dec": "129194", "Unicode hex": "1F8AA" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "101", "Dingbat hex": "65", "Unicode dec": "129195", "Unicode hex": "1F8AB" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "102", "Dingbat hex": "66", "Unicode dec": "129104", "Unicode hex": "1F850" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "103", "Dingbat hex": "67", "Unicode dec": "129106", "Unicode hex": "1F852" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "104", "Dingbat hex": "68", "Unicode dec": "129105", "Unicode hex": "1F851" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "105", "Dingbat hex": "69", "Unicode dec": "129107", "Unicode hex": "1F853" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "106", "Dingbat hex": "6A", "Unicode dec": "129108", "Unicode hex": "1F854" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "107", "Dingbat hex": "6B", "Unicode dec": "129109", "Unicode hex": "1F855" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "108", "Dingbat hex": "6C", "Unicode dec": "129111", "Unicode hex": "1F857" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "109", "Dingbat hex": "6D", "Unicode dec": "129110", "Unicode hex": "1F856" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "110", "Dingbat hex": "6E", "Unicode dec": "129112", "Unicode hex": "1F858" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "111", "Dingbat hex": "6F", "Unicode dec": "129113", "Unicode hex": "1F859" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "112", "Dingbat hex": "70", "Unicode dec": "9650", "Unicode hex": "25B2" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "113", "Dingbat hex": "71", "Unicode dec": "9660", "Unicode hex": "25BC" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "114", "Dingbat hex": "72", "Unicode dec": "9651", "Unicode hex": "25B3" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "115", "Dingbat hex": "73", "Unicode dec": "9661", "Unicode hex": "25BD" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "116", "Dingbat hex": "74", "Unicode dec": "9664", "Unicode hex": "25C0" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "117", "Dingbat hex": "75", "Unicode dec": "9654", "Unicode hex": "25B6" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "118", "Dingbat hex": "76", "Unicode dec": "9665", "Unicode hex": "25C1" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "119", "Dingbat hex": "77", "Unicode dec": "9655", "Unicode hex": "25B7" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "120", "Dingbat hex": "78", "Unicode dec": "9699", "Unicode hex": "25E3" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "121", "Dingbat hex": "79", "Unicode dec": "9698", "Unicode hex": "25E2" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "122", "Dingbat hex": "7A", "Unicode dec": "9700", "Unicode hex": "25E4" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "123", "Dingbat hex": "7B", "Unicode dec": "9701", "Unicode hex": "25E5" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "124", "Dingbat hex": "7C", "Unicode dec": "128896", "Unicode hex": "1F780" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "125", "Dingbat hex": "7D", "Unicode dec": "128898", "Unicode hex": "1F782" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "126", "Dingbat hex": "7E", "Unicode dec": "128897", "Unicode hex": "1F781" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "128", "Dingbat hex": "80", "Unicode dec": "128899", "Unicode hex": "1F783" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "129", "Dingbat hex": "81", "Unicode dec": "11205", "Unicode hex": "2BC5" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "130", "Dingbat hex": "82", "Unicode dec": "11206", "Unicode hex": "2BC6" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "131", "Dingbat hex": "83", "Unicode dec": "11207", "Unicode hex": "2BC7" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "132", "Dingbat hex": "84", "Unicode dec": "11208", "Unicode hex": "2BC8" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "133", "Dingbat hex": "85", "Unicode dec": "11164", "Unicode hex": "2B9C" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "134", "Dingbat hex": "86", "Unicode dec": "11166", "Unicode hex": "2B9E" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "135", "Dingbat hex": "87", "Unicode dec": "11165", "Unicode hex": "2B9D" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "136", "Dingbat hex": "88", "Unicode dec": "11167", "Unicode hex": "2B9F" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "137", "Dingbat hex": "89", "Unicode dec": "129040", "Unicode hex": "1F810" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "138", "Dingbat hex": "8A", "Unicode dec": "129042", "Unicode hex": "1F812" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "139", "Dingbat hex": "8B", "Unicode dec": "129041", "Unicode hex": "1F811" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "140", "Dingbat hex": "8C", "Unicode dec": "129043", "Unicode hex": "1F813" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "141", "Dingbat hex": "8D", "Unicode dec": "129044", "Unicode hex": "1F814" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "142", "Dingbat hex": "8E", "Unicode dec": "129046", "Unicode hex": "1F816" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "143", "Dingbat hex": "8F", "Unicode dec": "129045", "Unicode hex": "1F815" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "144", "Dingbat hex": "90", "Unicode dec": "129047", "Unicode hex": "1F817" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "145", "Dingbat hex": "91", "Unicode dec": "129048", "Unicode hex": "1F818" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "146", "Dingbat hex": "92", "Unicode dec": "129050", "Unicode hex": "1F81A" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "147", "Dingbat hex": "93", "Unicode dec": "129049", "Unicode hex": "1F819" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "148", "Dingbat hex": "94", "Unicode dec": "129051", "Unicode hex": "1F81B" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "149", "Dingbat hex": "95", "Unicode dec": "129052", "Unicode hex": "1F81C" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "150", "Dingbat hex": "96", "Unicode dec": "129054", "Unicode hex": "1F81E" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "151", "Dingbat hex": "97", "Unicode dec": "129053", "Unicode hex": "1F81D" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "152", "Dingbat hex": "98", "Unicode dec": "129055", "Unicode hex": "1F81F" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "153", "Dingbat hex": "99", "Unicode dec": "129024", "Unicode hex": "1F800" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "154", "Dingbat hex": "9A", "Unicode dec": "129026", "Unicode hex": "1F802" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "155", "Dingbat hex": "9B", "Unicode dec": "129025", "Unicode hex": "1F801" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "156", "Dingbat hex": "9C", "Unicode dec": "129027", "Unicode hex": "1F803" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "157", "Dingbat hex": "9D", "Unicode dec": "129028", "Unicode hex": "1F804" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "158", "Dingbat hex": "9E", "Unicode dec": "129030", "Unicode hex": "1F806" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "159", "Dingbat hex": "9F", "Unicode dec": "129029", "Unicode hex": "1F805" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "160", "Dingbat hex": "A0", "Unicode dec": "129031", "Unicode hex": "1F807" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "161", "Dingbat hex": "A1", "Unicode dec": "129032", "Unicode hex": "1F808" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "162", "Dingbat hex": "A2", "Unicode dec": "129034", "Unicode hex": "1F80A" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "163", "Dingbat hex": "A3", "Unicode dec": "129033", "Unicode hex": "1F809" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "164", "Dingbat hex": "A4", "Unicode dec": "129035", "Unicode hex": "1F80B" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "165", "Dingbat hex": "A5", "Unicode dec": "129056", "Unicode hex": "1F820" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "166", "Dingbat hex": "A6", "Unicode dec": "129058", "Unicode hex": "1F822" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "167", "Dingbat hex": "A7", "Unicode dec": "129060", "Unicode hex": "1F824" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "168", "Dingbat hex": "A8", "Unicode dec": "129062", "Unicode hex": "1F826" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "169", "Dingbat hex": "A9", "Unicode dec": "129064", "Unicode hex": "1F828" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "170", "Dingbat hex": "AA", "Unicode dec": "129066", "Unicode hex": "1F82A" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "171", "Dingbat hex": "AB", "Unicode dec": "129068", "Unicode hex": "1F82C" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "172", "Dingbat hex": "AC", "Unicode dec": "129180", "Unicode hex": "1F89C" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "173", "Dingbat hex": "AD", "Unicode dec": "129181", "Unicode hex": "1F89D" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "174", "Dingbat hex": "AE", "Unicode dec": "129182", "Unicode hex": "1F89E" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "175", "Dingbat hex": "AF", "Unicode dec": "129183", "Unicode hex": "1F89F" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "176", "Dingbat hex": "B0", "Unicode dec": "129070", "Unicode hex": "1F82E" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "177", "Dingbat hex": "B1", "Unicode dec": "129072", "Unicode hex": "1F830" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "178", "Dingbat hex": "B2", "Unicode dec": "129074", "Unicode hex": "1F832" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "179", "Dingbat hex": "B3", "Unicode dec": "129076", "Unicode hex": "1F834" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "180", "Dingbat hex": "B4", "Unicode dec": "129078", "Unicode hex": "1F836" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "181", "Dingbat hex": "B5", "Unicode dec": "129080", "Unicode hex": "1F838" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "182", "Dingbat hex": "B6", "Unicode dec": "129082", "Unicode hex": "1F83A" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "183", "Dingbat hex": "B7", "Unicode dec": "129081", "Unicode hex": "1F839" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "184", "Dingbat hex": "B8", "Unicode dec": "129083", "Unicode hex": "1F83B" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "185", "Dingbat hex": "B9", "Unicode dec": "129176", "Unicode hex": "1F898" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "186", "Dingbat hex": "BA", "Unicode dec": "129178", "Unicode hex": "1F89A" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "187", "Dingbat hex": "BB", "Unicode dec": "129177", "Unicode hex": "1F899" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "188", "Dingbat hex": "BC", "Unicode dec": "129179", "Unicode hex": "1F89B" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "189", "Dingbat hex": "BD", "Unicode dec": "129084", "Unicode hex": "1F83C" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "190", "Dingbat hex": "BE", "Unicode dec": "129086", "Unicode hex": "1F83E" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "191", "Dingbat hex": "BF", "Unicode dec": "129085", "Unicode hex": "1F83D" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "192", "Dingbat hex": "C0", "Unicode dec": "129087", "Unicode hex": "1F83F" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "193", "Dingbat hex": "C1", "Unicode dec": "129088", "Unicode hex": "1F840" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "194", "Dingbat hex": "C2", "Unicode dec": "129090", "Unicode hex": "1F842" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "195", "Dingbat hex": "C3", "Unicode dec": "129089", "Unicode hex": "1F841" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "196", "Dingbat hex": "C4", "Unicode dec": "129091", "Unicode hex": "1F843" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "197", "Dingbat hex": "C5", "Unicode dec": "129092", "Unicode hex": "1F844" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "198", "Dingbat hex": "C6", "Unicode dec": "129094", "Unicode hex": "1F846" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "199", "Dingbat hex": "C7", "Unicode dec": "129093", "Unicode hex": "1F845" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "200", "Dingbat hex": "C8", "Unicode dec": "129095", "Unicode hex": "1F847" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "201", "Dingbat hex": "C9", "Unicode dec": "11176", "Unicode hex": "2BA8" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "202", "Dingbat hex": "CA", "Unicode dec": "11177", "Unicode hex": "2BA9" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "203", "Dingbat hex": "CB", "Unicode dec": "11178", "Unicode hex": "2BAA" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "204", "Dingbat hex": "CC", "Unicode dec": "11179", "Unicode hex": "2BAB" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "205", "Dingbat hex": "CD", "Unicode dec": "11180", "Unicode hex": "2BAC" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "206", "Dingbat hex": "CE", "Unicode dec": "11181", "Unicode hex": "2BAD" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "207", "Dingbat hex": "CF", "Unicode dec": "11182", "Unicode hex": "2BAE" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "208", "Dingbat hex": "D0", "Unicode dec": "11183", "Unicode hex": "2BAF" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "209", "Dingbat hex": "D1", "Unicode dec": "129120", "Unicode hex": "1F860" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "210", "Dingbat hex": "D2", "Unicode dec": "129122", "Unicode hex": "1F862" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "211", "Dingbat hex": "D3", "Unicode dec": "129121", "Unicode hex": "1F861" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "212", "Dingbat hex": "D4", "Unicode dec": "129123", "Unicode hex": "1F863" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "213", "Dingbat hex": "D5", "Unicode dec": "129124", "Unicode hex": "1F864" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "214", "Dingbat hex": "D6", "Unicode dec": "129125", "Unicode hex": "1F865" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "215", "Dingbat hex": "D7", "Unicode dec": "129127", "Unicode hex": "1F867" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "216", "Dingbat hex": "D8", "Unicode dec": "129126", "Unicode hex": "1F866" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "217", "Dingbat hex": "D9", "Unicode dec": "129136", "Unicode hex": "1F870" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "218", "Dingbat hex": "DA", "Unicode dec": "129138", "Unicode hex": "1F872" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "219", "Dingbat hex": "DB", "Unicode dec": "129137", "Unicode hex": "1F871" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "220", "Dingbat hex": "DC", "Unicode dec": "129139", "Unicode hex": "1F873" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "221", "Dingbat hex": "DD", "Unicode dec": "129140", "Unicode hex": "1F874" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "222", "Dingbat hex": "DE", "Unicode dec": "129141", "Unicode hex": "1F875" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "223", "Dingbat hex": "DF", "Unicode dec": "129143", "Unicode hex": "1F877" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "224", "Dingbat hex": "E0", "Unicode dec": "129142", "Unicode hex": "1F876" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "225", "Dingbat hex": "E1", "Unicode dec": "129152", "Unicode hex": "1F880" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "226", "Dingbat hex": "E2", "Unicode dec": "129154", "Unicode hex": "1F882" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "227", "Dingbat hex": "E3", "Unicode dec": "129153", "Unicode hex": "1F881" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "228", "Dingbat hex": "E4", "Unicode dec": "129155", "Unicode hex": "1F883" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "229", "Dingbat hex": "E5", "Unicode dec": "129156", "Unicode hex": "1F884" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "230", "Dingbat hex": "E6", "Unicode dec": "129157", "Unicode hex": "1F885" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "231", "Dingbat hex": "E7", "Unicode dec": "129159", "Unicode hex": "1F887" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "232", "Dingbat hex": "E8", "Unicode dec": "129158", "Unicode hex": "1F886" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "233", "Dingbat hex": "E9", "Unicode dec": "129168", "Unicode hex": "1F890" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "234", "Dingbat hex": "EA", "Unicode dec": "129170", "Unicode hex": "1F892" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "235", "Dingbat hex": "EB", "Unicode dec": "129169", "Unicode hex": "1F891" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "236", "Dingbat hex": "EC", "Unicode dec": "129171", "Unicode hex": "1F893" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "237", "Dingbat hex": "ED", "Unicode dec": "129172", "Unicode hex": "1F894" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "238", "Dingbat hex": "EE", "Unicode dec": "129174", "Unicode hex": "1F896" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "239", "Dingbat hex": "EF", "Unicode dec": "129173", "Unicode hex": "1F895" },
    { "Typeface name": "Wingdings 3", "Dingbat dec": "240", "Dingbat hex": "F0", "Unicode dec": "129175", "Unicode hex": "1F897" },
];
exports.default = dingbats;

},{}],85:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hex = exports.dec = exports.codePoint = void 0;
var dingbats_1 = __importDefault(require("./dingbats"));
var dingbatsByCodePoint = {};
var fromCodePoint = String.fromCodePoint ? String.fromCodePoint : fromCodePointPolyfill;
for (var _i = 0, dingbats_2 = dingbats_1.default; _i < dingbats_2.length; _i++) {
    var dingbat = dingbats_2[_i];
    var codePoint_1 = parseInt(dingbat["Unicode dec"], 10);
    var scalarValue = {
        codePoint: codePoint_1,
        string: fromCodePoint(codePoint_1),
    };
    dingbatsByCodePoint[dingbat["Typeface name"].toUpperCase() + "_" + dingbat["Dingbat dec"]] = scalarValue;
}
function codePoint(typeface, codePoint) {
    return dingbatsByCodePoint[typeface.toUpperCase() + "_" + codePoint];
}
exports.codePoint = codePoint;
function dec(typeface, dec) {
    return codePoint(typeface, parseInt(dec, 10));
}
exports.dec = dec;
function hex(typeface, hex) {
    return codePoint(typeface, parseInt(hex, 16));
}
exports.hex = hex;
function fromCodePointPolyfill(codePoint) {
    if (codePoint <= 0xFFFF) {
        // BMP
        return String.fromCharCode(codePoint);
    }
    else {
        // Astral
        // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var highSurrogate = Math.floor((codePoint - 0x10000) / 0x400) + 0xD800;
        var lowSurrogate = (codePoint - 0x10000) % 0x400 + 0xDC00;
        return String.fromCharCode(highSurrogate, lowSurrogate);
    }
}
;

},{"./dingbats":84}],86:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],87:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],88:[function(require,module,exports){
(function (global,Buffer){
/*!

JSZip v3.7.1 - A JavaScript class for generating and reading zip files
<http://stuartk.com/jszip>

(c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/master/LICENSE.markdown.

JSZip uses the library pako released under the MIT license :
https://github.com/nodeca/pako/blob/master/LICENSE
*/

!function(t){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=t();else if("function"==typeof define&&define.amd)define([],t);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).JSZip=t()}}(function(){return function s(a,o,h){function u(r,t){if(!o[r]){if(!a[r]){var e="function"==typeof require&&require;if(!t&&e)return e(r,!0);if(l)return l(r,!0);var i=new Error("Cannot find module '"+r+"'");throw i.code="MODULE_NOT_FOUND",i}var n=o[r]={exports:{}};a[r][0].call(n.exports,function(t){var e=a[r][1][t];return u(e||t)},n,n.exports,s,a,o,h)}return o[r].exports}for(var l="function"==typeof require&&require,t=0;t<h.length;t++)u(h[t]);return u}({1:[function(t,e,r){"use strict";var c=t("./utils"),d=t("./support"),p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";r.encode=function(t){for(var e,r,i,n,s,a,o,h=[],u=0,l=t.length,f=l,d="string"!==c.getTypeOf(t);u<t.length;)f=l-u,i=d?(e=t[u++],r=u<l?t[u++]:0,u<l?t[u++]:0):(e=t.charCodeAt(u++),r=u<l?t.charCodeAt(u++):0,u<l?t.charCodeAt(u++):0),n=e>>2,s=(3&e)<<4|r>>4,a=1<f?(15&r)<<2|i>>6:64,o=2<f?63&i:64,h.push(p.charAt(n)+p.charAt(s)+p.charAt(a)+p.charAt(o));return h.join("")},r.decode=function(t){var e,r,i,n,s,a,o=0,h=0,u="data:";if(t.substr(0,u.length)===u)throw new Error("Invalid base64 input, it looks like a data url.");var l,f=3*(t=t.replace(/[^A-Za-z0-9\+\/\=]/g,"")).length/4;if(t.charAt(t.length-1)===p.charAt(64)&&f--,t.charAt(t.length-2)===p.charAt(64)&&f--,f%1!=0)throw new Error("Invalid base64 input, bad content length.");for(l=d.uint8array?new Uint8Array(0|f):new Array(0|f);o<t.length;)e=p.indexOf(t.charAt(o++))<<2|(n=p.indexOf(t.charAt(o++)))>>4,r=(15&n)<<4|(s=p.indexOf(t.charAt(o++)))>>2,i=(3&s)<<6|(a=p.indexOf(t.charAt(o++))),l[h++]=e,64!==s&&(l[h++]=r),64!==a&&(l[h++]=i);return l}},{"./support":30,"./utils":32}],2:[function(t,e,r){"use strict";var i=t("./external"),n=t("./stream/DataWorker"),s=t("./stream/Crc32Probe"),a=t("./stream/DataLengthProbe");function o(t,e,r,i,n){this.compressedSize=t,this.uncompressedSize=e,this.crc32=r,this.compression=i,this.compressedContent=n}o.prototype={getContentWorker:function(){var t=new n(i.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")),e=this;return t.on("end",function(){if(this.streamInfo.data_length!==e.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")}),t},getCompressedWorker:function(){return new n(i.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},o.createWorkerFrom=function(t,e,r){return t.pipe(new s).pipe(new a("uncompressedSize")).pipe(e.compressWorker(r)).pipe(new a("compressedSize")).withStreamInfo("compression",e)},e.exports=o},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(t,e,r){"use strict";var i=t("./stream/GenericWorker");r.STORE={magic:"\0\0",compressWorker:function(t){return new i("STORE compression")},uncompressWorker:function(){return new i("STORE decompression")}},r.DEFLATE=t("./flate")},{"./flate":7,"./stream/GenericWorker":28}],4:[function(t,e,r){"use strict";var i=t("./utils");var o=function(){for(var t,e=[],r=0;r<256;r++){t=r;for(var i=0;i<8;i++)t=1&t?3988292384^t>>>1:t>>>1;e[r]=t}return e}();e.exports=function(t,e){return void 0!==t&&t.length?"string"!==i.getTypeOf(t)?function(t,e,r,i){var n=o,s=i+r;t^=-1;for(var a=i;a<s;a++)t=t>>>8^n[255&(t^e[a])];return-1^t}(0|e,t,t.length,0):function(t,e,r,i){var n=o,s=i+r;t^=-1;for(var a=i;a<s;a++)t=t>>>8^n[255&(t^e.charCodeAt(a))];return-1^t}(0|e,t,t.length,0):0}},{"./utils":32}],5:[function(t,e,r){"use strict";r.base64=!1,r.binary=!1,r.dir=!1,r.createFolders=!0,r.date=null,r.compression=null,r.compressionOptions=null,r.comment=null,r.unixPermissions=null,r.dosPermissions=null},{}],6:[function(t,e,r){"use strict";var i=null;i="undefined"!=typeof Promise?Promise:t("lie"),e.exports={Promise:i}},{lie:37}],7:[function(t,e,r){"use strict";var i="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Uint32Array,n=t("pako"),s=t("./utils"),a=t("./stream/GenericWorker"),o=i?"uint8array":"array";function h(t,e){a.call(this,"FlateWorker/"+t),this._pako=null,this._pakoAction=t,this._pakoOptions=e,this.meta={}}r.magic="\b\0",s.inherits(h,a),h.prototype.processChunk=function(t){this.meta=t.meta,null===this._pako&&this._createPako(),this._pako.push(s.transformTo(o,t.data),!1)},h.prototype.flush=function(){a.prototype.flush.call(this),null===this._pako&&this._createPako(),this._pako.push([],!0)},h.prototype.cleanUp=function(){a.prototype.cleanUp.call(this),this._pako=null},h.prototype._createPako=function(){this._pako=new n[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var e=this;this._pako.onData=function(t){e.push({data:t,meta:e.meta})}},r.compressWorker=function(t){return new h("Deflate",t)},r.uncompressWorker=function(){return new h("Inflate",{})}},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(t,e,r){"use strict";function A(t,e){var r,i="";for(r=0;r<e;r++)i+=String.fromCharCode(255&t),t>>>=8;return i}function i(t,e,r,i,n,s){var a,o,h=t.file,u=t.compression,l=s!==O.utf8encode,f=I.transformTo("string",s(h.name)),d=I.transformTo("string",O.utf8encode(h.name)),c=h.comment,p=I.transformTo("string",s(c)),m=I.transformTo("string",O.utf8encode(c)),_=d.length!==h.name.length,g=m.length!==c.length,b="",v="",y="",w=h.dir,k=h.date,x={crc32:0,compressedSize:0,uncompressedSize:0};e&&!r||(x.crc32=t.crc32,x.compressedSize=t.compressedSize,x.uncompressedSize=t.uncompressedSize);var S=0;e&&(S|=8),l||!_&&!g||(S|=2048);var z=0,C=0;w&&(z|=16),"UNIX"===n?(C=798,z|=function(t,e){var r=t;return t||(r=e?16893:33204),(65535&r)<<16}(h.unixPermissions,w)):(C=20,z|=function(t){return 63&(t||0)}(h.dosPermissions)),a=k.getUTCHours(),a<<=6,a|=k.getUTCMinutes(),a<<=5,a|=k.getUTCSeconds()/2,o=k.getUTCFullYear()-1980,o<<=4,o|=k.getUTCMonth()+1,o<<=5,o|=k.getUTCDate(),_&&(v=A(1,1)+A(B(f),4)+d,b+="up"+A(v.length,2)+v),g&&(y=A(1,1)+A(B(p),4)+m,b+="uc"+A(y.length,2)+y);var E="";return E+="\n\0",E+=A(S,2),E+=u.magic,E+=A(a,2),E+=A(o,2),E+=A(x.crc32,4),E+=A(x.compressedSize,4),E+=A(x.uncompressedSize,4),E+=A(f.length,2),E+=A(b.length,2),{fileRecord:R.LOCAL_FILE_HEADER+E+f+b,dirRecord:R.CENTRAL_FILE_HEADER+A(C,2)+E+A(p.length,2)+"\0\0\0\0"+A(z,4)+A(i,4)+f+b+p}}var I=t("../utils"),n=t("../stream/GenericWorker"),O=t("../utf8"),B=t("../crc32"),R=t("../signature");function s(t,e,r,i){n.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=e,this.zipPlatform=r,this.encodeFileName=i,this.streamFiles=t,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}I.inherits(s,n),s.prototype.push=function(t){var e=t.meta.percent||0,r=this.entriesCount,i=this._sources.length;this.accumulate?this.contentBuffer.push(t):(this.bytesWritten+=t.data.length,n.prototype.push.call(this,{data:t.data,meta:{currentFile:this.currentFile,percent:r?(e+100*(r-i-1))/r:100}}))},s.prototype.openedSource=function(t){this.currentSourceOffset=this.bytesWritten,this.currentFile=t.file.name;var e=this.streamFiles&&!t.file.dir;if(e){var r=i(t,e,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:r.fileRecord,meta:{percent:0}})}else this.accumulate=!0},s.prototype.closedSource=function(t){this.accumulate=!1;var e=this.streamFiles&&!t.file.dir,r=i(t,e,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(r.dirRecord),e)this.push({data:function(t){return R.DATA_DESCRIPTOR+A(t.crc32,4)+A(t.compressedSize,4)+A(t.uncompressedSize,4)}(t),meta:{percent:100}});else for(this.push({data:r.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},s.prototype.flush=function(){for(var t=this.bytesWritten,e=0;e<this.dirRecords.length;e++)this.push({data:this.dirRecords[e],meta:{percent:100}});var r=this.bytesWritten-t,i=function(t,e,r,i,n){var s=I.transformTo("string",n(i));return R.CENTRAL_DIRECTORY_END+"\0\0\0\0"+A(t,2)+A(t,2)+A(e,4)+A(r,4)+A(s.length,2)+s}(this.dirRecords.length,r,t,this.zipComment,this.encodeFileName);this.push({data:i,meta:{percent:100}})},s.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume()},s.prototype.registerPrevious=function(t){this._sources.push(t);var e=this;return t.on("data",function(t){e.processChunk(t)}),t.on("end",function(){e.closedSource(e.previous.streamInfo),e._sources.length?e.prepareNextSource():e.end()}),t.on("error",function(t){e.error(t)}),this},s.prototype.resume=function(){return!!n.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0))},s.prototype.error=function(t){var e=this._sources;if(!n.prototype.error.call(this,t))return!1;for(var r=0;r<e.length;r++)try{e[r].error(t)}catch(t){}return!0},s.prototype.lock=function(){n.prototype.lock.call(this);for(var t=this._sources,e=0;e<t.length;e++)t[e].lock()},e.exports=s},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(t,e,r){"use strict";var u=t("../compressions"),i=t("./ZipFileWorker");r.generateWorker=function(t,a,e){var o=new i(a.streamFiles,e,a.platform,a.encodeFileName),h=0;try{t.forEach(function(t,e){h++;var r=function(t,e){var r=t||e,i=u[r];if(!i)throw new Error(r+" is not a valid compression method !");return i}(e.options.compression,a.compression),i=e.options.compressionOptions||a.compressionOptions||{},n=e.dir,s=e.date;e._compressWorker(r,i).withStreamInfo("file",{name:t,dir:n,date:s,comment:e.comment||"",unixPermissions:e.unixPermissions,dosPermissions:e.dosPermissions}).pipe(o)}),o.entriesCount=h}catch(t){o.error(t)}return o}},{"../compressions":3,"./ZipFileWorker":8}],10:[function(t,e,r){"use strict";function i(){if(!(this instanceof i))return new i;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files=Object.create(null),this.comment=null,this.root="",this.clone=function(){var t=new i;for(var e in this)"function"!=typeof this[e]&&(t[e]=this[e]);return t}}(i.prototype=t("./object")).loadAsync=t("./load"),i.support=t("./support"),i.defaults=t("./defaults"),i.version="3.7.1",i.loadAsync=function(t,e){return(new i).loadAsync(t,e)},i.external=t("./external"),e.exports=i},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(t,e,r){"use strict";var i=t("./utils"),n=t("./external"),o=t("./utf8"),h=t("./zipEntries"),s=t("./stream/Crc32Probe"),u=t("./nodejsUtils");function l(i){return new n.Promise(function(t,e){var r=i.decompressed.getContentWorker().pipe(new s);r.on("error",function(t){e(t)}).on("end",function(){r.streamInfo.crc32!==i.decompressed.crc32?e(new Error("Corrupted zip : CRC32 mismatch")):t()}).resume()})}e.exports=function(t,s){var a=this;return s=i.extend(s||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:o.utf8decode}),u.isNode&&u.isStream(t)?n.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):i.prepareContent("the loaded zip file",t,!0,s.optimizedBinaryString,s.base64).then(function(t){var e=new h(s);return e.load(t),e}).then(function(t){var e=[n.Promise.resolve(t)],r=t.files;if(s.checkCRC32)for(var i=0;i<r.length;i++)e.push(l(r[i]));return n.Promise.all(e)}).then(function(t){for(var e=t.shift(),r=e.files,i=0;i<r.length;i++){var n=r[i];a.file(n.fileNameStr,n.decompressed,{binary:!0,optimizedBinaryString:!0,date:n.date,dir:n.dir,comment:n.fileCommentStr.length?n.fileCommentStr:null,unixPermissions:n.unixPermissions,dosPermissions:n.dosPermissions,createFolders:s.createFolders})}return e.zipComment.length&&(a.comment=e.zipComment),a})}},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(t,e,r){"use strict";var i=t("../utils"),n=t("../stream/GenericWorker");function s(t,e){n.call(this,"Nodejs stream input adapter for "+t),this._upstreamEnded=!1,this._bindStream(e)}i.inherits(s,n),s.prototype._bindStream=function(t){var e=this;(this._stream=t).pause(),t.on("data",function(t){e.push({data:t,meta:{percent:0}})}).on("error",function(t){e.isPaused?this.generatedError=t:e.error(t)}).on("end",function(){e.isPaused?e._upstreamEnded=!0:e.end()})},s.prototype.pause=function(){return!!n.prototype.pause.call(this)&&(this._stream.pause(),!0)},s.prototype.resume=function(){return!!n.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},e.exports=s},{"../stream/GenericWorker":28,"../utils":32}],13:[function(t,e,r){"use strict";var n=t("readable-stream").Readable;function i(t,e,r){n.call(this,e),this._helper=t;var i=this;t.on("data",function(t,e){i.push(t)||i._helper.pause(),r&&r(e)}).on("error",function(t){i.emit("error",t)}).on("end",function(){i.push(null)})}t("../utils").inherits(i,n),i.prototype._read=function(){this._helper.resume()},e.exports=i},{"../utils":32,"readable-stream":16}],14:[function(t,e,r){"use strict";e.exports={isNode:"undefined"!=typeof Buffer,newBufferFrom:function(t,e){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(t,e);if("number"==typeof t)throw new Error('The "data" argument must not be a number');return new Buffer(t,e)},allocBuffer:function(t){if(Buffer.alloc)return Buffer.alloc(t);var e=new Buffer(t);return e.fill(0),e},isBuffer:function(t){return Buffer.isBuffer(t)},isStream:function(t){return t&&"function"==typeof t.on&&"function"==typeof t.pause&&"function"==typeof t.resume}}},{}],15:[function(t,e,r){"use strict";function s(t,e,r){var i,n=u.getTypeOf(e),s=u.extend(r||{},f);s.date=s.date||new Date,null!==s.compression&&(s.compression=s.compression.toUpperCase()),"string"==typeof s.unixPermissions&&(s.unixPermissions=parseInt(s.unixPermissions,8)),s.unixPermissions&&16384&s.unixPermissions&&(s.dir=!0),s.dosPermissions&&16&s.dosPermissions&&(s.dir=!0),s.dir&&(t=g(t)),s.createFolders&&(i=_(t))&&b.call(this,i,!0);var a="string"===n&&!1===s.binary&&!1===s.base64;r&&void 0!==r.binary||(s.binary=!a),(e instanceof d&&0===e.uncompressedSize||s.dir||!e||0===e.length)&&(s.base64=!1,s.binary=!0,e="",s.compression="STORE",n="string");var o=null;o=e instanceof d||e instanceof l?e:p.isNode&&p.isStream(e)?new m(t,e):u.prepareContent(t,e,s.binary,s.optimizedBinaryString,s.base64);var h=new c(t,o,s);this.files[t]=h}var n=t("./utf8"),u=t("./utils"),l=t("./stream/GenericWorker"),a=t("./stream/StreamHelper"),f=t("./defaults"),d=t("./compressedObject"),c=t("./zipObject"),o=t("./generate"),p=t("./nodejsUtils"),m=t("./nodejs/NodejsStreamInputAdapter"),_=function(t){"/"===t.slice(-1)&&(t=t.substring(0,t.length-1));var e=t.lastIndexOf("/");return 0<e?t.substring(0,e):""},g=function(t){return"/"!==t.slice(-1)&&(t+="/"),t},b=function(t,e){return e=void 0!==e?e:f.createFolders,t=g(t),this.files[t]||s.call(this,t,null,{dir:!0,createFolders:e}),this.files[t]};function h(t){return"[object RegExp]"===Object.prototype.toString.call(t)}var i={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(t){var e,r,i;for(e in this.files)i=this.files[e],(r=e.slice(this.root.length,e.length))&&e.slice(0,this.root.length)===this.root&&t(r,i)},filter:function(r){var i=[];return this.forEach(function(t,e){r(t,e)&&i.push(e)}),i},file:function(t,e,r){if(1!==arguments.length)return t=this.root+t,s.call(this,t,e,r),this;if(h(t)){var i=t;return this.filter(function(t,e){return!e.dir&&i.test(t)})}var n=this.files[this.root+t];return n&&!n.dir?n:null},folder:function(r){if(!r)return this;if(h(r))return this.filter(function(t,e){return e.dir&&r.test(t)});var t=this.root+r,e=b.call(this,t),i=this.clone();return i.root=e.name,i},remove:function(r){r=this.root+r;var t=this.files[r];if(t||("/"!==r.slice(-1)&&(r+="/"),t=this.files[r]),t&&!t.dir)delete this.files[r];else for(var e=this.filter(function(t,e){return e.name.slice(0,r.length)===r}),i=0;i<e.length;i++)delete this.files[e[i].name];return this},generate:function(t){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},generateInternalStream:function(t){var e,r={};try{if((r=u.extend(t||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:n.utf8encode})).type=r.type.toLowerCase(),r.compression=r.compression.toUpperCase(),"binarystring"===r.type&&(r.type="string"),!r.type)throw new Error("No output type specified.");u.checkSupport(r.type),"darwin"!==r.platform&&"freebsd"!==r.platform&&"linux"!==r.platform&&"sunos"!==r.platform||(r.platform="UNIX"),"win32"===r.platform&&(r.platform="DOS");var i=r.comment||this.comment||"";e=o.generateWorker(this,r,i)}catch(t){(e=new l("error")).error(t)}return new a(e,r.type||"string",r.mimeType)},generateAsync:function(t,e){return this.generateInternalStream(t).accumulate(e)},generateNodeStream:function(t,e){return(t=t||{}).type||(t.type="nodebuffer"),this.generateInternalStream(t).toNodejsStream(e)}};e.exports=i},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(t,e,r){e.exports=t("stream")},{stream:void 0}],17:[function(t,e,r){"use strict";var i=t("./DataReader");function n(t){i.call(this,t);for(var e=0;e<this.data.length;e++)t[e]=255&t[e]}t("../utils").inherits(n,i),n.prototype.byteAt=function(t){return this.data[this.zero+t]},n.prototype.lastIndexOfSignature=function(t){for(var e=t.charCodeAt(0),r=t.charCodeAt(1),i=t.charCodeAt(2),n=t.charCodeAt(3),s=this.length-4;0<=s;--s)if(this.data[s]===e&&this.data[s+1]===r&&this.data[s+2]===i&&this.data[s+3]===n)return s-this.zero;return-1},n.prototype.readAndCheckSignature=function(t){var e=t.charCodeAt(0),r=t.charCodeAt(1),i=t.charCodeAt(2),n=t.charCodeAt(3),s=this.readData(4);return e===s[0]&&r===s[1]&&i===s[2]&&n===s[3]},n.prototype.readData=function(t){if(this.checkOffset(t),0===t)return[];var e=this.data.slice(this.zero+this.index,this.zero+this.index+t);return this.index+=t,e},e.exports=n},{"../utils":32,"./DataReader":18}],18:[function(t,e,r){"use strict";var i=t("../utils");function n(t){this.data=t,this.length=t.length,this.index=0,this.zero=0}n.prototype={checkOffset:function(t){this.checkIndex(this.index+t)},checkIndex:function(t){if(this.length<this.zero+t||t<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+t+"). Corrupted zip ?")},setIndex:function(t){this.checkIndex(t),this.index=t},skip:function(t){this.setIndex(this.index+t)},byteAt:function(t){},readInt:function(t){var e,r=0;for(this.checkOffset(t),e=this.index+t-1;e>=this.index;e--)r=(r<<8)+this.byteAt(e);return this.index+=t,r},readString:function(t){return i.transformTo("string",this.readData(t))},readData:function(t){},lastIndexOfSignature:function(t){},readAndCheckSignature:function(t){},readDate:function(){var t=this.readInt(4);return new Date(Date.UTC(1980+(t>>25&127),(t>>21&15)-1,t>>16&31,t>>11&31,t>>5&63,(31&t)<<1))}},e.exports=n},{"../utils":32}],19:[function(t,e,r){"use strict";var i=t("./Uint8ArrayReader");function n(t){i.call(this,t)}t("../utils").inherits(n,i),n.prototype.readData=function(t){this.checkOffset(t);var e=this.data.slice(this.zero+this.index,this.zero+this.index+t);return this.index+=t,e},e.exports=n},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(t,e,r){"use strict";var i=t("./DataReader");function n(t){i.call(this,t)}t("../utils").inherits(n,i),n.prototype.byteAt=function(t){return this.data.charCodeAt(this.zero+t)},n.prototype.lastIndexOfSignature=function(t){return this.data.lastIndexOf(t)-this.zero},n.prototype.readAndCheckSignature=function(t){return t===this.readData(4)},n.prototype.readData=function(t){this.checkOffset(t);var e=this.data.slice(this.zero+this.index,this.zero+this.index+t);return this.index+=t,e},e.exports=n},{"../utils":32,"./DataReader":18}],21:[function(t,e,r){"use strict";var i=t("./ArrayReader");function n(t){i.call(this,t)}t("../utils").inherits(n,i),n.prototype.readData=function(t){if(this.checkOffset(t),0===t)return new Uint8Array(0);var e=this.data.subarray(this.zero+this.index,this.zero+this.index+t);return this.index+=t,e},e.exports=n},{"../utils":32,"./ArrayReader":17}],22:[function(t,e,r){"use strict";var i=t("../utils"),n=t("../support"),s=t("./ArrayReader"),a=t("./StringReader"),o=t("./NodeBufferReader"),h=t("./Uint8ArrayReader");e.exports=function(t){var e=i.getTypeOf(t);return i.checkSupport(e),"string"!==e||n.uint8array?"nodebuffer"===e?new o(t):n.uint8array?new h(i.transformTo("uint8array",t)):new s(i.transformTo("array",t)):new a(t)}},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(t,e,r){"use strict";r.LOCAL_FILE_HEADER="PK",r.CENTRAL_FILE_HEADER="PK",r.CENTRAL_DIRECTORY_END="PK",r.ZIP64_CENTRAL_DIRECTORY_LOCATOR="PK",r.ZIP64_CENTRAL_DIRECTORY_END="PK",r.DATA_DESCRIPTOR="PK\b"},{}],24:[function(t,e,r){"use strict";var i=t("./GenericWorker"),n=t("../utils");function s(t){i.call(this,"ConvertWorker to "+t),this.destType=t}n.inherits(s,i),s.prototype.processChunk=function(t){this.push({data:n.transformTo(this.destType,t.data),meta:t.meta})},e.exports=s},{"../utils":32,"./GenericWorker":28}],25:[function(t,e,r){"use strict";var i=t("./GenericWorker"),n=t("../crc32");function s(){i.call(this,"Crc32Probe"),this.withStreamInfo("crc32",0)}t("../utils").inherits(s,i),s.prototype.processChunk=function(t){this.streamInfo.crc32=n(t.data,this.streamInfo.crc32||0),this.push(t)},e.exports=s},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(t,e,r){"use strict";var i=t("../utils"),n=t("./GenericWorker");function s(t){n.call(this,"DataLengthProbe for "+t),this.propName=t,this.withStreamInfo(t,0)}i.inherits(s,n),s.prototype.processChunk=function(t){if(t){var e=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=e+t.data.length}n.prototype.processChunk.call(this,t)},e.exports=s},{"../utils":32,"./GenericWorker":28}],27:[function(t,e,r){"use strict";var i=t("../utils"),n=t("./GenericWorker");function s(t){n.call(this,"DataWorker");var e=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,t.then(function(t){e.dataIsReady=!0,e.data=t,e.max=t&&t.length||0,e.type=i.getTypeOf(t),e.isPaused||e._tickAndRepeat()},function(t){e.error(t)})}i.inherits(s,n),s.prototype.cleanUp=function(){n.prototype.cleanUp.call(this),this.data=null},s.prototype.resume=function(){return!!n.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,i.delay(this._tickAndRepeat,[],this)),!0)},s.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(i.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},s.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var t=null,e=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case"string":t=this.data.substring(this.index,e);break;case"uint8array":t=this.data.subarray(this.index,e);break;case"array":case"nodebuffer":t=this.data.slice(this.index,e)}return this.index=e,this.push({data:t,meta:{percent:this.max?this.index/this.max*100:0}})},e.exports=s},{"../utils":32,"./GenericWorker":28}],28:[function(t,e,r){"use strict";function i(t){this.name=t||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}i.prototype={push:function(t){this.emit("data",t)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0}catch(t){this.emit("error",t)}return!0},error:function(t){return!this.isFinished&&(this.isPaused?this.generatedError=t:(this.isFinished=!0,this.emit("error",t),this.previous&&this.previous.error(t),this.cleanUp()),!0)},on:function(t,e){return this._listeners[t].push(e),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(t,e){if(this._listeners[t])for(var r=0;r<this._listeners[t].length;r++)this._listeners[t][r].call(this,e)},pipe:function(t){return t.registerPrevious(this)},registerPrevious:function(t){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=t.streamInfo,this.mergeStreamInfo(),this.previous=t;var e=this;return t.on("data",function(t){e.processChunk(t)}),t.on("end",function(){e.end()}),t.on("error",function(t){e.error(t)}),this},pause:function(){return!this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;var t=this.isPaused=!1;return this.generatedError&&(this.error(this.generatedError),t=!0),this.previous&&this.previous.resume(),!t},flush:function(){},processChunk:function(t){this.push(t)},withStreamInfo:function(t,e){return this.extraStreamInfo[t]=e,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var t in this.extraStreamInfo)this.extraStreamInfo.hasOwnProperty(t)&&(this.streamInfo[t]=this.extraStreamInfo[t])},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var t="Worker "+this.name;return this.previous?this.previous+" -> "+t:t}},e.exports=i},{}],29:[function(t,e,r){"use strict";var h=t("../utils"),n=t("./ConvertWorker"),s=t("./GenericWorker"),u=t("../base64"),i=t("../support"),a=t("../external"),o=null;if(i.nodestream)try{o=t("../nodejs/NodejsStreamOutputAdapter")}catch(t){}function l(t,o){return new a.Promise(function(e,r){var i=[],n=t._internalType,s=t._outputType,a=t._mimeType;t.on("data",function(t,e){i.push(t),o&&o(e)}).on("error",function(t){i=[],r(t)}).on("end",function(){try{var t=function(t,e,r){switch(t){case"blob":return h.newBlob(h.transformTo("arraybuffer",e),r);case"base64":return u.encode(e);default:return h.transformTo(t,e)}}(s,function(t,e){var r,i=0,n=null,s=0;for(r=0;r<e.length;r++)s+=e[r].length;switch(t){case"string":return e.join("");case"array":return Array.prototype.concat.apply([],e);case"uint8array":for(n=new Uint8Array(s),r=0;r<e.length;r++)n.set(e[r],i),i+=e[r].length;return n;case"nodebuffer":return Buffer.concat(e);default:throw new Error("concat : unsupported type '"+t+"'")}}(n,i),a);e(t)}catch(t){r(t)}i=[]}).resume()})}function f(t,e,r){var i=e;switch(e){case"blob":case"arraybuffer":i="uint8array";break;case"base64":i="string"}try{this._internalType=i,this._outputType=e,this._mimeType=r,h.checkSupport(i),this._worker=t.pipe(new n(i)),t.lock()}catch(t){this._worker=new s("error"),this._worker.error(t)}}f.prototype={accumulate:function(t){return l(this,t)},on:function(t,e){var r=this;return"data"===t?this._worker.on(t,function(t){e.call(r,t.data,t.meta)}):this._worker.on(t,function(){h.delay(e,arguments,r)}),this},resume:function(){return h.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(t){if(h.checkSupport("nodestream"),"nodebuffer"!==this._outputType)throw new Error(this._outputType+" is not supported by this method");return new o(this,{objectMode:"nodebuffer"!==this._outputType},t)}},e.exports=f},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(t,e,r){"use strict";if(r.base64=!0,r.array=!0,r.string=!0,r.arraybuffer="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array,r.nodebuffer="undefined"!=typeof Buffer,r.uint8array="undefined"!=typeof Uint8Array,"undefined"==typeof ArrayBuffer)r.blob=!1;else{var i=new ArrayBuffer(0);try{r.blob=0===new Blob([i],{type:"application/zip"}).size}catch(t){try{var n=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);n.append(i),r.blob=0===n.getBlob("application/zip").size}catch(t){r.blob=!1}}}try{r.nodestream=!!t("readable-stream").Readable}catch(t){r.nodestream=!1}},{"readable-stream":16}],31:[function(t,e,s){"use strict";for(var o=t("./utils"),h=t("./support"),r=t("./nodejsUtils"),i=t("./stream/GenericWorker"),u=new Array(256),n=0;n<256;n++)u[n]=252<=n?6:248<=n?5:240<=n?4:224<=n?3:192<=n?2:1;u[254]=u[254]=1;function a(){i.call(this,"utf-8 decode"),this.leftOver=null}function l(){i.call(this,"utf-8 encode")}s.utf8encode=function(t){return h.nodebuffer?r.newBufferFrom(t,"utf-8"):function(t){var e,r,i,n,s,a=t.length,o=0;for(n=0;n<a;n++)55296==(64512&(r=t.charCodeAt(n)))&&n+1<a&&56320==(64512&(i=t.charCodeAt(n+1)))&&(r=65536+(r-55296<<10)+(i-56320),n++),o+=r<128?1:r<2048?2:r<65536?3:4;for(e=h.uint8array?new Uint8Array(o):new Array(o),n=s=0;s<o;n++)55296==(64512&(r=t.charCodeAt(n)))&&n+1<a&&56320==(64512&(i=t.charCodeAt(n+1)))&&(r=65536+(r-55296<<10)+(i-56320),n++),r<128?e[s++]=r:(r<2048?e[s++]=192|r>>>6:(r<65536?e[s++]=224|r>>>12:(e[s++]=240|r>>>18,e[s++]=128|r>>>12&63),e[s++]=128|r>>>6&63),e[s++]=128|63&r);return e}(t)},s.utf8decode=function(t){return h.nodebuffer?o.transformTo("nodebuffer",t).toString("utf-8"):function(t){var e,r,i,n,s=t.length,a=new Array(2*s);for(e=r=0;e<s;)if((i=t[e++])<128)a[r++]=i;else if(4<(n=u[i]))a[r++]=65533,e+=n-1;else{for(i&=2===n?31:3===n?15:7;1<n&&e<s;)i=i<<6|63&t[e++],n--;1<n?a[r++]=65533:i<65536?a[r++]=i:(i-=65536,a[r++]=55296|i>>10&1023,a[r++]=56320|1023&i)}return a.length!==r&&(a.subarray?a=a.subarray(0,r):a.length=r),o.applyFromCharCode(a)}(t=o.transformTo(h.uint8array?"uint8array":"array",t))},o.inherits(a,i),a.prototype.processChunk=function(t){var e=o.transformTo(h.uint8array?"uint8array":"array",t.data);if(this.leftOver&&this.leftOver.length){if(h.uint8array){var r=e;(e=new Uint8Array(r.length+this.leftOver.length)).set(this.leftOver,0),e.set(r,this.leftOver.length)}else e=this.leftOver.concat(e);this.leftOver=null}var i=function(t,e){var r;for((e=e||t.length)>t.length&&(e=t.length),r=e-1;0<=r&&128==(192&t[r]);)r--;return r<0?e:0===r?e:r+u[t[r]]>e?r:e}(e),n=e;i!==e.length&&(h.uint8array?(n=e.subarray(0,i),this.leftOver=e.subarray(i,e.length)):(n=e.slice(0,i),this.leftOver=e.slice(i,e.length))),this.push({data:s.utf8decode(n),meta:t.meta})},a.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:s.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},s.Utf8DecodeWorker=a,o.inherits(l,i),l.prototype.processChunk=function(t){this.push({data:s.utf8encode(t.data),meta:t.meta})},s.Utf8EncodeWorker=l},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(t,e,a){"use strict";var o=t("./support"),h=t("./base64"),r=t("./nodejsUtils"),i=t("set-immediate-shim"),u=t("./external");function n(t){return t}function l(t,e){for(var r=0;r<t.length;++r)e[r]=255&t.charCodeAt(r);return e}a.newBlob=function(e,r){a.checkSupport("blob");try{return new Blob([e],{type:r})}catch(t){try{var i=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return i.append(e),i.getBlob(r)}catch(t){throw new Error("Bug : can't construct the Blob.")}}};var s={stringifyByChunk:function(t,e,r){var i=[],n=0,s=t.length;if(s<=r)return String.fromCharCode.apply(null,t);for(;n<s;)"array"===e||"nodebuffer"===e?i.push(String.fromCharCode.apply(null,t.slice(n,Math.min(n+r,s)))):i.push(String.fromCharCode.apply(null,t.subarray(n,Math.min(n+r,s)))),n+=r;return i.join("")},stringifyByChar:function(t){for(var e="",r=0;r<t.length;r++)e+=String.fromCharCode(t[r]);return e},applyCanBeUsed:{uint8array:function(){try{return o.uint8array&&1===String.fromCharCode.apply(null,new Uint8Array(1)).length}catch(t){return!1}}(),nodebuffer:function(){try{return o.nodebuffer&&1===String.fromCharCode.apply(null,r.allocBuffer(1)).length}catch(t){return!1}}()}};function f(t){var e=65536,r=a.getTypeOf(t),i=!0;if("uint8array"===r?i=s.applyCanBeUsed.uint8array:"nodebuffer"===r&&(i=s.applyCanBeUsed.nodebuffer),i)for(;1<e;)try{return s.stringifyByChunk(t,r,e)}catch(t){e=Math.floor(e/2)}return s.stringifyByChar(t)}function d(t,e){for(var r=0;r<t.length;r++)e[r]=t[r];return e}a.applyFromCharCode=f;var c={};c.string={string:n,array:function(t){return l(t,new Array(t.length))},arraybuffer:function(t){return c.string.uint8array(t).buffer},uint8array:function(t){return l(t,new Uint8Array(t.length))},nodebuffer:function(t){return l(t,r.allocBuffer(t.length))}},c.array={string:f,array:n,arraybuffer:function(t){return new Uint8Array(t).buffer},uint8array:function(t){return new Uint8Array(t)},nodebuffer:function(t){return r.newBufferFrom(t)}},c.arraybuffer={string:function(t){return f(new Uint8Array(t))},array:function(t){return d(new Uint8Array(t),new Array(t.byteLength))},arraybuffer:n,uint8array:function(t){return new Uint8Array(t)},nodebuffer:function(t){return r.newBufferFrom(new Uint8Array(t))}},c.uint8array={string:f,array:function(t){return d(t,new Array(t.length))},arraybuffer:function(t){return t.buffer},uint8array:n,nodebuffer:function(t){return r.newBufferFrom(t)}},c.nodebuffer={string:f,array:function(t){return d(t,new Array(t.length))},arraybuffer:function(t){return c.nodebuffer.uint8array(t).buffer},uint8array:function(t){return d(t,new Uint8Array(t.length))},nodebuffer:n},a.transformTo=function(t,e){if(e=e||"",!t)return e;a.checkSupport(t);var r=a.getTypeOf(e);return c[r][t](e)},a.getTypeOf=function(t){return"string"==typeof t?"string":"[object Array]"===Object.prototype.toString.call(t)?"array":o.nodebuffer&&r.isBuffer(t)?"nodebuffer":o.uint8array&&t instanceof Uint8Array?"uint8array":o.arraybuffer&&t instanceof ArrayBuffer?"arraybuffer":void 0},a.checkSupport=function(t){if(!o[t.toLowerCase()])throw new Error(t+" is not supported by this platform")},a.MAX_VALUE_16BITS=65535,a.MAX_VALUE_32BITS=-1,a.pretty=function(t){var e,r,i="";for(r=0;r<(t||"").length;r++)i+="\\x"+((e=t.charCodeAt(r))<16?"0":"")+e.toString(16).toUpperCase();return i},a.delay=function(t,e,r){i(function(){t.apply(r||null,e||[])})},a.inherits=function(t,e){function r(){}r.prototype=e.prototype,t.prototype=new r},a.extend=function(){var t,e,r={};for(t=0;t<arguments.length;t++)for(e in arguments[t])arguments[t].hasOwnProperty(e)&&void 0===r[e]&&(r[e]=arguments[t][e]);return r},a.prepareContent=function(r,t,i,n,s){return u.Promise.resolve(t).then(function(i){return o.blob&&(i instanceof Blob||-1!==["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(i)))&&"undefined"!=typeof FileReader?new u.Promise(function(e,r){var t=new FileReader;t.onload=function(t){e(t.target.result)},t.onerror=function(t){r(t.target.error)},t.readAsArrayBuffer(i)}):i}).then(function(t){var e=a.getTypeOf(t);return e?("arraybuffer"===e?t=a.transformTo("uint8array",t):"string"===e&&(s?t=h.decode(t):i&&!0!==n&&(t=function(t){return l(t,o.uint8array?new Uint8Array(t.length):new Array(t.length))}(t))),t):u.Promise.reject(new Error("Can't read the data of '"+r+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))})}},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,"set-immediate-shim":54}],33:[function(t,e,r){"use strict";var i=t("./reader/readerFor"),n=t("./utils"),s=t("./signature"),a=t("./zipEntry"),o=(t("./utf8"),t("./support"));function h(t){this.files=[],this.loadOptions=t}h.prototype={checkSignature:function(t){if(!this.reader.readAndCheckSignature(t)){this.reader.index-=4;var e=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+n.pretty(e)+", expected "+n.pretty(t)+")")}},isSignature:function(t,e){var r=this.reader.index;this.reader.setIndex(t);var i=this.reader.readString(4)===e;return this.reader.setIndex(r),i},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var t=this.reader.readData(this.zipCommentLength),e=o.uint8array?"uint8array":"array",r=n.transformTo(e,t);this.zipComment=this.loadOptions.decodeFileName(r)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var t,e,r,i=this.zip64EndOfCentralSize-44;0<i;)t=this.reader.readInt(2),e=this.reader.readInt(4),r=this.reader.readData(e),this.zip64ExtensibleData[t]={id:t,length:e,value:r}},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),1<this.disksCount)throw new Error("Multi-volumes zip are not supported")},readLocalFiles:function(){var t,e;for(t=0;t<this.files.length;t++)e=this.files[t],this.reader.setIndex(e.localHeaderOffset),this.checkSignature(s.LOCAL_FILE_HEADER),e.readLocalPart(this.reader),e.handleUTF8(),e.processAttributes()},readCentralDir:function(){var t;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER);)(t=new a({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(t);if(this.centralDirRecords!==this.files.length&&0!==this.centralDirRecords&&0===this.files.length)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var t=this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);if(t<0)throw!this.isSignature(0,s.LOCAL_FILE_HEADER)?new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html"):new Error("Corrupted zip: can't find end of central directory");this.reader.setIndex(t);var e=t;if(this.checkSignature(s.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===n.MAX_VALUE_16BITS||this.diskWithCentralDirStart===n.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===n.MAX_VALUE_16BITS||this.centralDirRecords===n.MAX_VALUE_16BITS||this.centralDirSize===n.MAX_VALUE_32BITS||this.centralDirOffset===n.MAX_VALUE_32BITS){if(this.zip64=!0,(t=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(t),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,s.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var r=this.centralDirOffset+this.centralDirSize;this.zip64&&(r+=20,r+=12+this.zip64EndOfCentralSize);var i=e-r;if(0<i)this.isSignature(e,s.CENTRAL_FILE_HEADER)||(this.reader.zero=i);else if(i<0)throw new Error("Corrupted zip: missing "+Math.abs(i)+" bytes.")},prepareReader:function(t){this.reader=i(t)},load:function(t){this.prepareReader(t),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},e.exports=h},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utf8":31,"./utils":32,"./zipEntry":34}],34:[function(t,e,r){"use strict";var i=t("./reader/readerFor"),s=t("./utils"),n=t("./compressedObject"),a=t("./crc32"),o=t("./utf8"),h=t("./compressions"),u=t("./support");function l(t,e){this.options=t,this.loadOptions=e}l.prototype={isEncrypted:function(){return 1==(1&this.bitFlag)},useUTF8:function(){return 2048==(2048&this.bitFlag)},readLocalPart:function(t){var e,r;if(t.skip(22),this.fileNameLength=t.readInt(2),r=t.readInt(2),this.fileName=t.readData(this.fileNameLength),t.skip(r),-1===this.compressedSize||-1===this.uncompressedSize)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");if(null===(e=function(t){for(var e in h)if(h.hasOwnProperty(e)&&h[e].magic===t)return h[e];return null}(this.compressionMethod)))throw new Error("Corrupted zip : compression "+s.pretty(this.compressionMethod)+" unknown (inner file : "+s.transformTo("string",this.fileName)+")");this.decompressed=new n(this.compressedSize,this.uncompressedSize,this.crc32,e,t.readData(this.compressedSize))},readCentralPart:function(t){this.versionMadeBy=t.readInt(2),t.skip(2),this.bitFlag=t.readInt(2),this.compressionMethod=t.readString(2),this.date=t.readDate(),this.crc32=t.readInt(4),this.compressedSize=t.readInt(4),this.uncompressedSize=t.readInt(4);var e=t.readInt(2);if(this.extraFieldsLength=t.readInt(2),this.fileCommentLength=t.readInt(2),this.diskNumberStart=t.readInt(2),this.internalFileAttributes=t.readInt(2),this.externalFileAttributes=t.readInt(4),this.localHeaderOffset=t.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");t.skip(e),this.readExtraFields(t),this.parseZIP64ExtraField(t),this.fileComment=t.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var t=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),0==t&&(this.dosPermissions=63&this.externalFileAttributes),3==t&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||"/"!==this.fileNameStr.slice(-1)||(this.dir=!0)},parseZIP64ExtraField:function(t){if(this.extraFields[1]){var e=i(this.extraFields[1].value);this.uncompressedSize===s.MAX_VALUE_32BITS&&(this.uncompressedSize=e.readInt(8)),this.compressedSize===s.MAX_VALUE_32BITS&&(this.compressedSize=e.readInt(8)),this.localHeaderOffset===s.MAX_VALUE_32BITS&&(this.localHeaderOffset=e.readInt(8)),this.diskNumberStart===s.MAX_VALUE_32BITS&&(this.diskNumberStart=e.readInt(4))}},readExtraFields:function(t){var e,r,i,n=t.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});t.index+4<n;)e=t.readInt(2),r=t.readInt(2),i=t.readData(r),this.extraFields[e]={id:e,length:r,value:i};t.setIndex(n)},handleUTF8:function(){var t=u.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=o.utf8decode(this.fileName),this.fileCommentStr=o.utf8decode(this.fileComment);else{var e=this.findExtraFieldUnicodePath();if(null!==e)this.fileNameStr=e;else{var r=s.transformTo(t,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(r)}var i=this.findExtraFieldUnicodeComment();if(null!==i)this.fileCommentStr=i;else{var n=s.transformTo(t,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(n)}}},findExtraFieldUnicodePath:function(){var t=this.extraFields[28789];if(t){var e=i(t.value);return 1!==e.readInt(1)?null:a(this.fileName)!==e.readInt(4)?null:o.utf8decode(e.readData(t.length-5))}return null},findExtraFieldUnicodeComment:function(){var t=this.extraFields[25461];if(t){var e=i(t.value);return 1!==e.readInt(1)?null:a(this.fileComment)!==e.readInt(4)?null:o.utf8decode(e.readData(t.length-5))}return null}},e.exports=l},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(t,e,r){"use strict";function i(t,e,r){this.name=t,this.dir=r.dir,this.date=r.date,this.comment=r.comment,this.unixPermissions=r.unixPermissions,this.dosPermissions=r.dosPermissions,this._data=e,this._dataBinary=r.binary,this.options={compression:r.compression,compressionOptions:r.compressionOptions}}var s=t("./stream/StreamHelper"),n=t("./stream/DataWorker"),a=t("./utf8"),o=t("./compressedObject"),h=t("./stream/GenericWorker");i.prototype={internalStream:function(t){var e=null,r="string";try{if(!t)throw new Error("No output type specified.");var i="string"===(r=t.toLowerCase())||"text"===r;"binarystring"!==r&&"text"!==r||(r="string"),e=this._decompressWorker();var n=!this._dataBinary;n&&!i&&(e=e.pipe(new a.Utf8EncodeWorker)),!n&&i&&(e=e.pipe(new a.Utf8DecodeWorker))}catch(t){(e=new h("error")).error(t)}return new s(e,r,"")},async:function(t,e){return this.internalStream(t).accumulate(e)},nodeStream:function(t,e){return this.internalStream(t||"nodebuffer").toNodejsStream(e)},_compressWorker:function(t,e){if(this._data instanceof o&&this._data.compression.magic===t.magic)return this._data.getCompressedWorker();var r=this._decompressWorker();return this._dataBinary||(r=r.pipe(new a.Utf8EncodeWorker)),o.createWorkerFrom(r,t,e)},_decompressWorker:function(){return this._data instanceof o?this._data.getContentWorker():this._data instanceof h?this._data:new n(this._data)}};for(var u=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],l=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},f=0;f<u.length;f++)i.prototype[u[f]]=l;e.exports=i},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(t,l,e){(function(e){"use strict";var r,i,t=e.MutationObserver||e.WebKitMutationObserver;if(t){var n=0,s=new t(u),a=e.document.createTextNode("");s.observe(a,{characterData:!0}),r=function(){a.data=n=++n%2}}else if(e.setImmediate||void 0===e.MessageChannel)r="document"in e&&"onreadystatechange"in e.document.createElement("script")?function(){var t=e.document.createElement("script");t.onreadystatechange=function(){u(),t.onreadystatechange=null,t.parentNode.removeChild(t),t=null},e.document.documentElement.appendChild(t)}:function(){setTimeout(u,0)};else{var o=new e.MessageChannel;o.port1.onmessage=u,r=function(){o.port2.postMessage(0)}}var h=[];function u(){var t,e;i=!0;for(var r=h.length;r;){for(e=h,h=[],t=-1;++t<r;)e[t]();r=h.length}i=!1}l.exports=function(t){1!==h.push(t)||i||r()}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],37:[function(t,e,r){"use strict";var n=t("immediate");function u(){}var l={},s=["REJECTED"],a=["FULFILLED"],i=["PENDING"];function o(t){if("function"!=typeof t)throw new TypeError("resolver must be a function");this.state=i,this.queue=[],this.outcome=void 0,t!==u&&c(this,t)}function h(t,e,r){this.promise=t,"function"==typeof e&&(this.onFulfilled=e,this.callFulfilled=this.otherCallFulfilled),"function"==typeof r&&(this.onRejected=r,this.callRejected=this.otherCallRejected)}function f(e,r,i){n(function(){var t;try{t=r(i)}catch(t){return l.reject(e,t)}t===e?l.reject(e,new TypeError("Cannot resolve promise with itself")):l.resolve(e,t)})}function d(t){var e=t&&t.then;if(t&&("object"==typeof t||"function"==typeof t)&&"function"==typeof e)return function(){e.apply(t,arguments)}}function c(e,t){var r=!1;function i(t){r||(r=!0,l.reject(e,t))}function n(t){r||(r=!0,l.resolve(e,t))}var s=p(function(){t(n,i)});"error"===s.status&&i(s.value)}function p(t,e){var r={};try{r.value=t(e),r.status="success"}catch(t){r.status="error",r.value=t}return r}(e.exports=o).prototype.finally=function(e){if("function"!=typeof e)return this;var r=this.constructor;return this.then(function(t){return r.resolve(e()).then(function(){return t})},function(t){return r.resolve(e()).then(function(){throw t})})},o.prototype.catch=function(t){return this.then(null,t)},o.prototype.then=function(t,e){if("function"!=typeof t&&this.state===a||"function"!=typeof e&&this.state===s)return this;var r=new this.constructor(u);this.state!==i?f(r,this.state===a?t:e,this.outcome):this.queue.push(new h(r,t,e));return r},h.prototype.callFulfilled=function(t){l.resolve(this.promise,t)},h.prototype.otherCallFulfilled=function(t){f(this.promise,this.onFulfilled,t)},h.prototype.callRejected=function(t){l.reject(this.promise,t)},h.prototype.otherCallRejected=function(t){f(this.promise,this.onRejected,t)},l.resolve=function(t,e){var r=p(d,e);if("error"===r.status)return l.reject(t,r.value);var i=r.value;if(i)c(t,i);else{t.state=a,t.outcome=e;for(var n=-1,s=t.queue.length;++n<s;)t.queue[n].callFulfilled(e)}return t},l.reject=function(t,e){t.state=s,t.outcome=e;for(var r=-1,i=t.queue.length;++r<i;)t.queue[r].callRejected(e);return t},o.resolve=function(t){if(t instanceof this)return t;return l.resolve(new this(u),t)},o.reject=function(t){var e=new this(u);return l.reject(e,t)},o.all=function(t){var r=this;if("[object Array]"!==Object.prototype.toString.call(t))return this.reject(new TypeError("must be an array"));var i=t.length,n=!1;if(!i)return this.resolve([]);var s=new Array(i),a=0,e=-1,o=new this(u);for(;++e<i;)h(t[e],e);return o;function h(t,e){r.resolve(t).then(function(t){s[e]=t,++a!==i||n||(n=!0,l.resolve(o,s))},function(t){n||(n=!0,l.reject(o,t))})}},o.race=function(t){var e=this;if("[object Array]"!==Object.prototype.toString.call(t))return this.reject(new TypeError("must be an array"));var r=t.length,i=!1;if(!r)return this.resolve([]);var n=-1,s=new this(u);for(;++n<r;)a=t[n],e.resolve(a).then(function(t){i||(i=!0,l.resolve(s,t))},function(t){i||(i=!0,l.reject(s,t))});var a;return s}},{immediate:36}],38:[function(t,e,r){"use strict";var i={};(0,t("./lib/utils/common").assign)(i,t("./lib/deflate"),t("./lib/inflate"),t("./lib/zlib/constants")),e.exports=i},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(t,e,r){"use strict";var a=t("./zlib/deflate"),o=t("./utils/common"),h=t("./utils/strings"),n=t("./zlib/messages"),s=t("./zlib/zstream"),u=Object.prototype.toString,l=0,f=-1,d=0,c=8;function p(t){if(!(this instanceof p))return new p(t);this.options=o.assign({level:f,method:c,chunkSize:16384,windowBits:15,memLevel:8,strategy:d,to:""},t||{});var e=this.options;e.raw&&0<e.windowBits?e.windowBits=-e.windowBits:e.gzip&&0<e.windowBits&&e.windowBits<16&&(e.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new s,this.strm.avail_out=0;var r=a.deflateInit2(this.strm,e.level,e.method,e.windowBits,e.memLevel,e.strategy);if(r!==l)throw new Error(n[r]);if(e.header&&a.deflateSetHeader(this.strm,e.header),e.dictionary){var i;if(i="string"==typeof e.dictionary?h.string2buf(e.dictionary):"[object ArrayBuffer]"===u.call(e.dictionary)?new Uint8Array(e.dictionary):e.dictionary,(r=a.deflateSetDictionary(this.strm,i))!==l)throw new Error(n[r]);this._dict_set=!0}}function i(t,e){var r=new p(e);if(r.push(t,!0),r.err)throw r.msg||n[r.err];return r.result}p.prototype.push=function(t,e){var r,i,n=this.strm,s=this.options.chunkSize;if(this.ended)return!1;i=e===~~e?e:!0===e?4:0,"string"==typeof t?n.input=h.string2buf(t):"[object ArrayBuffer]"===u.call(t)?n.input=new Uint8Array(t):n.input=t,n.next_in=0,n.avail_in=n.input.length;do{if(0===n.avail_out&&(n.output=new o.Buf8(s),n.next_out=0,n.avail_out=s),1!==(r=a.deflate(n,i))&&r!==l)return this.onEnd(r),!(this.ended=!0);0!==n.avail_out&&(0!==n.avail_in||4!==i&&2!==i)||("string"===this.options.to?this.onData(h.buf2binstring(o.shrinkBuf(n.output,n.next_out))):this.onData(o.shrinkBuf(n.output,n.next_out)))}while((0<n.avail_in||0===n.avail_out)&&1!==r);return 4===i?(r=a.deflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===l):2!==i||(this.onEnd(l),!(n.avail_out=0))},p.prototype.onData=function(t){this.chunks.push(t)},p.prototype.onEnd=function(t){t===l&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=t,this.msg=this.strm.msg},r.Deflate=p,r.deflate=i,r.deflateRaw=function(t,e){return(e=e||{}).raw=!0,i(t,e)},r.gzip=function(t,e){return(e=e||{}).gzip=!0,i(t,e)}},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(t,e,r){"use strict";var d=t("./zlib/inflate"),c=t("./utils/common"),p=t("./utils/strings"),m=t("./zlib/constants"),i=t("./zlib/messages"),n=t("./zlib/zstream"),s=t("./zlib/gzheader"),_=Object.prototype.toString;function a(t){if(!(this instanceof a))return new a(t);this.options=c.assign({chunkSize:16384,windowBits:0,to:""},t||{});var e=this.options;e.raw&&0<=e.windowBits&&e.windowBits<16&&(e.windowBits=-e.windowBits,0===e.windowBits&&(e.windowBits=-15)),!(0<=e.windowBits&&e.windowBits<16)||t&&t.windowBits||(e.windowBits+=32),15<e.windowBits&&e.windowBits<48&&0==(15&e.windowBits)&&(e.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new n,this.strm.avail_out=0;var r=d.inflateInit2(this.strm,e.windowBits);if(r!==m.Z_OK)throw new Error(i[r]);this.header=new s,d.inflateGetHeader(this.strm,this.header)}function o(t,e){var r=new a(e);if(r.push(t,!0),r.err)throw r.msg||i[r.err];return r.result}a.prototype.push=function(t,e){var r,i,n,s,a,o,h=this.strm,u=this.options.chunkSize,l=this.options.dictionary,f=!1;if(this.ended)return!1;i=e===~~e?e:!0===e?m.Z_FINISH:m.Z_NO_FLUSH,"string"==typeof t?h.input=p.binstring2buf(t):"[object ArrayBuffer]"===_.call(t)?h.input=new Uint8Array(t):h.input=t,h.next_in=0,h.avail_in=h.input.length;do{if(0===h.avail_out&&(h.output=new c.Buf8(u),h.next_out=0,h.avail_out=u),(r=d.inflate(h,m.Z_NO_FLUSH))===m.Z_NEED_DICT&&l&&(o="string"==typeof l?p.string2buf(l):"[object ArrayBuffer]"===_.call(l)?new Uint8Array(l):l,r=d.inflateSetDictionary(this.strm,o)),r===m.Z_BUF_ERROR&&!0===f&&(r=m.Z_OK,f=!1),r!==m.Z_STREAM_END&&r!==m.Z_OK)return this.onEnd(r),!(this.ended=!0);h.next_out&&(0!==h.avail_out&&r!==m.Z_STREAM_END&&(0!==h.avail_in||i!==m.Z_FINISH&&i!==m.Z_SYNC_FLUSH)||("string"===this.options.to?(n=p.utf8border(h.output,h.next_out),s=h.next_out-n,a=p.buf2string(h.output,n),h.next_out=s,h.avail_out=u-s,s&&c.arraySet(h.output,h.output,n,s,0),this.onData(a)):this.onData(c.shrinkBuf(h.output,h.next_out)))),0===h.avail_in&&0===h.avail_out&&(f=!0)}while((0<h.avail_in||0===h.avail_out)&&r!==m.Z_STREAM_END);return r===m.Z_STREAM_END&&(i=m.Z_FINISH),i===m.Z_FINISH?(r=d.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===m.Z_OK):i!==m.Z_SYNC_FLUSH||(this.onEnd(m.Z_OK),!(h.avail_out=0))},a.prototype.onData=function(t){this.chunks.push(t)},a.prototype.onEnd=function(t){t===m.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=c.flattenChunks(this.chunks)),this.chunks=[],this.err=t,this.msg=this.strm.msg},r.Inflate=a,r.inflate=o,r.inflateRaw=function(t,e){return(e=e||{}).raw=!0,o(t,e)},r.ungzip=o},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(t,e,r){"use strict";var i="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;r.assign=function(t){for(var e=Array.prototype.slice.call(arguments,1);e.length;){var r=e.shift();if(r){if("object"!=typeof r)throw new TypeError(r+"must be non-object");for(var i in r)r.hasOwnProperty(i)&&(t[i]=r[i])}}return t},r.shrinkBuf=function(t,e){return t.length===e?t:t.subarray?t.subarray(0,e):(t.length=e,t)};var n={arraySet:function(t,e,r,i,n){if(e.subarray&&t.subarray)t.set(e.subarray(r,r+i),n);else for(var s=0;s<i;s++)t[n+s]=e[r+s]},flattenChunks:function(t){var e,r,i,n,s,a;for(e=i=0,r=t.length;e<r;e++)i+=t[e].length;for(a=new Uint8Array(i),e=n=0,r=t.length;e<r;e++)s=t[e],a.set(s,n),n+=s.length;return a}},s={arraySet:function(t,e,r,i,n){for(var s=0;s<i;s++)t[n+s]=e[r+s]},flattenChunks:function(t){return[].concat.apply([],t)}};r.setTyped=function(t){t?(r.Buf8=Uint8Array,r.Buf16=Uint16Array,r.Buf32=Int32Array,r.assign(r,n)):(r.Buf8=Array,r.Buf16=Array,r.Buf32=Array,r.assign(r,s))},r.setTyped(i)},{}],42:[function(t,e,r){"use strict";var h=t("./common"),n=!0,s=!0;try{String.fromCharCode.apply(null,[0])}catch(t){n=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(t){s=!1}for(var u=new h.Buf8(256),i=0;i<256;i++)u[i]=252<=i?6:248<=i?5:240<=i?4:224<=i?3:192<=i?2:1;function l(t,e){if(e<65537&&(t.subarray&&s||!t.subarray&&n))return String.fromCharCode.apply(null,h.shrinkBuf(t,e));for(var r="",i=0;i<e;i++)r+=String.fromCharCode(t[i]);return r}u[254]=u[254]=1,r.string2buf=function(t){var e,r,i,n,s,a=t.length,o=0;for(n=0;n<a;n++)55296==(64512&(r=t.charCodeAt(n)))&&n+1<a&&56320==(64512&(i=t.charCodeAt(n+1)))&&(r=65536+(r-55296<<10)+(i-56320),n++),o+=r<128?1:r<2048?2:r<65536?3:4;for(e=new h.Buf8(o),n=s=0;s<o;n++)55296==(64512&(r=t.charCodeAt(n)))&&n+1<a&&56320==(64512&(i=t.charCodeAt(n+1)))&&(r=65536+(r-55296<<10)+(i-56320),n++),r<128?e[s++]=r:(r<2048?e[s++]=192|r>>>6:(r<65536?e[s++]=224|r>>>12:(e[s++]=240|r>>>18,e[s++]=128|r>>>12&63),e[s++]=128|r>>>6&63),e[s++]=128|63&r);return e},r.buf2binstring=function(t){return l(t,t.length)},r.binstring2buf=function(t){for(var e=new h.Buf8(t.length),r=0,i=e.length;r<i;r++)e[r]=t.charCodeAt(r);return e},r.buf2string=function(t,e){var r,i,n,s,a=e||t.length,o=new Array(2*a);for(r=i=0;r<a;)if((n=t[r++])<128)o[i++]=n;else if(4<(s=u[n]))o[i++]=65533,r+=s-1;else{for(n&=2===s?31:3===s?15:7;1<s&&r<a;)n=n<<6|63&t[r++],s--;1<s?o[i++]=65533:n<65536?o[i++]=n:(n-=65536,o[i++]=55296|n>>10&1023,o[i++]=56320|1023&n)}return l(o,i)},r.utf8border=function(t,e){var r;for((e=e||t.length)>t.length&&(e=t.length),r=e-1;0<=r&&128==(192&t[r]);)r--;return r<0?e:0===r?e:r+u[t[r]]>e?r:e}},{"./common":41}],43:[function(t,e,r){"use strict";e.exports=function(t,e,r,i){for(var n=65535&t|0,s=t>>>16&65535|0,a=0;0!==r;){for(r-=a=2e3<r?2e3:r;s=s+(n=n+e[i++]|0)|0,--a;);n%=65521,s%=65521}return n|s<<16|0}},{}],44:[function(t,e,r){"use strict";e.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],45:[function(t,e,r){"use strict";var o=function(){for(var t,e=[],r=0;r<256;r++){t=r;for(var i=0;i<8;i++)t=1&t?3988292384^t>>>1:t>>>1;e[r]=t}return e}();e.exports=function(t,e,r,i){var n=o,s=i+r;t^=-1;for(var a=i;a<s;a++)t=t>>>8^n[255&(t^e[a])];return-1^t}},{}],46:[function(t,e,r){"use strict";var h,d=t("../utils/common"),u=t("./trees"),c=t("./adler32"),p=t("./crc32"),i=t("./messages"),l=0,f=4,m=0,_=-2,g=-1,b=4,n=2,v=8,y=9,s=286,a=30,o=19,w=2*s+1,k=15,x=3,S=258,z=S+x+1,C=42,E=113,A=1,I=2,O=3,B=4;function R(t,e){return t.msg=i[e],e}function T(t){return(t<<1)-(4<t?9:0)}function D(t){for(var e=t.length;0<=--e;)t[e]=0}function F(t){var e=t.state,r=e.pending;r>t.avail_out&&(r=t.avail_out),0!==r&&(d.arraySet(t.output,e.pending_buf,e.pending_out,r,t.next_out),t.next_out+=r,e.pending_out+=r,t.total_out+=r,t.avail_out-=r,e.pending-=r,0===e.pending&&(e.pending_out=0))}function N(t,e){u._tr_flush_block(t,0<=t.block_start?t.block_start:-1,t.strstart-t.block_start,e),t.block_start=t.strstart,F(t.strm)}function U(t,e){t.pending_buf[t.pending++]=e}function P(t,e){t.pending_buf[t.pending++]=e>>>8&255,t.pending_buf[t.pending++]=255&e}function L(t,e){var r,i,n=t.max_chain_length,s=t.strstart,a=t.prev_length,o=t.nice_match,h=t.strstart>t.w_size-z?t.strstart-(t.w_size-z):0,u=t.window,l=t.w_mask,f=t.prev,d=t.strstart+S,c=u[s+a-1],p=u[s+a];t.prev_length>=t.good_match&&(n>>=2),o>t.lookahead&&(o=t.lookahead);do{if(u[(r=e)+a]===p&&u[r+a-1]===c&&u[r]===u[s]&&u[++r]===u[s+1]){s+=2,r++;do{}while(u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&s<d);if(i=S-(d-s),s=d-S,a<i){if(t.match_start=e,o<=(a=i))break;c=u[s+a-1],p=u[s+a]}}}while((e=f[e&l])>h&&0!=--n);return a<=t.lookahead?a:t.lookahead}function j(t){var e,r,i,n,s,a,o,h,u,l,f=t.w_size;do{if(n=t.window_size-t.lookahead-t.strstart,t.strstart>=f+(f-z)){for(d.arraySet(t.window,t.window,f,f,0),t.match_start-=f,t.strstart-=f,t.block_start-=f,e=r=t.hash_size;i=t.head[--e],t.head[e]=f<=i?i-f:0,--r;);for(e=r=f;i=t.prev[--e],t.prev[e]=f<=i?i-f:0,--r;);n+=f}if(0===t.strm.avail_in)break;if(a=t.strm,o=t.window,h=t.strstart+t.lookahead,u=n,l=void 0,l=a.avail_in,u<l&&(l=u),r=0===l?0:(a.avail_in-=l,d.arraySet(o,a.input,a.next_in,l,h),1===a.state.wrap?a.adler=c(a.adler,o,l,h):2===a.state.wrap&&(a.adler=p(a.adler,o,l,h)),a.next_in+=l,a.total_in+=l,l),t.lookahead+=r,t.lookahead+t.insert>=x)for(s=t.strstart-t.insert,t.ins_h=t.window[s],t.ins_h=(t.ins_h<<t.hash_shift^t.window[s+1])&t.hash_mask;t.insert&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[s+x-1])&t.hash_mask,t.prev[s&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=s,s++,t.insert--,!(t.lookahead+t.insert<x)););}while(t.lookahead<z&&0!==t.strm.avail_in)}function Z(t,e){for(var r,i;;){if(t.lookahead<z){if(j(t),t.lookahead<z&&e===l)return A;if(0===t.lookahead)break}if(r=0,t.lookahead>=x&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+x-1])&t.hash_mask,r=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),0!==r&&t.strstart-r<=t.w_size-z&&(t.match_length=L(t,r)),t.match_length>=x)if(i=u._tr_tally(t,t.strstart-t.match_start,t.match_length-x),t.lookahead-=t.match_length,t.match_length<=t.max_lazy_match&&t.lookahead>=x){for(t.match_length--;t.strstart++,t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+x-1])&t.hash_mask,r=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart,0!=--t.match_length;);t.strstart++}else t.strstart+=t.match_length,t.match_length=0,t.ins_h=t.window[t.strstart],t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+1])&t.hash_mask;else i=u._tr_tally(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++;if(i&&(N(t,!1),0===t.strm.avail_out))return A}return t.insert=t.strstart<x-1?t.strstart:x-1,e===f?(N(t,!0),0===t.strm.avail_out?O:B):t.last_lit&&(N(t,!1),0===t.strm.avail_out)?A:I}function W(t,e){for(var r,i,n;;){if(t.lookahead<z){if(j(t),t.lookahead<z&&e===l)return A;if(0===t.lookahead)break}if(r=0,t.lookahead>=x&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+x-1])&t.hash_mask,r=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),t.prev_length=t.match_length,t.prev_match=t.match_start,t.match_length=x-1,0!==r&&t.prev_length<t.max_lazy_match&&t.strstart-r<=t.w_size-z&&(t.match_length=L(t,r),t.match_length<=5&&(1===t.strategy||t.match_length===x&&4096<t.strstart-t.match_start)&&(t.match_length=x-1)),t.prev_length>=x&&t.match_length<=t.prev_length){for(n=t.strstart+t.lookahead-x,i=u._tr_tally(t,t.strstart-1-t.prev_match,t.prev_length-x),t.lookahead-=t.prev_length-1,t.prev_length-=2;++t.strstart<=n&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+x-1])&t.hash_mask,r=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),0!=--t.prev_length;);if(t.match_available=0,t.match_length=x-1,t.strstart++,i&&(N(t,!1),0===t.strm.avail_out))return A}else if(t.match_available){if((i=u._tr_tally(t,0,t.window[t.strstart-1]))&&N(t,!1),t.strstart++,t.lookahead--,0===t.strm.avail_out)return A}else t.match_available=1,t.strstart++,t.lookahead--}return t.match_available&&(i=u._tr_tally(t,0,t.window[t.strstart-1]),t.match_available=0),t.insert=t.strstart<x-1?t.strstart:x-1,e===f?(N(t,!0),0===t.strm.avail_out?O:B):t.last_lit&&(N(t,!1),0===t.strm.avail_out)?A:I}function M(t,e,r,i,n){this.good_length=t,this.max_lazy=e,this.nice_length=r,this.max_chain=i,this.func=n}function H(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=v,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new d.Buf16(2*w),this.dyn_dtree=new d.Buf16(2*(2*a+1)),this.bl_tree=new d.Buf16(2*(2*o+1)),D(this.dyn_ltree),D(this.dyn_dtree),D(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new d.Buf16(k+1),this.heap=new d.Buf16(2*s+1),D(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new d.Buf16(2*s+1),D(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function G(t){var e;return t&&t.state?(t.total_in=t.total_out=0,t.data_type=n,(e=t.state).pending=0,e.pending_out=0,e.wrap<0&&(e.wrap=-e.wrap),e.status=e.wrap?C:E,t.adler=2===e.wrap?0:1,e.last_flush=l,u._tr_init(e),m):R(t,_)}function K(t){var e=G(t);return e===m&&function(t){t.window_size=2*t.w_size,D(t.head),t.max_lazy_match=h[t.level].max_lazy,t.good_match=h[t.level].good_length,t.nice_match=h[t.level].nice_length,t.max_chain_length=h[t.level].max_chain,t.strstart=0,t.block_start=0,t.lookahead=0,t.insert=0,t.match_length=t.prev_length=x-1,t.match_available=0,t.ins_h=0}(t.state),e}function Y(t,e,r,i,n,s){if(!t)return _;var a=1;if(e===g&&(e=6),i<0?(a=0,i=-i):15<i&&(a=2,i-=16),n<1||y<n||r!==v||i<8||15<i||e<0||9<e||s<0||b<s)return R(t,_);8===i&&(i=9);var o=new H;return(t.state=o).strm=t,o.wrap=a,o.gzhead=null,o.w_bits=i,o.w_size=1<<o.w_bits,o.w_mask=o.w_size-1,o.hash_bits=n+7,o.hash_size=1<<o.hash_bits,o.hash_mask=o.hash_size-1,o.hash_shift=~~((o.hash_bits+x-1)/x),o.window=new d.Buf8(2*o.w_size),o.head=new d.Buf16(o.hash_size),o.prev=new d.Buf16(o.w_size),o.lit_bufsize=1<<n+6,o.pending_buf_size=4*o.lit_bufsize,o.pending_buf=new d.Buf8(o.pending_buf_size),o.d_buf=1*o.lit_bufsize,o.l_buf=3*o.lit_bufsize,o.level=e,o.strategy=s,o.method=r,K(t)}h=[new M(0,0,0,0,function(t,e){var r=65535;for(r>t.pending_buf_size-5&&(r=t.pending_buf_size-5);;){if(t.lookahead<=1){if(j(t),0===t.lookahead&&e===l)return A;if(0===t.lookahead)break}t.strstart+=t.lookahead,t.lookahead=0;var i=t.block_start+r;if((0===t.strstart||t.strstart>=i)&&(t.lookahead=t.strstart-i,t.strstart=i,N(t,!1),0===t.strm.avail_out))return A;if(t.strstart-t.block_start>=t.w_size-z&&(N(t,!1),0===t.strm.avail_out))return A}return t.insert=0,e===f?(N(t,!0),0===t.strm.avail_out?O:B):(t.strstart>t.block_start&&(N(t,!1),t.strm.avail_out),A)}),new M(4,4,8,4,Z),new M(4,5,16,8,Z),new M(4,6,32,32,Z),new M(4,4,16,16,W),new M(8,16,32,32,W),new M(8,16,128,128,W),new M(8,32,128,256,W),new M(32,128,258,1024,W),new M(32,258,258,4096,W)],r.deflateInit=function(t,e){return Y(t,e,v,15,8,0)},r.deflateInit2=Y,r.deflateReset=K,r.deflateResetKeep=G,r.deflateSetHeader=function(t,e){return t&&t.state?2!==t.state.wrap?_:(t.state.gzhead=e,m):_},r.deflate=function(t,e){var r,i,n,s;if(!t||!t.state||5<e||e<0)return t?R(t,_):_;if(i=t.state,!t.output||!t.input&&0!==t.avail_in||666===i.status&&e!==f)return R(t,0===t.avail_out?-5:_);if(i.strm=t,r=i.last_flush,i.last_flush=e,i.status===C)if(2===i.wrap)t.adler=0,U(i,31),U(i,139),U(i,8),i.gzhead?(U(i,(i.gzhead.text?1:0)+(i.gzhead.hcrc?2:0)+(i.gzhead.extra?4:0)+(i.gzhead.name?8:0)+(i.gzhead.comment?16:0)),U(i,255&i.gzhead.time),U(i,i.gzhead.time>>8&255),U(i,i.gzhead.time>>16&255),U(i,i.gzhead.time>>24&255),U(i,9===i.level?2:2<=i.strategy||i.level<2?4:0),U(i,255&i.gzhead.os),i.gzhead.extra&&i.gzhead.extra.length&&(U(i,255&i.gzhead.extra.length),U(i,i.gzhead.extra.length>>8&255)),i.gzhead.hcrc&&(t.adler=p(t.adler,i.pending_buf,i.pending,0)),i.gzindex=0,i.status=69):(U(i,0),U(i,0),U(i,0),U(i,0),U(i,0),U(i,9===i.level?2:2<=i.strategy||i.level<2?4:0),U(i,3),i.status=E);else{var a=v+(i.w_bits-8<<4)<<8;a|=(2<=i.strategy||i.level<2?0:i.level<6?1:6===i.level?2:3)<<6,0!==i.strstart&&(a|=32),a+=31-a%31,i.status=E,P(i,a),0!==i.strstart&&(P(i,t.adler>>>16),P(i,65535&t.adler)),t.adler=1}if(69===i.status)if(i.gzhead.extra){for(n=i.pending;i.gzindex<(65535&i.gzhead.extra.length)&&(i.pending!==i.pending_buf_size||(i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),F(t),n=i.pending,i.pending!==i.pending_buf_size));)U(i,255&i.gzhead.extra[i.gzindex]),i.gzindex++;i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),i.gzindex===i.gzhead.extra.length&&(i.gzindex=0,i.status=73)}else i.status=73;if(73===i.status)if(i.gzhead.name){n=i.pending;do{if(i.pending===i.pending_buf_size&&(i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),F(t),n=i.pending,i.pending===i.pending_buf_size)){s=1;break}s=i.gzindex<i.gzhead.name.length?255&i.gzhead.name.charCodeAt(i.gzindex++):0,U(i,s)}while(0!==s);i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),0===s&&(i.gzindex=0,i.status=91)}else i.status=91;if(91===i.status)if(i.gzhead.comment){n=i.pending;do{if(i.pending===i.pending_buf_size&&(i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),F(t),n=i.pending,i.pending===i.pending_buf_size)){s=1;break}s=i.gzindex<i.gzhead.comment.length?255&i.gzhead.comment.charCodeAt(i.gzindex++):0,U(i,s)}while(0!==s);i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),0===s&&(i.status=103)}else i.status=103;if(103===i.status&&(i.gzhead.hcrc?(i.pending+2>i.pending_buf_size&&F(t),i.pending+2<=i.pending_buf_size&&(U(i,255&t.adler),U(i,t.adler>>8&255),t.adler=0,i.status=E)):i.status=E),0!==i.pending){if(F(t),0===t.avail_out)return i.last_flush=-1,m}else if(0===t.avail_in&&T(e)<=T(r)&&e!==f)return R(t,-5);if(666===i.status&&0!==t.avail_in)return R(t,-5);if(0!==t.avail_in||0!==i.lookahead||e!==l&&666!==i.status){var o=2===i.strategy?function(t,e){for(var r;;){if(0===t.lookahead&&(j(t),0===t.lookahead)){if(e===l)return A;break}if(t.match_length=0,r=u._tr_tally(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++,r&&(N(t,!1),0===t.strm.avail_out))return A}return t.insert=0,e===f?(N(t,!0),0===t.strm.avail_out?O:B):t.last_lit&&(N(t,!1),0===t.strm.avail_out)?A:I}(i,e):3===i.strategy?function(t,e){for(var r,i,n,s,a=t.window;;){if(t.lookahead<=S){if(j(t),t.lookahead<=S&&e===l)return A;if(0===t.lookahead)break}if(t.match_length=0,t.lookahead>=x&&0<t.strstart&&(i=a[n=t.strstart-1])===a[++n]&&i===a[++n]&&i===a[++n]){s=t.strstart+S;do{}while(i===a[++n]&&i===a[++n]&&i===a[++n]&&i===a[++n]&&i===a[++n]&&i===a[++n]&&i===a[++n]&&i===a[++n]&&n<s);t.match_length=S-(s-n),t.match_length>t.lookahead&&(t.match_length=t.lookahead)}if(t.match_length>=x?(r=u._tr_tally(t,1,t.match_length-x),t.lookahead-=t.match_length,t.strstart+=t.match_length,t.match_length=0):(r=u._tr_tally(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++),r&&(N(t,!1),0===t.strm.avail_out))return A}return t.insert=0,e===f?(N(t,!0),0===t.strm.avail_out?O:B):t.last_lit&&(N(t,!1),0===t.strm.avail_out)?A:I}(i,e):h[i.level].func(i,e);if(o!==O&&o!==B||(i.status=666),o===A||o===O)return 0===t.avail_out&&(i.last_flush=-1),m;if(o===I&&(1===e?u._tr_align(i):5!==e&&(u._tr_stored_block(i,0,0,!1),3===e&&(D(i.head),0===i.lookahead&&(i.strstart=0,i.block_start=0,i.insert=0))),F(t),0===t.avail_out))return i.last_flush=-1,m}return e!==f?m:i.wrap<=0?1:(2===i.wrap?(U(i,255&t.adler),U(i,t.adler>>8&255),U(i,t.adler>>16&255),U(i,t.adler>>24&255),U(i,255&t.total_in),U(i,t.total_in>>8&255),U(i,t.total_in>>16&255),U(i,t.total_in>>24&255)):(P(i,t.adler>>>16),P(i,65535&t.adler)),F(t),0<i.wrap&&(i.wrap=-i.wrap),0!==i.pending?m:1)},r.deflateEnd=function(t){var e;return t&&t.state?(e=t.state.status)!==C&&69!==e&&73!==e&&91!==e&&103!==e&&e!==E&&666!==e?R(t,_):(t.state=null,e===E?R(t,-3):m):_},r.deflateSetDictionary=function(t,e){var r,i,n,s,a,o,h,u,l=e.length;if(!t||!t.state)return _;if(2===(s=(r=t.state).wrap)||1===s&&r.status!==C||r.lookahead)return _;for(1===s&&(t.adler=c(t.adler,e,l,0)),r.wrap=0,l>=r.w_size&&(0===s&&(D(r.head),r.strstart=0,r.block_start=0,r.insert=0),u=new d.Buf8(r.w_size),d.arraySet(u,e,l-r.w_size,r.w_size,0),e=u,l=r.w_size),a=t.avail_in,o=t.next_in,h=t.input,t.avail_in=l,t.next_in=0,t.input=e,j(r);r.lookahead>=x;){for(i=r.strstart,n=r.lookahead-(x-1);r.ins_h=(r.ins_h<<r.hash_shift^r.window[i+x-1])&r.hash_mask,r.prev[i&r.w_mask]=r.head[r.ins_h],r.head[r.ins_h]=i,i++,--n;);r.strstart=i,r.lookahead=x-1,j(r)}return r.strstart+=r.lookahead,r.block_start=r.strstart,r.insert=r.lookahead,r.lookahead=0,r.match_length=r.prev_length=x-1,r.match_available=0,t.next_in=o,t.input=h,t.avail_in=a,r.wrap=s,m},r.deflateInfo="pako deflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(t,e,r){"use strict";e.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},{}],48:[function(t,e,r){"use strict";e.exports=function(t,e){var r,i,n,s,a,o,h,u,l,f,d,c,p,m,_,g,b,v,y,w,k,x,S,z,C;r=t.state,i=t.next_in,z=t.input,n=i+(t.avail_in-5),s=t.next_out,C=t.output,a=s-(e-t.avail_out),o=s+(t.avail_out-257),h=r.dmax,u=r.wsize,l=r.whave,f=r.wnext,d=r.window,c=r.hold,p=r.bits,m=r.lencode,_=r.distcode,g=(1<<r.lenbits)-1,b=(1<<r.distbits)-1;t:do{p<15&&(c+=z[i++]<<p,p+=8,c+=z[i++]<<p,p+=8),v=m[c&g];e:for(;;){if(c>>>=y=v>>>24,p-=y,0===(y=v>>>16&255))C[s++]=65535&v;else{if(!(16&y)){if(0==(64&y)){v=m[(65535&v)+(c&(1<<y)-1)];continue e}if(32&y){r.mode=12;break t}t.msg="invalid literal/length code",r.mode=30;break t}w=65535&v,(y&=15)&&(p<y&&(c+=z[i++]<<p,p+=8),w+=c&(1<<y)-1,c>>>=y,p-=y),p<15&&(c+=z[i++]<<p,p+=8,c+=z[i++]<<p,p+=8),v=_[c&b];r:for(;;){if(c>>>=y=v>>>24,p-=y,!(16&(y=v>>>16&255))){if(0==(64&y)){v=_[(65535&v)+(c&(1<<y)-1)];continue r}t.msg="invalid distance code",r.mode=30;break t}if(k=65535&v,p<(y&=15)&&(c+=z[i++]<<p,(p+=8)<y&&(c+=z[i++]<<p,p+=8)),h<(k+=c&(1<<y)-1)){t.msg="invalid distance too far back",r.mode=30;break t}if(c>>>=y,p-=y,(y=s-a)<k){if(l<(y=k-y)&&r.sane){t.msg="invalid distance too far back",r.mode=30;break t}if(S=d,(x=0)===f){if(x+=u-y,y<w){for(w-=y;C[s++]=d[x++],--y;);x=s-k,S=C}}else if(f<y){if(x+=u+f-y,(y-=f)<w){for(w-=y;C[s++]=d[x++],--y;);if(x=0,f<w){for(w-=y=f;C[s++]=d[x++],--y;);x=s-k,S=C}}}else if(x+=f-y,y<w){for(w-=y;C[s++]=d[x++],--y;);x=s-k,S=C}for(;2<w;)C[s++]=S[x++],C[s++]=S[x++],C[s++]=S[x++],w-=3;w&&(C[s++]=S[x++],1<w&&(C[s++]=S[x++]))}else{for(x=s-k;C[s++]=C[x++],C[s++]=C[x++],C[s++]=C[x++],2<(w-=3););w&&(C[s++]=C[x++],1<w&&(C[s++]=C[x++]))}break}}break}}while(i<n&&s<o);i-=w=p>>3,c&=(1<<(p-=w<<3))-1,t.next_in=i,t.next_out=s,t.avail_in=i<n?n-i+5:5-(i-n),t.avail_out=s<o?o-s+257:257-(s-o),r.hold=c,r.bits=p}},{}],49:[function(t,e,r){"use strict";var I=t("../utils/common"),O=t("./adler32"),B=t("./crc32"),R=t("./inffast"),T=t("./inftrees"),D=1,F=2,N=0,U=-2,P=1,i=852,n=592;function L(t){return(t>>>24&255)+(t>>>8&65280)+((65280&t)<<8)+((255&t)<<24)}function s(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new I.Buf16(320),this.work=new I.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function a(t){var e;return t&&t.state?(e=t.state,t.total_in=t.total_out=e.total=0,t.msg="",e.wrap&&(t.adler=1&e.wrap),e.mode=P,e.last=0,e.havedict=0,e.dmax=32768,e.head=null,e.hold=0,e.bits=0,e.lencode=e.lendyn=new I.Buf32(i),e.distcode=e.distdyn=new I.Buf32(n),e.sane=1,e.back=-1,N):U}function o(t){var e;return t&&t.state?((e=t.state).wsize=0,e.whave=0,e.wnext=0,a(t)):U}function h(t,e){var r,i;return t&&t.state?(i=t.state,e<0?(r=0,e=-e):(r=1+(e>>4),e<48&&(e&=15)),e&&(e<8||15<e)?U:(null!==i.window&&i.wbits!==e&&(i.window=null),i.wrap=r,i.wbits=e,o(t))):U}function u(t,e){var r,i;return t?(i=new s,(t.state=i).window=null,(r=h(t,e))!==N&&(t.state=null),r):U}var l,f,d=!0;function j(t){if(d){var e;for(l=new I.Buf32(512),f=new I.Buf32(32),e=0;e<144;)t.lens[e++]=8;for(;e<256;)t.lens[e++]=9;for(;e<280;)t.lens[e++]=7;for(;e<288;)t.lens[e++]=8;for(T(D,t.lens,0,288,l,0,t.work,{bits:9}),e=0;e<32;)t.lens[e++]=5;T(F,t.lens,0,32,f,0,t.work,{bits:5}),d=!1}t.lencode=l,t.lenbits=9,t.distcode=f,t.distbits=5}function Z(t,e,r,i){var n,s=t.state;return null===s.window&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new I.Buf8(s.wsize)),i>=s.wsize?(I.arraySet(s.window,e,r-s.wsize,s.wsize,0),s.wnext=0,s.whave=s.wsize):(i<(n=s.wsize-s.wnext)&&(n=i),I.arraySet(s.window,e,r-i,n,s.wnext),(i-=n)?(I.arraySet(s.window,e,r-i,i,0),s.wnext=i,s.whave=s.wsize):(s.wnext+=n,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=n))),0}r.inflateReset=o,r.inflateReset2=h,r.inflateResetKeep=a,r.inflateInit=function(t){return u(t,15)},r.inflateInit2=u,r.inflate=function(t,e){var r,i,n,s,a,o,h,u,l,f,d,c,p,m,_,g,b,v,y,w,k,x,S,z,C=0,E=new I.Buf8(4),A=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!t||!t.state||!t.output||!t.input&&0!==t.avail_in)return U;12===(r=t.state).mode&&(r.mode=13),a=t.next_out,n=t.output,h=t.avail_out,s=t.next_in,i=t.input,o=t.avail_in,u=r.hold,l=r.bits,f=o,d=h,x=N;t:for(;;)switch(r.mode){case P:if(0===r.wrap){r.mode=13;break}for(;l<16;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(2&r.wrap&&35615===u){E[r.check=0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0),l=u=0,r.mode=2;break}if(r.flags=0,r.head&&(r.head.done=!1),!(1&r.wrap)||(((255&u)<<8)+(u>>8))%31){t.msg="incorrect header check",r.mode=30;break}if(8!=(15&u)){t.msg="unknown compression method",r.mode=30;break}if(l-=4,k=8+(15&(u>>>=4)),0===r.wbits)r.wbits=k;else if(k>r.wbits){t.msg="invalid window size",r.mode=30;break}r.dmax=1<<k,t.adler=r.check=1,r.mode=512&u?10:12,l=u=0;break;case 2:for(;l<16;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(r.flags=u,8!=(255&r.flags)){t.msg="unknown compression method",r.mode=30;break}if(57344&r.flags){t.msg="unknown header flags set",r.mode=30;break}r.head&&(r.head.text=u>>8&1),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=3;case 3:for(;l<32;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}r.head&&(r.head.time=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,E[2]=u>>>16&255,E[3]=u>>>24&255,r.check=B(r.check,E,4,0)),l=u=0,r.mode=4;case 4:for(;l<16;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}r.head&&(r.head.xflags=255&u,r.head.os=u>>8),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=5;case 5:if(1024&r.flags){for(;l<16;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}r.length=u,r.head&&(r.head.extra_len=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0}else r.head&&(r.head.extra=null);r.mode=6;case 6:if(1024&r.flags&&(o<(c=r.length)&&(c=o),c&&(r.head&&(k=r.head.extra_len-r.length,r.head.extra||(r.head.extra=new Array(r.head.extra_len)),I.arraySet(r.head.extra,i,s,c,k)),512&r.flags&&(r.check=B(r.check,i,c,s)),o-=c,s+=c,r.length-=c),r.length))break t;r.length=0,r.mode=7;case 7:if(2048&r.flags){if(0===o)break t;for(c=0;k=i[s+c++],r.head&&k&&r.length<65536&&(r.head.name+=String.fromCharCode(k)),k&&c<o;);if(512&r.flags&&(r.check=B(r.check,i,c,s)),o-=c,s+=c,k)break t}else r.head&&(r.head.name=null);r.length=0,r.mode=8;case 8:if(4096&r.flags){if(0===o)break t;for(c=0;k=i[s+c++],r.head&&k&&r.length<65536&&(r.head.comment+=String.fromCharCode(k)),k&&c<o;);if(512&r.flags&&(r.check=B(r.check,i,c,s)),o-=c,s+=c,k)break t}else r.head&&(r.head.comment=null);r.mode=9;case 9:if(512&r.flags){for(;l<16;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(u!==(65535&r.check)){t.msg="header crc mismatch",r.mode=30;break}l=u=0}r.head&&(r.head.hcrc=r.flags>>9&1,r.head.done=!0),t.adler=r.check=0,r.mode=12;break;case 10:for(;l<32;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}t.adler=r.check=L(u),l=u=0,r.mode=11;case 11:if(0===r.havedict)return t.next_out=a,t.avail_out=h,t.next_in=s,t.avail_in=o,r.hold=u,r.bits=l,2;t.adler=r.check=1,r.mode=12;case 12:if(5===e||6===e)break t;case 13:if(r.last){u>>>=7&l,l-=7&l,r.mode=27;break}for(;l<3;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}switch(r.last=1&u,l-=1,3&(u>>>=1)){case 0:r.mode=14;break;case 1:if(j(r),r.mode=20,6!==e)break;u>>>=2,l-=2;break t;case 2:r.mode=17;break;case 3:t.msg="invalid block type",r.mode=30}u>>>=2,l-=2;break;case 14:for(u>>>=7&l,l-=7&l;l<32;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if((65535&u)!=(u>>>16^65535)){t.msg="invalid stored block lengths",r.mode=30;break}if(r.length=65535&u,l=u=0,r.mode=15,6===e)break t;case 15:r.mode=16;case 16:if(c=r.length){if(o<c&&(c=o),h<c&&(c=h),0===c)break t;I.arraySet(n,i,s,c,a),o-=c,s+=c,h-=c,a+=c,r.length-=c;break}r.mode=12;break;case 17:for(;l<14;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(r.nlen=257+(31&u),u>>>=5,l-=5,r.ndist=1+(31&u),u>>>=5,l-=5,r.ncode=4+(15&u),u>>>=4,l-=4,286<r.nlen||30<r.ndist){t.msg="too many length or distance symbols",r.mode=30;break}r.have=0,r.mode=18;case 18:for(;r.have<r.ncode;){for(;l<3;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}r.lens[A[r.have++]]=7&u,u>>>=3,l-=3}for(;r.have<19;)r.lens[A[r.have++]]=0;if(r.lencode=r.lendyn,r.lenbits=7,S={bits:r.lenbits},x=T(0,r.lens,0,19,r.lencode,0,r.work,S),r.lenbits=S.bits,x){t.msg="invalid code lengths set",r.mode=30;break}r.have=0,r.mode=19;case 19:for(;r.have<r.nlen+r.ndist;){for(;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(b<16)u>>>=_,l-=_,r.lens[r.have++]=b;else{if(16===b){for(z=_+2;l<z;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(u>>>=_,l-=_,0===r.have){t.msg="invalid bit length repeat",r.mode=30;break}k=r.lens[r.have-1],c=3+(3&u),u>>>=2,l-=2}else if(17===b){for(z=_+3;l<z;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}l-=_,k=0,c=3+(7&(u>>>=_)),u>>>=3,l-=3}else{for(z=_+7;l<z;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}l-=_,k=0,c=11+(127&(u>>>=_)),u>>>=7,l-=7}if(r.have+c>r.nlen+r.ndist){t.msg="invalid bit length repeat",r.mode=30;break}for(;c--;)r.lens[r.have++]=k}}if(30===r.mode)break;if(0===r.lens[256]){t.msg="invalid code -- missing end-of-block",r.mode=30;break}if(r.lenbits=9,S={bits:r.lenbits},x=T(D,r.lens,0,r.nlen,r.lencode,0,r.work,S),r.lenbits=S.bits,x){t.msg="invalid literal/lengths set",r.mode=30;break}if(r.distbits=6,r.distcode=r.distdyn,S={bits:r.distbits},x=T(F,r.lens,r.nlen,r.ndist,r.distcode,0,r.work,S),r.distbits=S.bits,x){t.msg="invalid distances set",r.mode=30;break}if(r.mode=20,6===e)break t;case 20:r.mode=21;case 21:if(6<=o&&258<=h){t.next_out=a,t.avail_out=h,t.next_in=s,t.avail_in=o,r.hold=u,r.bits=l,R(t,d),a=t.next_out,n=t.output,h=t.avail_out,s=t.next_in,i=t.input,o=t.avail_in,u=r.hold,l=r.bits,12===r.mode&&(r.back=-1);break}for(r.back=0;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(g&&0==(240&g)){for(v=_,y=g,w=b;g=(C=r.lencode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,r.length=b,0===g){r.mode=26;break}if(32&g){r.back=-1,r.mode=12;break}if(64&g){t.msg="invalid literal/length code",r.mode=30;break}r.extra=15&g,r.mode=22;case 22:if(r.extra){for(z=r.extra;l<z;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}r.length+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}r.was=r.length,r.mode=23;case 23:for(;g=(C=r.distcode[u&(1<<r.distbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(0==(240&g)){for(v=_,y=g,w=b;g=(C=r.distcode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,64&g){t.msg="invalid distance code",r.mode=30;break}r.offset=b,r.extra=15&g,r.mode=24;case 24:if(r.extra){for(z=r.extra;l<z;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}r.offset+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}if(r.offset>r.dmax){t.msg="invalid distance too far back",r.mode=30;break}r.mode=25;case 25:if(0===h)break t;if(c=d-h,r.offset>c){if((c=r.offset-c)>r.whave&&r.sane){t.msg="invalid distance too far back",r.mode=30;break}p=c>r.wnext?(c-=r.wnext,r.wsize-c):r.wnext-c,c>r.length&&(c=r.length),m=r.window}else m=n,p=a-r.offset,c=r.length;for(h<c&&(c=h),h-=c,r.length-=c;n[a++]=m[p++],--c;);0===r.length&&(r.mode=21);break;case 26:if(0===h)break t;n[a++]=r.length,h--,r.mode=21;break;case 27:if(r.wrap){for(;l<32;){if(0===o)break t;o--,u|=i[s++]<<l,l+=8}if(d-=h,t.total_out+=d,r.total+=d,d&&(t.adler=r.check=r.flags?B(r.check,n,d,a-d):O(r.check,n,d,a-d)),d=h,(r.flags?u:L(u))!==r.check){t.msg="incorrect data check",r.mode=30;break}l=u=0}r.mode=28;case 28:if(r.wrap&&r.flags){for(;l<32;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(u!==(4294967295&r.total)){t.msg="incorrect length check",r.mode=30;break}l=u=0}r.mode=29;case 29:x=1;break t;case 30:x=-3;break t;case 31:return-4;case 32:default:return U}return t.next_out=a,t.avail_out=h,t.next_in=s,t.avail_in=o,r.hold=u,r.bits=l,(r.wsize||d!==t.avail_out&&r.mode<30&&(r.mode<27||4!==e))&&Z(t,t.output,t.next_out,d-t.avail_out)?(r.mode=31,-4):(f-=t.avail_in,d-=t.avail_out,t.total_in+=f,t.total_out+=d,r.total+=d,r.wrap&&d&&(t.adler=r.check=r.flags?B(r.check,n,d,t.next_out-d):O(r.check,n,d,t.next_out-d)),t.data_type=r.bits+(r.last?64:0)+(12===r.mode?128:0)+(20===r.mode||15===r.mode?256:0),(0==f&&0===d||4===e)&&x===N&&(x=-5),x)},r.inflateEnd=function(t){if(!t||!t.state)return U;var e=t.state;return e.window&&(e.window=null),t.state=null,N},r.inflateGetHeader=function(t,e){var r;return t&&t.state?0==(2&(r=t.state).wrap)?U:((r.head=e).done=!1,N):U},r.inflateSetDictionary=function(t,e){var r,i=e.length;return t&&t.state?0!==(r=t.state).wrap&&11!==r.mode?U:11===r.mode&&O(1,e,i,0)!==r.check?-3:Z(t,e,i,i)?(r.mode=31,-4):(r.havedict=1,N):U},r.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(t,e,r){"use strict";var D=t("../utils/common"),F=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],N=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],U=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],P=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];e.exports=function(t,e,r,i,n,s,a,o){var h,u,l,f,d,c,p,m,_,g=o.bits,b=0,v=0,y=0,w=0,k=0,x=0,S=0,z=0,C=0,E=0,A=null,I=0,O=new D.Buf16(16),B=new D.Buf16(16),R=null,T=0;for(b=0;b<=15;b++)O[b]=0;for(v=0;v<i;v++)O[e[r+v]]++;for(k=g,w=15;1<=w&&0===O[w];w--);if(w<k&&(k=w),0===w)return n[s++]=20971520,n[s++]=20971520,o.bits=1,0;for(y=1;y<w&&0===O[y];y++);for(k<y&&(k=y),b=z=1;b<=15;b++)if(z<<=1,(z-=O[b])<0)return-1;if(0<z&&(0===t||1!==w))return-1;for(B[1]=0,b=1;b<15;b++)B[b+1]=B[b]+O[b];for(v=0;v<i;v++)0!==e[r+v]&&(a[B[e[r+v]]++]=v);if(c=0===t?(A=R=a,19):1===t?(A=F,I-=257,R=N,T-=257,256):(A=U,R=P,-1),b=y,d=s,S=v=E=0,l=-1,f=(C=1<<(x=k))-1,1===t&&852<C||2===t&&592<C)return 1;for(;;){for(p=b-S,_=a[v]<c?(m=0,a[v]):a[v]>c?(m=R[T+a[v]],A[I+a[v]]):(m=96,0),h=1<<b-S,y=u=1<<x;n[d+(E>>S)+(u-=h)]=p<<24|m<<16|_|0,0!==u;);for(h=1<<b-1;E&h;)h>>=1;if(0!==h?(E&=h-1,E+=h):E=0,v++,0==--O[b]){if(b===w)break;b=e[r+a[v]]}if(k<b&&(E&f)!==l){for(0===S&&(S=k),d+=y,z=1<<(x=b-S);x+S<w&&!((z-=O[x+S])<=0);)x++,z<<=1;if(C+=1<<x,1===t&&852<C||2===t&&592<C)return 1;n[l=E&f]=k<<24|x<<16|d-s|0}}return 0!==E&&(n[d+E]=b-S<<24|64<<16|0),o.bits=k,0}},{"../utils/common":41}],51:[function(t,e,r){"use strict";e.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],52:[function(t,e,r){"use strict";var n=t("../utils/common"),o=0,h=1;function i(t){for(var e=t.length;0<=--e;)t[e]=0}var s=0,a=29,u=256,l=u+1+a,f=30,d=19,_=2*l+1,g=15,c=16,p=7,m=256,b=16,v=17,y=18,w=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],k=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],x=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],S=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],z=new Array(2*(l+2));i(z);var C=new Array(2*f);i(C);var E=new Array(512);i(E);var A=new Array(256);i(A);var I=new Array(a);i(I);var O,B,R,T=new Array(f);function D(t,e,r,i,n){this.static_tree=t,this.extra_bits=e,this.extra_base=r,this.elems=i,this.max_length=n,this.has_stree=t&&t.length}function F(t,e){this.dyn_tree=t,this.max_code=0,this.stat_desc=e}function N(t){return t<256?E[t]:E[256+(t>>>7)]}function U(t,e){t.pending_buf[t.pending++]=255&e,t.pending_buf[t.pending++]=e>>>8&255}function P(t,e,r){t.bi_valid>c-r?(t.bi_buf|=e<<t.bi_valid&65535,U(t,t.bi_buf),t.bi_buf=e>>c-t.bi_valid,t.bi_valid+=r-c):(t.bi_buf|=e<<t.bi_valid&65535,t.bi_valid+=r)}function L(t,e,r){P(t,r[2*e],r[2*e+1])}function j(t,e){for(var r=0;r|=1&t,t>>>=1,r<<=1,0<--e;);return r>>>1}function Z(t,e,r){var i,n,s=new Array(g+1),a=0;for(i=1;i<=g;i++)s[i]=a=a+r[i-1]<<1;for(n=0;n<=e;n++){var o=t[2*n+1];0!==o&&(t[2*n]=j(s[o]++,o))}}function W(t){var e;for(e=0;e<l;e++)t.dyn_ltree[2*e]=0;for(e=0;e<f;e++)t.dyn_dtree[2*e]=0;for(e=0;e<d;e++)t.bl_tree[2*e]=0;t.dyn_ltree[2*m]=1,t.opt_len=t.static_len=0,t.last_lit=t.matches=0}function M(t){8<t.bi_valid?U(t,t.bi_buf):0<t.bi_valid&&(t.pending_buf[t.pending++]=t.bi_buf),t.bi_buf=0,t.bi_valid=0}function H(t,e,r,i){var n=2*e,s=2*r;return t[n]<t[s]||t[n]===t[s]&&i[e]<=i[r]}function G(t,e,r){for(var i=t.heap[r],n=r<<1;n<=t.heap_len&&(n<t.heap_len&&H(e,t.heap[n+1],t.heap[n],t.depth)&&n++,!H(e,i,t.heap[n],t.depth));)t.heap[r]=t.heap[n],r=n,n<<=1;t.heap[r]=i}function K(t,e,r){var i,n,s,a,o=0;if(0!==t.last_lit)for(;i=t.pending_buf[t.d_buf+2*o]<<8|t.pending_buf[t.d_buf+2*o+1],n=t.pending_buf[t.l_buf+o],o++,0===i?L(t,n,e):(L(t,(s=A[n])+u+1,e),0!==(a=w[s])&&P(t,n-=I[s],a),L(t,s=N(--i),r),0!==(a=k[s])&&P(t,i-=T[s],a)),o<t.last_lit;);L(t,m,e)}function Y(t,e){var r,i,n,s=e.dyn_tree,a=e.stat_desc.static_tree,o=e.stat_desc.has_stree,h=e.stat_desc.elems,u=-1;for(t.heap_len=0,t.heap_max=_,r=0;r<h;r++)0!==s[2*r]?(t.heap[++t.heap_len]=u=r,t.depth[r]=0):s[2*r+1]=0;for(;t.heap_len<2;)s[2*(n=t.heap[++t.heap_len]=u<2?++u:0)]=1,t.depth[n]=0,t.opt_len--,o&&(t.static_len-=a[2*n+1]);for(e.max_code=u,r=t.heap_len>>1;1<=r;r--)G(t,s,r);for(n=h;r=t.heap[1],t.heap[1]=t.heap[t.heap_len--],G(t,s,1),i=t.heap[1],t.heap[--t.heap_max]=r,t.heap[--t.heap_max]=i,s[2*n]=s[2*r]+s[2*i],t.depth[n]=(t.depth[r]>=t.depth[i]?t.depth[r]:t.depth[i])+1,s[2*r+1]=s[2*i+1]=n,t.heap[1]=n++,G(t,s,1),2<=t.heap_len;);t.heap[--t.heap_max]=t.heap[1],function(t,e){var r,i,n,s,a,o,h=e.dyn_tree,u=e.max_code,l=e.stat_desc.static_tree,f=e.stat_desc.has_stree,d=e.stat_desc.extra_bits,c=e.stat_desc.extra_base,p=e.stat_desc.max_length,m=0;for(s=0;s<=g;s++)t.bl_count[s]=0;for(h[2*t.heap[t.heap_max]+1]=0,r=t.heap_max+1;r<_;r++)p<(s=h[2*h[2*(i=t.heap[r])+1]+1]+1)&&(s=p,m++),h[2*i+1]=s,u<i||(t.bl_count[s]++,a=0,c<=i&&(a=d[i-c]),o=h[2*i],t.opt_len+=o*(s+a),f&&(t.static_len+=o*(l[2*i+1]+a)));if(0!==m){do{for(s=p-1;0===t.bl_count[s];)s--;t.bl_count[s]--,t.bl_count[s+1]+=2,t.bl_count[p]--,m-=2}while(0<m);for(s=p;0!==s;s--)for(i=t.bl_count[s];0!==i;)u<(n=t.heap[--r])||(h[2*n+1]!==s&&(t.opt_len+=(s-h[2*n+1])*h[2*n],h[2*n+1]=s),i--)}}(t,e),Z(s,u,t.bl_count)}function X(t,e,r){var i,n,s=-1,a=e[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),e[2*(r+1)+1]=65535,i=0;i<=r;i++)n=a,a=e[2*(i+1)+1],++o<h&&n===a||(o<u?t.bl_tree[2*n]+=o:0!==n?(n!==s&&t.bl_tree[2*n]++,t.bl_tree[2*b]++):o<=10?t.bl_tree[2*v]++:t.bl_tree[2*y]++,s=n,u=(o=0)===a?(h=138,3):n===a?(h=6,3):(h=7,4))}function V(t,e,r){var i,n,s=-1,a=e[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),i=0;i<=r;i++)if(n=a,a=e[2*(i+1)+1],!(++o<h&&n===a)){if(o<u)for(;L(t,n,t.bl_tree),0!=--o;);else 0!==n?(n!==s&&(L(t,n,t.bl_tree),o--),L(t,b,t.bl_tree),P(t,o-3,2)):o<=10?(L(t,v,t.bl_tree),P(t,o-3,3)):(L(t,y,t.bl_tree),P(t,o-11,7));s=n,u=(o=0)===a?(h=138,3):n===a?(h=6,3):(h=7,4)}}i(T);var q=!1;function J(t,e,r,i){P(t,(s<<1)+(i?1:0),3),function(t,e,r,i){M(t),i&&(U(t,r),U(t,~r)),n.arraySet(t.pending_buf,t.window,e,r,t.pending),t.pending+=r}(t,e,r,!0)}r._tr_init=function(t){q||(function(){var t,e,r,i,n,s=new Array(g+1);for(i=r=0;i<a-1;i++)for(I[i]=r,t=0;t<1<<w[i];t++)A[r++]=i;for(A[r-1]=i,i=n=0;i<16;i++)for(T[i]=n,t=0;t<1<<k[i];t++)E[n++]=i;for(n>>=7;i<f;i++)for(T[i]=n<<7,t=0;t<1<<k[i]-7;t++)E[256+n++]=i;for(e=0;e<=g;e++)s[e]=0;for(t=0;t<=143;)z[2*t+1]=8,t++,s[8]++;for(;t<=255;)z[2*t+1]=9,t++,s[9]++;for(;t<=279;)z[2*t+1]=7,t++,s[7]++;for(;t<=287;)z[2*t+1]=8,t++,s[8]++;for(Z(z,l+1,s),t=0;t<f;t++)C[2*t+1]=5,C[2*t]=j(t,5);O=new D(z,w,u+1,l,g),B=new D(C,k,0,f,g),R=new D(new Array(0),x,0,d,p)}(),q=!0),t.l_desc=new F(t.dyn_ltree,O),t.d_desc=new F(t.dyn_dtree,B),t.bl_desc=new F(t.bl_tree,R),t.bi_buf=0,t.bi_valid=0,W(t)},r._tr_stored_block=J,r._tr_flush_block=function(t,e,r,i){var n,s,a=0;0<t.level?(2===t.strm.data_type&&(t.strm.data_type=function(t){var e,r=4093624447;for(e=0;e<=31;e++,r>>>=1)if(1&r&&0!==t.dyn_ltree[2*e])return o;if(0!==t.dyn_ltree[18]||0!==t.dyn_ltree[20]||0!==t.dyn_ltree[26])return h;for(e=32;e<u;e++)if(0!==t.dyn_ltree[2*e])return h;return o}(t)),Y(t,t.l_desc),Y(t,t.d_desc),a=function(t){var e;for(X(t,t.dyn_ltree,t.l_desc.max_code),X(t,t.dyn_dtree,t.d_desc.max_code),Y(t,t.bl_desc),e=d-1;3<=e&&0===t.bl_tree[2*S[e]+1];e--);return t.opt_len+=3*(e+1)+5+5+4,e}(t),n=t.opt_len+3+7>>>3,(s=t.static_len+3+7>>>3)<=n&&(n=s)):n=s=r+5,r+4<=n&&-1!==e?J(t,e,r,i):4===t.strategy||s===n?(P(t,2+(i?1:0),3),K(t,z,C)):(P(t,4+(i?1:0),3),function(t,e,r,i){var n;for(P(t,e-257,5),P(t,r-1,5),P(t,i-4,4),n=0;n<i;n++)P(t,t.bl_tree[2*S[n]+1],3);V(t,t.dyn_ltree,e-1),V(t,t.dyn_dtree,r-1)}(t,t.l_desc.max_code+1,t.d_desc.max_code+1,a+1),K(t,t.dyn_ltree,t.dyn_dtree)),W(t),i&&M(t)},r._tr_tally=function(t,e,r){return t.pending_buf[t.d_buf+2*t.last_lit]=e>>>8&255,t.pending_buf[t.d_buf+2*t.last_lit+1]=255&e,t.pending_buf[t.l_buf+t.last_lit]=255&r,t.last_lit++,0===e?t.dyn_ltree[2*r]++:(t.matches++,e--,t.dyn_ltree[2*(A[r]+u+1)]++,t.dyn_dtree[2*N(e)]++),t.last_lit===t.lit_bufsize-1},r._tr_align=function(t){P(t,2,3),L(t,m,z),function(t){16===t.bi_valid?(U(t,t.bi_buf),t.bi_buf=0,t.bi_valid=0):8<=t.bi_valid&&(t.pending_buf[t.pending++]=255&t.bi_buf,t.bi_buf>>=8,t.bi_valid-=8)}(t)}},{"../utils/common":41}],53:[function(t,e,r){"use strict";e.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},{}],54:[function(t,e,r){"use strict";e.exports="function"==typeof setImmediate?setImmediate:function(){var t=[].slice.apply(arguments);t.splice(1,0,0),setTimeout.apply(null,t)}},{}]},{},[10])(10)});
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"buffer":83}],89:[function(require,module,exports){
exports.Parser = require("./lib/parser").Parser;
exports.rules = require("./lib/rules");
exports.errors = require("./lib/errors");
exports.results = require("./lib/parsing-results");
exports.StringSource = require("./lib/StringSource");
exports.Token = require("./lib/Token");
exports.bottomUp = require("./lib/bottom-up");
exports.RegexTokeniser = require("./lib/regex-tokeniser").RegexTokeniser;

exports.rule = function(ruleBuilder) {
    var rule;
    return function(input) {
        if (!rule) {
            rule = ruleBuilder();
        }
        return rule(input);
    };
};

},{"./lib/StringSource":90,"./lib/Token":91,"./lib/bottom-up":93,"./lib/errors":94,"./lib/parser":96,"./lib/parsing-results":97,"./lib/regex-tokeniser":98,"./lib/rules":99}],90:[function(require,module,exports){
var StringSource = module.exports = function(string, description) {
    var self = {
        asString: function() {
            return string;
        },
        range: function(startIndex, endIndex) {
            return new StringSourceRange(string, description, startIndex, endIndex);
        }
    };
    return self;
};

var StringSourceRange = function(string, description, startIndex, endIndex) {
    this._string = string;
    this._description = description;
    this._startIndex = startIndex;
    this._endIndex = endIndex;
};

StringSourceRange.prototype.to = function(otherRange) {
    // TODO: Assert that tokens are the same across both iterators
    return new StringSourceRange(this._string, this._description, this._startIndex, otherRange._endIndex);
};

StringSourceRange.prototype.describe = function() {
    var position = this._position();
    var description = this._description ? this._description + "\n" : "";
    return description + "Line number: " + position.lineNumber + "\nCharacter number: " + position.characterNumber;
};

StringSourceRange.prototype.lineNumber = function() {
    return this._position().lineNumber;
};

StringSourceRange.prototype.characterNumber = function() {
    return this._position().characterNumber;
};

StringSourceRange.prototype._position = function() {
    var self = this;
    var index = 0;
    var nextNewLine = function() {
        return self._string.indexOf("\n", index);
    };

    var lineNumber = 1;
    while (nextNewLine() !== -1 && nextNewLine() < this._startIndex) {
        index = nextNewLine() + 1;
        lineNumber += 1;
    }
    var characterNumber = this._startIndex - index + 1;
    return {lineNumber: lineNumber, characterNumber: characterNumber};
};

},{}],91:[function(require,module,exports){
module.exports = function(name, value, source) {
    this.name = name;
    this.value = value;
    if (source) {
        this.source = source;
    }
};

},{}],92:[function(require,module,exports){
var TokenIterator = module.exports = function(tokens, startIndex) {
    this._tokens = tokens;
    this._startIndex = startIndex || 0;
};

TokenIterator.prototype.head = function() {
    return this._tokens[this._startIndex];
};

TokenIterator.prototype.tail = function(startIndex) {
    return new TokenIterator(this._tokens, this._startIndex + 1);
};

TokenIterator.prototype.toArray = function() {
    return this._tokens.slice(this._startIndex);
};

TokenIterator.prototype.end = function() {
    return this._tokens[this._tokens.length - 1];
};

// TODO: doesn't need to be a method, can be a separate function,
// which simplifies implementation of the TokenIterator interface
TokenIterator.prototype.to = function(end) {
    var start = this.head().source;
    var endToken = end.head() || end.end();
    return start.to(endToken.source);
};

},{}],93:[function(require,module,exports){
var rules = require("./rules");
var results = require("./parsing-results");

exports.parser = function(name, prefixRules, infixRuleBuilders) {
    var self = {
        rule: rule,
        leftAssociative: leftAssociative,
        rightAssociative: rightAssociative
    };
    
    var infixRules = new InfixRules(infixRuleBuilders.map(createInfixRule));
    var prefixRule = rules.firstOf(name, prefixRules);
    
    function createInfixRule(infixRuleBuilder) {
        return {
            name: infixRuleBuilder.name,
            rule: lazyRule(infixRuleBuilder.ruleBuilder.bind(null, self))
        };
    }
    
    function rule() {
        return createRule(infixRules);
    }
    
    function leftAssociative(name) {
        return createRule(infixRules.untilExclusive(name));
    }
    
    function rightAssociative(name) {
        return createRule(infixRules.untilInclusive(name));
    }
    
    function createRule(infixRules) {
        return apply.bind(null, infixRules);
    }
    
    function apply(infixRules, tokens) {
        var leftResult = prefixRule(tokens);
        if (leftResult.isSuccess()) {
            return infixRules.apply(leftResult);
        } else {
            return leftResult;
        }
    }
    
    return self;
};

function InfixRules(infixRules) {
    function untilExclusive(name) {
        return new InfixRules(infixRules.slice(0, ruleNames().indexOf(name)));
    }
    
    function untilInclusive(name) {
        return new InfixRules(infixRules.slice(0, ruleNames().indexOf(name) + 1));
    }
    
    function ruleNames() {
        return infixRules.map(function(rule) {
            return rule.name;
        });
    }
    
    function apply(leftResult) {
        var currentResult;
        var source;
        while (true) {
            currentResult = applyToTokens(leftResult.remaining());
            if (currentResult.isSuccess()) {
                source = leftResult.source().to(currentResult.source());
                leftResult = results.success(
                    currentResult.value()(leftResult.value(), source),
                    currentResult.remaining(),
                    source
                )
            } else if (currentResult.isFailure()) {
                return leftResult;
            } else {
                return currentResult;
            }
        }
    }
    
    function applyToTokens(tokens) {
        return rules.firstOf("infix", infixRules.map(function(infix) {
            return infix.rule;
        }))(tokens);
    }
    
    return {
        apply: apply,
        untilExclusive: untilExclusive,
        untilInclusive: untilInclusive
    }
}

exports.infix = function(name, ruleBuilder) {
    function map(func) {
        return exports.infix(name, function(parser) {
            var rule = ruleBuilder(parser);
            return function(tokens) {
                var result = rule(tokens);
                return result.map(function(right) {
                    return function(left, source) {
                        return func(left, right, source);
                    };
                });
            };
        });
    }
    
    return {
        name: name,
        ruleBuilder: ruleBuilder,
        map: map
    };
}

// TODO: move into a sensible place and remove duplication
var lazyRule = function(ruleBuilder) {
    var rule;
    return function(input) {
        if (!rule) {
            rule = ruleBuilder();
        }
        return rule(input);
    };
};

},{"./parsing-results":97,"./rules":99}],94:[function(require,module,exports){
exports.error = function(options) {
    return new Error(options);
};

var Error = function(options) {
    this.expected = options.expected;
    this.actual = options.actual;
    this._location = options.location;
};

Error.prototype.describe = function() {
    var locationDescription = this._location ? this._location.describe() + ":\n" : "";
    return locationDescription + "Expected " + this.expected + "\nbut got " + this.actual;
};

Error.prototype.lineNumber = function() {
    return this._location.lineNumber();
};

Error.prototype.characterNumber = function() {
    return this._location.characterNumber();
};

},{}],95:[function(require,module,exports){
var fromArray = exports.fromArray = function(array) {
    var index = 0;
    var hasNext = function() {
        return index < array.length;
    };
    return new LazyIterator({
        hasNext: hasNext,
        next: function() {
            if (!hasNext()) {
                throw new Error("No more elements");
            } else {
                return array[index++];
            }
        }
    });
};

var LazyIterator = function(iterator) {
    this._iterator = iterator;
};

LazyIterator.prototype.map = function(func) {
    var iterator = this._iterator;
    return new LazyIterator({
        hasNext: function() {
            return iterator.hasNext();
        },
        next: function() {
            return func(iterator.next());
        }
    });
};

LazyIterator.prototype.filter = function(condition) {
    var iterator = this._iterator;
    
    var moved = false;
    var hasNext = false;
    var next;
    var moveIfNecessary = function() {
        if (moved) {
            return;
        }
        moved = true;
        hasNext = false;
        while (iterator.hasNext() && !hasNext) {
            next = iterator.next();
            hasNext = condition(next);
        }
    };
    
    return new LazyIterator({
        hasNext: function() {
            moveIfNecessary();
            return hasNext;
        },
        next: function() {
            moveIfNecessary();
            var toReturn = next;
            moved = false;
            return toReturn;
        }
    });
};

LazyIterator.prototype.first = function() {
    var iterator = this._iterator;
    if (this._iterator.hasNext()) {
        return iterator.next();
    } else {
        return null;
    }
};

LazyIterator.prototype.toArray = function() {
    var result = [];
    while (this._iterator.hasNext()) {
        result.push(this._iterator.next());
    }
    return result;
};

},{}],96:[function(require,module,exports){
var TokenIterator = require("./TokenIterator");

exports.Parser = function(options) {
    var parseTokens = function(parser, tokens) {
        return parser(new TokenIterator(tokens));
    };
    
    return {
        parseTokens: parseTokens
    };
};

},{"./TokenIterator":92}],97:[function(require,module,exports){
module.exports = {
    failure: function(errors, remaining) {
        if (errors.length < 1) {
            throw new Error("Failure must have errors");
        }
        return new Result({
            status: "failure",
            remaining: remaining,
            errors: errors
        });
    },
    error: function(errors, remaining) {
        if (errors.length < 1) {
            throw new Error("Failure must have errors");
        }
        return new Result({
            status: "error",
            remaining: remaining,
            errors: errors
        });
    },
    success: function(value, remaining, source) {
        return new Result({
            status: "success",
            value: value,
            source: source,
            remaining: remaining,
            errors: []
        });
    },
    cut: function(remaining) {
        return new Result({
            status: "cut",
            remaining: remaining,
            errors: []
        });
    }
};

var Result = function(options) {
    this._value = options.value;
    this._status = options.status;
    this._hasValue = options.value !== undefined;
    this._remaining = options.remaining;
    this._source = options.source;
    this._errors = options.errors;
};

Result.prototype.map = function(func) {
    if (this._hasValue) {
        return new Result({
            value: func(this._value, this._source),
            status: this._status,
            remaining: this._remaining,
            source: this._source,
            errors: this._errors
        });
    } else {
        return this;
    }
};

Result.prototype.changeRemaining = function(remaining) {
    return new Result({
        value: this._value,
        status: this._status,
        remaining: remaining,
        source: this._source,
        errors: this._errors
    });
};

Result.prototype.isSuccess = function() {
    return this._status === "success" || this._status === "cut";
};

Result.prototype.isFailure = function() {
    return this._status === "failure";
};

Result.prototype.isError = function() {
    return this._status === "error";
};

Result.prototype.isCut = function() {
    return this._status === "cut";
};

Result.prototype.value = function() {
    return this._value;
};

Result.prototype.remaining = function() {
    return this._remaining;
};

Result.prototype.source = function() {
    return this._source;
};

Result.prototype.errors = function() {
    return this._errors;
};

},{}],98:[function(require,module,exports){
var Token = require("./Token");
var StringSource = require("./StringSource");

exports.RegexTokeniser = RegexTokeniser;

function RegexTokeniser(rules) {
    rules = rules.map(function(rule) {
        return {
            name: rule.name,
            regex: new RegExp(rule.regex.source, "g")
        };
    });
    
    function tokenise(input, description) {
        var source = new StringSource(input, description);
        var index = 0;
        var tokens = [];
    
        while (index < input.length) {
            var result = readNextToken(input, index, source);
            index = result.endIndex;
            tokens.push(result.token);
        }
        
        tokens.push(endToken(input, source));
        return tokens;
    }

    function readNextToken(string, startIndex, source) {
        for (var i = 0; i < rules.length; i++) {
            var regex = rules[i].regex;
            regex.lastIndex = startIndex;
            var result = regex.exec(string);
            
            if (result) {
                var endIndex = startIndex + result[0].length;
                if (result.index === startIndex && endIndex > startIndex) {
                    var value = result[1];
                    var token = new Token(
                        rules[i].name,
                        value,
                        source.range(startIndex, endIndex)
                    );
                    return {token: token, endIndex: endIndex};
                }
            }
        }
        var endIndex = startIndex + 1;
        var token = new Token(
            "unrecognisedCharacter",
            string.substring(startIndex, endIndex),
            source.range(startIndex, endIndex)
        );
        return {token: token, endIndex: endIndex};
    }
    
    function endToken(input, source) {
        return new Token(
            "end",
            null,
            source.range(input.length, input.length)
        );
    }
    
    return {
        tokenise: tokenise
    }
}



},{"./StringSource":90,"./Token":91}],99:[function(require,module,exports){
var _ = require("underscore");
var options = require("option");
var results = require("./parsing-results");
var errors = require("./errors");
var lazyIterators = require("./lazy-iterators");

exports.token = function(tokenType, value) {
    var matchValue = value !== undefined;
    return function(input) {
        var token = input.head();
        if (token && token.name === tokenType && (!matchValue || token.value === value)) {
            return results.success(token.value, input.tail(), token.source);
        } else {
            var expected = describeToken({name: tokenType, value: value});
            return describeTokenMismatch(input, expected);
        }
    };
};

exports.tokenOfType = function(tokenType) {
    return exports.token(tokenType);
};

exports.firstOf = function(name, parsers) {
    if (!_.isArray(parsers)) {
        parsers = Array.prototype.slice.call(arguments, 1);
    }
    return function(input) {
        return lazyIterators
            .fromArray(parsers)
            .map(function(parser) {
                return parser(input);
            })
            .filter(function(result) {
                return result.isSuccess() || result.isError();
            })
            .first() || describeTokenMismatch(input, name);
    };
};

exports.then = function(parser, func) {
    return function(input) {
        var result = parser(input);
        if (!result.map) {
            console.log(result);
        }
        return result.map(func);
    };
};

exports.sequence = function() {
    var parsers = Array.prototype.slice.call(arguments, 0);
    var rule = function(input) {
        var result = _.foldl(parsers, function(memo, parser) {
            var result = memo.result;
            var hasCut = memo.hasCut;
            if (!result.isSuccess()) {
                return {result: result, hasCut: hasCut};
            }
            var subResult = parser(result.remaining());
            if (subResult.isCut()) {
                return {result: result, hasCut: true};
            } else if (subResult.isSuccess()) {
                var values;
                if (parser.isCaptured) {
                    values = result.value().withValue(parser, subResult.value());
                } else {
                    values = result.value();
                }
                var remaining = subResult.remaining();
                var source = input.to(remaining);
                return {
                    result: results.success(values, remaining, source),
                    hasCut: hasCut
                };
            } else if (hasCut) {
                return {result: results.error(subResult.errors(), subResult.remaining()), hasCut: hasCut};
            } else {
                return {result: subResult, hasCut: hasCut};
            }
        }, {result: results.success(new SequenceValues(), input), hasCut: false}).result;
        var source = input.to(result.remaining());
        return result.map(function(values) {
            return values.withValue(exports.sequence.source, source);
        });
    };
    rule.head = function() {
        var firstCapture = _.find(parsers, isCapturedRule);
        return exports.then(
            rule,
            exports.sequence.extract(firstCapture)
        );
    };
    rule.map = function(func) {
        return exports.then(
            rule,
            function(result) {
                return func.apply(this, result.toArray());
            }
        );
    };
    
    function isCapturedRule(subRule) {
        return subRule.isCaptured;
    }
    
    return rule;
};

var SequenceValues = function(values, valuesArray) {
    this._values = values || {};
    this._valuesArray = valuesArray || [];
};

SequenceValues.prototype.withValue = function(rule, value) {
    if (rule.captureName && rule.captureName in this._values) {
        throw new Error("Cannot add second value for capture \"" + rule.captureName + "\"");
    } else {
        var newValues = _.clone(this._values);
        newValues[rule.captureName] = value;
        var newValuesArray = this._valuesArray.concat([value]);
        return new SequenceValues(newValues, newValuesArray);
    }
};

SequenceValues.prototype.get = function(rule) {
    if (rule.captureName in this._values) {
        return this._values[rule.captureName];
    } else {
        throw new Error("No value for capture \"" + rule.captureName + "\"");
    }
};

SequenceValues.prototype.toArray = function() {
    return this._valuesArray;
};

exports.sequence.capture = function(rule, name) {
    var captureRule = function() {
        return rule.apply(this, arguments);
    };
    captureRule.captureName = name;
    captureRule.isCaptured = true;
    return captureRule;
};

exports.sequence.extract = function(rule) {
    return function(result) {
        return result.get(rule);
    };
};

exports.sequence.applyValues = function(func) {
    // TODO: check captureName doesn't conflict with source or other captures
    var rules = Array.prototype.slice.call(arguments, 1);
    return function(result) {
        var values = rules.map(function(rule) {
            return result.get(rule);
        });
        return func.apply(this, values);
    };
};

exports.sequence.source = {
    captureName: "☃source☃"
};

exports.sequence.cut = function() {
    return function(input) {
        return results.cut(input);
    };
};

exports.optional = function(rule) {
    return function(input) {
        var result = rule(input);
        if (result.isSuccess()) {
            return result.map(options.some);
        } else if (result.isFailure()) {
            return results.success(options.none, input);
        } else {
            return result;
        }
    };
};

exports.zeroOrMoreWithSeparator = function(rule, separator) {
    return repeatedWithSeparator(rule, separator, false);
};

exports.oneOrMoreWithSeparator = function(rule, separator) {
    return repeatedWithSeparator(rule, separator, true);
};

var zeroOrMore = exports.zeroOrMore = function(rule) {
    return function(input) {
        var values = [];
        var result;
        while ((result = rule(input)) && result.isSuccess()) {
            input = result.remaining();
            values.push(result.value());
        }
        if (result.isError()) {
            return result;
        } else {
            return results.success(values, input);
        }
    };
};

exports.oneOrMore = function(rule) {
    return exports.oneOrMoreWithSeparator(rule, noOpRule);
};

function noOpRule(input) {
    return results.success(null, input);
}

var repeatedWithSeparator = function(rule, separator, isOneOrMore) {
    return function(input) {
        var result = rule(input);
        if (result.isSuccess()) {
            var mainRule = exports.sequence.capture(rule, "main");
            var remainingRule = zeroOrMore(exports.then(
                exports.sequence(separator, mainRule),
                exports.sequence.extract(mainRule)
            ));
            var remainingResult = remainingRule(result.remaining());
            return results.success([result.value()].concat(remainingResult.value()), remainingResult.remaining());
        } else if (isOneOrMore || result.isError()) {
            return result;
        } else {
            return results.success([], input);
        }
    };
};

exports.leftAssociative = function(leftRule, rightRule, func) {
    var rights;
    if (func) {
        rights = [{func: func, rule: rightRule}];
    } else {
        rights = rightRule;
    }
    rights = rights.map(function(right) {
        return exports.then(right.rule, function(rightValue) {
            return function(leftValue, source) {
                return right.func(leftValue, rightValue, source);
            };
        });
    });
    var repeatedRule = exports.firstOf.apply(null, ["rules"].concat(rights));
    
    return function(input) {
        var start = input;
        var leftResult = leftRule(input);
        if (!leftResult.isSuccess()) {
            return leftResult;
        }
        var repeatedResult = repeatedRule(leftResult.remaining());
        while (repeatedResult.isSuccess()) {
            var remaining = repeatedResult.remaining();
            var source = start.to(repeatedResult.remaining());
            var right = repeatedResult.value();
            leftResult = results.success(
                right(leftResult.value(), source),
                remaining,
                source
            );
            repeatedResult = repeatedRule(leftResult.remaining());
        }
        if (repeatedResult.isError()) {
            return repeatedResult;
        }
        return leftResult;
    };
};

exports.leftAssociative.firstOf = function() {
    return Array.prototype.slice.call(arguments, 0);
};

exports.nonConsuming = function(rule) {
    return function(input) {
        return rule(input).changeRemaining(input);
    };
};

var describeToken = function(token) {
    if (token.value) {
        return token.name + " \"" + token.value + "\"";
    } else {
        return token.name;
    }
};

function describeTokenMismatch(input, expected) {
    var error;
    var token = input.head();
    if (token) {
        error = errors.error({
            expected: expected,
            actual: describeToken(token),
            location: token.source
        });
    } else {
        error = errors.error({
            expected: expected,
            actual: "end of tokens"
        });
    }
    return results.failure([error], input);
}

},{"./errors":94,"./lazy-iterators":95,"./parsing-results":97,"option":100,"underscore":102}],100:[function(require,module,exports){
exports.none = Object.create({
    value: function() {
        throw new Error('Called value on none');
    },
    isNone: function() {
        return true;
    },
    isSome: function() {
        return false;
    },
    map: function() {
        return exports.none;
    },
    flatMap: function() {
        return exports.none;
    },
    filter: function() {
        return exports.none;
    },
    toArray: function() {
        return [];
    },
    orElse: callOrReturn,
    valueOrElse: callOrReturn
});

function callOrReturn(value) {
    if (typeof(value) == "function") {
        return value();
    } else {
        return value;
    }
}

exports.some = function(value) {
    return new Some(value);
};

var Some = function(value) {
    this._value = value;
};

Some.prototype.value = function() {
    return this._value;
};

Some.prototype.isNone = function() {
    return false;
};

Some.prototype.isSome = function() {
    return true;
};

Some.prototype.map = function(func) {
    return new Some(func(this._value));
};

Some.prototype.flatMap = function(func) {
    return func(this._value);
};

Some.prototype.filter = function(predicate) {
    return predicate(this._value) ? this : exports.none;
};

Some.prototype.toArray = function() {
    return [this._value];
};

Some.prototype.orElse = function(value) {
    return this;
};

Some.prototype.valueOrElse = function(value) {
    return this._value;
};

exports.isOption = function(value) {
    return value === exports.none || value instanceof Some;
};

exports.fromNullable = function(value) {
    if (value == null) {
        return exports.none;
    }
    return new Some(value);
}

},{}],101:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],102:[function(require,module,exports){
(function (global){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define('underscore', factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, (function () {
    var current = global._;
    var exports = global._ = factory();
    exports.noConflict = function () { global._ = current; return exports; };
  }()));
}(this, (function () {
  //     Underscore.js 1.13.1
  //     https://underscorejs.org
  //     (c) 2009-2021 Jeremy Ashkenas, Julian Gonggrijp, and DocumentCloud and Investigative Reporters & Editors
  //     Underscore may be freely distributed under the MIT license.

  // Current version.
  var VERSION = '1.13.1';

  // Establish the root object, `window` (`self`) in the browser, `global`
  // on the server, or `this` in some virtual machines. We use `self`
  // instead of `window` for `WebWorker` support.
  var root = typeof self == 'object' && self.self === self && self ||
            typeof global == 'object' && global.global === global && global ||
            Function('return this')() ||
            {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype;
  var SymbolProto = typeof Symbol !== 'undefined' ? Symbol.prototype : null;

  // Create quick reference variables for speed access to core prototypes.
  var push = ArrayProto.push,
      slice = ArrayProto.slice,
      toString = ObjProto.toString,
      hasOwnProperty = ObjProto.hasOwnProperty;

  // Modern feature detection.
  var supportsArrayBuffer = typeof ArrayBuffer !== 'undefined',
      supportsDataView = typeof DataView !== 'undefined';

  // All **ECMAScript 5+** native function implementations that we hope to use
  // are declared here.
  var nativeIsArray = Array.isArray,
      nativeKeys = Object.keys,
      nativeCreate = Object.create,
      nativeIsView = supportsArrayBuffer && ArrayBuffer.isView;

  // Create references to these builtin functions because we override them.
  var _isNaN = isNaN,
      _isFinite = isFinite;

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
    'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  // The largest integer that can be represented exactly.
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;

  // Some functions take a variable number of arguments, or a few expected
  // arguments at the beginning and then a variable number of values to operate
  // on. This helper accumulates all remaining arguments past the function’s
  // argument length (or an explicit `startIndex`), into an array that becomes
  // the last argument. Similar to ES6’s "rest parameter".
  function restArguments(func, startIndex) {
    startIndex = startIndex == null ? func.length - 1 : +startIndex;
    return function() {
      var length = Math.max(arguments.length - startIndex, 0),
          rest = Array(length),
          index = 0;
      for (; index < length; index++) {
        rest[index] = arguments[index + startIndex];
      }
      switch (startIndex) {
        case 0: return func.call(this, rest);
        case 1: return func.call(this, arguments[0], rest);
        case 2: return func.call(this, arguments[0], arguments[1], rest);
      }
      var args = Array(startIndex + 1);
      for (index = 0; index < startIndex; index++) {
        args[index] = arguments[index];
      }
      args[startIndex] = rest;
      return func.apply(this, args);
    };
  }

  // Is a given variable an object?
  function isObject(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  }

  // Is a given value equal to null?
  function isNull(obj) {
    return obj === null;
  }

  // Is a given variable undefined?
  function isUndefined(obj) {
    return obj === void 0;
  }

  // Is a given value a boolean?
  function isBoolean(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  }

  // Is a given value a DOM element?
  function isElement(obj) {
    return !!(obj && obj.nodeType === 1);
  }

  // Internal function for creating a `toString`-based type tester.
  function tagTester(name) {
    var tag = '[object ' + name + ']';
    return function(obj) {
      return toString.call(obj) === tag;
    };
  }

  var isString = tagTester('String');

  var isNumber = tagTester('Number');

  var isDate = tagTester('Date');

  var isRegExp = tagTester('RegExp');

  var isError = tagTester('Error');

  var isSymbol = tagTester('Symbol');

  var isArrayBuffer = tagTester('ArrayBuffer');

  var isFunction = tagTester('Function');

  // Optimize `isFunction` if appropriate. Work around some `typeof` bugs in old
  // v8, IE 11 (#1621), Safari 8 (#1929), and PhantomJS (#2236).
  var nodelist = root.document && root.document.childNodes;
  if (typeof /./ != 'function' && typeof Int8Array != 'object' && typeof nodelist != 'function') {
    isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  var isFunction$1 = isFunction;

  var hasObjectTag = tagTester('Object');

  // In IE 10 - Edge 13, `DataView` has string tag `'[object Object]'`.
  // In IE 11, the most common among them, this problem also applies to
  // `Map`, `WeakMap` and `Set`.
  var hasStringTagBug = (
        supportsDataView && hasObjectTag(new DataView(new ArrayBuffer(8)))
      ),
      isIE11 = (typeof Map !== 'undefined' && hasObjectTag(new Map));

  var isDataView = tagTester('DataView');

  // In IE 10 - Edge 13, we need a different heuristic
  // to determine whether an object is a `DataView`.
  function ie10IsDataView(obj) {
    return obj != null && isFunction$1(obj.getInt8) && isArrayBuffer(obj.buffer);
  }

  var isDataView$1 = (hasStringTagBug ? ie10IsDataView : isDataView);

  // Is a given value an array?
  // Delegates to ECMA5's native `Array.isArray`.
  var isArray = nativeIsArray || tagTester('Array');

  // Internal function to check whether `key` is an own property name of `obj`.
  function has$1(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  }

  var isArguments = tagTester('Arguments');

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  (function() {
    if (!isArguments(arguments)) {
      isArguments = function(obj) {
        return has$1(obj, 'callee');
      };
    }
  }());

  var isArguments$1 = isArguments;

  // Is a given object a finite number?
  function isFinite$1(obj) {
    return !isSymbol(obj) && _isFinite(obj) && !isNaN(parseFloat(obj));
  }

  // Is the given value `NaN`?
  function isNaN$1(obj) {
    return isNumber(obj) && _isNaN(obj);
  }

  // Predicate-generating function. Often useful outside of Underscore.
  function constant(value) {
    return function() {
      return value;
    };
  }

  // Common internal logic for `isArrayLike` and `isBufferLike`.
  function createSizePropertyCheck(getSizeProperty) {
    return function(collection) {
      var sizeProperty = getSizeProperty(collection);
      return typeof sizeProperty == 'number' && sizeProperty >= 0 && sizeProperty <= MAX_ARRAY_INDEX;
    }
  }

  // Internal helper to generate a function to obtain property `key` from `obj`.
  function shallowProperty(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  }

  // Internal helper to obtain the `byteLength` property of an object.
  var getByteLength = shallowProperty('byteLength');

  // Internal helper to determine whether we should spend extensive checks against
  // `ArrayBuffer` et al.
  var isBufferLike = createSizePropertyCheck(getByteLength);

  // Is a given value a typed array?
  var typedArrayPattern = /\[object ((I|Ui)nt(8|16|32)|Float(32|64)|Uint8Clamped|Big(I|Ui)nt64)Array\]/;
  function isTypedArray(obj) {
    // `ArrayBuffer.isView` is the most future-proof, so use it when available.
    // Otherwise, fall back on the above regular expression.
    return nativeIsView ? (nativeIsView(obj) && !isDataView$1(obj)) :
                  isBufferLike(obj) && typedArrayPattern.test(toString.call(obj));
  }

  var isTypedArray$1 = supportsArrayBuffer ? isTypedArray : constant(false);

  // Internal helper to obtain the `length` property of an object.
  var getLength = shallowProperty('length');

  // Internal helper to create a simple lookup structure.
  // `collectNonEnumProps` used to depend on `_.contains`, but this led to
  // circular imports. `emulatedSet` is a one-off solution that only works for
  // arrays of strings.
  function emulatedSet(keys) {
    var hash = {};
    for (var l = keys.length, i = 0; i < l; ++i) hash[keys[i]] = true;
    return {
      contains: function(key) { return hash[key]; },
      push: function(key) {
        hash[key] = true;
        return keys.push(key);
      }
    };
  }

  // Internal helper. Checks `keys` for the presence of keys in IE < 9 that won't
  // be iterated by `for key in ...` and thus missed. Extends `keys` in place if
  // needed.
  function collectNonEnumProps(obj, keys) {
    keys = emulatedSet(keys);
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = isFunction$1(constructor) && constructor.prototype || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (has$1(obj, prop) && !keys.contains(prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !keys.contains(prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`.
  function keys(obj) {
    if (!isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (has$1(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  }

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  function isEmpty(obj) {
    if (obj == null) return true;
    // Skip the more expensive `toString`-based type checks if `obj` has no
    // `.length`.
    var length = getLength(obj);
    if (typeof length == 'number' && (
      isArray(obj) || isString(obj) || isArguments$1(obj)
    )) return length === 0;
    return getLength(keys(obj)) === 0;
  }

  // Returns whether an object has a given set of `key:value` pairs.
  function isMatch(object, attrs) {
    var _keys = keys(attrs), length = _keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = _keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  }

  // If Underscore is called as a function, it returns a wrapped object that can
  // be used OO-style. This wrapper holds altered versions of all functions added
  // through `_.mixin`. Wrapped objects may be chained.
  function _$1(obj) {
    if (obj instanceof _$1) return obj;
    if (!(this instanceof _$1)) return new _$1(obj);
    this._wrapped = obj;
  }

  _$1.VERSION = VERSION;

  // Extracts the result from a wrapped and chained object.
  _$1.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxies for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _$1.prototype.valueOf = _$1.prototype.toJSON = _$1.prototype.value;

  _$1.prototype.toString = function() {
    return String(this._wrapped);
  };

  // Internal function to wrap or shallow-copy an ArrayBuffer,
  // typed array or DataView to a new view, reusing the buffer.
  function toBufferView(bufferSource) {
    return new Uint8Array(
      bufferSource.buffer || bufferSource,
      bufferSource.byteOffset || 0,
      getByteLength(bufferSource)
    );
  }

  // We use this string twice, so give it a name for minification.
  var tagDataView = '[object DataView]';

  // Internal recursive comparison function for `_.isEqual`.
  function eq(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](https://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // `null` or `undefined` only equal to itself (strict comparison).
    if (a == null || b == null) return false;
    // `NaN`s are equivalent, but non-reflexive.
    if (a !== a) return b !== b;
    // Exhaust primitive checks
    var type = typeof a;
    if (type !== 'function' && type !== 'object' && typeof b != 'object') return false;
    return deepEq(a, b, aStack, bStack);
  }

  // Internal recursive comparison function for `_.isEqual`.
  function deepEq(a, b, aStack, bStack) {
    // Unwrap any wrapped objects.
    if (a instanceof _$1) a = a._wrapped;
    if (b instanceof _$1) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    // Work around a bug in IE 10 - Edge 13.
    if (hasStringTagBug && className == '[object Object]' && isDataView$1(a)) {
      if (!isDataView$1(b)) return false;
      className = tagDataView;
    }
    switch (className) {
      // These types are compared by value.
      case '[object RegExp]':
        // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN.
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
      case '[object Symbol]':
        return SymbolProto.valueOf.call(a) === SymbolProto.valueOf.call(b);
      case '[object ArrayBuffer]':
      case tagDataView:
        // Coerce to typed array so we can fall through.
        return deepEq(toBufferView(a), toBufferView(b), aStack, bStack);
    }

    var areArrays = className === '[object Array]';
    if (!areArrays && isTypedArray$1(a)) {
        var byteLength = getByteLength(a);
        if (byteLength !== getByteLength(b)) return false;
        if (a.buffer === b.buffer && a.byteOffset === b.byteOffset) return true;
        areArrays = true;
    }
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(isFunction$1(aCtor) && aCtor instanceof aCtor &&
                               isFunction$1(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var _keys = keys(a), key;
      length = _keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = _keys[length];
        if (!(has$1(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  }

  // Perform a deep comparison to check if two objects are equal.
  function isEqual(a, b) {
    return eq(a, b);
  }

  // Retrieve all the enumerable property names of an object.
  function allKeys(obj) {
    if (!isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  }

  // Since the regular `Object.prototype.toString` type tests don't work for
  // some types in IE 11, we use a fingerprinting heuristic instead, based
  // on the methods. It's not great, but it's the best we got.
  // The fingerprint method lists are defined below.
  function ie11fingerprint(methods) {
    var length = getLength(methods);
    return function(obj) {
      if (obj == null) return false;
      // `Map`, `WeakMap` and `Set` have no enumerable keys.
      var keys = allKeys(obj);
      if (getLength(keys)) return false;
      for (var i = 0; i < length; i++) {
        if (!isFunction$1(obj[methods[i]])) return false;
      }
      // If we are testing against `WeakMap`, we need to ensure that
      // `obj` doesn't have a `forEach` method in order to distinguish
      // it from a regular `Map`.
      return methods !== weakMapMethods || !isFunction$1(obj[forEachName]);
    };
  }

  // In the interest of compact minification, we write
  // each string in the fingerprints only once.
  var forEachName = 'forEach',
      hasName = 'has',
      commonInit = ['clear', 'delete'],
      mapTail = ['get', hasName, 'set'];

  // `Map`, `WeakMap` and `Set` each have slightly different
  // combinations of the above sublists.
  var mapMethods = commonInit.concat(forEachName, mapTail),
      weakMapMethods = commonInit.concat(mapTail),
      setMethods = ['add'].concat(commonInit, forEachName, hasName);

  var isMap = isIE11 ? ie11fingerprint(mapMethods) : tagTester('Map');

  var isWeakMap = isIE11 ? ie11fingerprint(weakMapMethods) : tagTester('WeakMap');

  var isSet = isIE11 ? ie11fingerprint(setMethods) : tagTester('Set');

  var isWeakSet = tagTester('WeakSet');

  // Retrieve the values of an object's properties.
  function values(obj) {
    var _keys = keys(obj);
    var length = _keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[_keys[i]];
    }
    return values;
  }

  // Convert an object into a list of `[key, value]` pairs.
  // The opposite of `_.object` with one argument.
  function pairs(obj) {
    var _keys = keys(obj);
    var length = _keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [_keys[i], obj[_keys[i]]];
    }
    return pairs;
  }

  // Invert the keys and values of an object. The values must be serializable.
  function invert(obj) {
    var result = {};
    var _keys = keys(obj);
    for (var i = 0, length = _keys.length; i < length; i++) {
      result[obj[_keys[i]]] = _keys[i];
    }
    return result;
  }

  // Return a sorted list of the function names available on the object.
  function functions(obj) {
    var names = [];
    for (var key in obj) {
      if (isFunction$1(obj[key])) names.push(key);
    }
    return names.sort();
  }

  // An internal function for creating assigner functions.
  function createAssigner(keysFunc, defaults) {
    return function(obj) {
      var length = arguments.length;
      if (defaults) obj = Object(obj);
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!defaults || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  }

  // Extend a given object with all the properties in passed-in object(s).
  var extend = createAssigner(allKeys);

  // Assigns a given object with all the own properties in the passed-in
  // object(s).
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  var extendOwn = createAssigner(keys);

  // Fill in a given object with default properties.
  var defaults = createAssigner(allKeys, true);

  // Create a naked function reference for surrogate-prototype-swapping.
  function ctor() {
    return function(){};
  }

  // An internal function for creating a new object that inherits from another.
  function baseCreate(prototype) {
    if (!isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    var Ctor = ctor();
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  }

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  function create(prototype, props) {
    var result = baseCreate(prototype);
    if (props) extendOwn(result, props);
    return result;
  }

  // Create a (shallow-cloned) duplicate of an object.
  function clone(obj) {
    if (!isObject(obj)) return obj;
    return isArray(obj) ? obj.slice() : extend({}, obj);
  }

  // Invokes `interceptor` with the `obj` and then returns `obj`.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  function tap(obj, interceptor) {
    interceptor(obj);
    return obj;
  }

  // Normalize a (deep) property `path` to array.
  // Like `_.iteratee`, this function can be customized.
  function toPath$1(path) {
    return isArray(path) ? path : [path];
  }
  _$1.toPath = toPath$1;

  // Internal wrapper for `_.toPath` to enable minification.
  // Similar to `cb` for `_.iteratee`.
  function toPath(path) {
    return _$1.toPath(path);
  }

  // Internal function to obtain a nested property in `obj` along `path`.
  function deepGet(obj, path) {
    var length = path.length;
    for (var i = 0; i < length; i++) {
      if (obj == null) return void 0;
      obj = obj[path[i]];
    }
    return length ? obj : void 0;
  }

  // Get the value of the (deep) property on `path` from `object`.
  // If any property in `path` does not exist or if the value is
  // `undefined`, return `defaultValue` instead.
  // The `path` is normalized through `_.toPath`.
  function get(object, path, defaultValue) {
    var value = deepGet(object, toPath(path));
    return isUndefined(value) ? defaultValue : value;
  }

  // Shortcut function for checking if an object has a given property directly on
  // itself (in other words, not on a prototype). Unlike the internal `has`
  // function, this public version can also traverse nested properties.
  function has(obj, path) {
    path = toPath(path);
    var length = path.length;
    for (var i = 0; i < length; i++) {
      var key = path[i];
      if (!has$1(obj, key)) return false;
      obj = obj[key];
    }
    return !!length;
  }

  // Keep the identity function around for default iteratees.
  function identity(value) {
    return value;
  }

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  function matcher(attrs) {
    attrs = extendOwn({}, attrs);
    return function(obj) {
      return isMatch(obj, attrs);
    };
  }

  // Creates a function that, when passed an object, will traverse that object’s
  // properties down the given `path`, specified as an array of keys or indices.
  function property(path) {
    path = toPath(path);
    return function(obj) {
      return deepGet(obj, path);
    };
  }

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  function optimizeCb(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      // The 2-argument case is omitted because we’re not using it.
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  }

  // An internal function to generate callbacks that can be applied to each
  // element in a collection, returning the desired result — either `_.identity`,
  // an arbitrary callback, a property matcher, or a property accessor.
  function baseIteratee(value, context, argCount) {
    if (value == null) return identity;
    if (isFunction$1(value)) return optimizeCb(value, context, argCount);
    if (isObject(value) && !isArray(value)) return matcher(value);
    return property(value);
  }

  // External wrapper for our callback generator. Users may customize
  // `_.iteratee` if they want additional predicate/iteratee shorthand styles.
  // This abstraction hides the internal-only `argCount` argument.
  function iteratee(value, context) {
    return baseIteratee(value, context, Infinity);
  }
  _$1.iteratee = iteratee;

  // The function we call internally to generate a callback. It invokes
  // `_.iteratee` if overridden, otherwise `baseIteratee`.
  function cb(value, context, argCount) {
    if (_$1.iteratee !== iteratee) return _$1.iteratee(value, context);
    return baseIteratee(value, context, argCount);
  }

  // Returns the results of applying the `iteratee` to each element of `obj`.
  // In contrast to `_.map` it returns an object.
  function mapObject(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var _keys = keys(obj),
        length = _keys.length,
        results = {};
    for (var index = 0; index < length; index++) {
      var currentKey = _keys[index];
      results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  }

  // Predicate-generating function. Often useful outside of Underscore.
  function noop(){}

  // Generates a function for a given object that returns a given property.
  function propertyOf(obj) {
    if (obj == null) return noop;
    return function(path) {
      return get(obj, path);
    };
  }

  // Run a function **n** times.
  function times(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  }

  // Return a random integer between `min` and `max` (inclusive).
  function random(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  // A (possibly faster) way to get the current timestamp as an integer.
  var now = Date.now || function() {
    return new Date().getTime();
  };

  // Internal helper to generate functions for escaping and unescaping strings
  // to/from HTML interpolation.
  function createEscaper(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped.
    var source = '(?:' + keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  }

  // Internal list of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };

  // Function for escaping strings to HTML interpolation.
  var _escape = createEscaper(escapeMap);

  // Internal list of HTML entities for unescaping.
  var unescapeMap = invert(escapeMap);

  // Function for unescaping strings from HTML interpolation.
  var _unescape = createEscaper(unescapeMap);

  // By default, Underscore uses ERB-style template delimiters. Change the
  // following template settings to use alternative delimiters.
  var templateSettings = _$1.templateSettings = {
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g
  };

  // When customizing `_.templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'": "'",
    '\\': '\\',
    '\r': 'r',
    '\n': 'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;

  function escapeChar(match) {
    return '\\' + escapes[match];
  }

  // In order to prevent third-party code injection through
  // `_.templateSettings.variable`, we test it against the following regular
  // expression. It is intentionally a bit more liberal than just matching valid
  // identifiers, but still prevents possible loopholes through defaults or
  // destructuring assignment.
  var bareIdentifier = /^\s*(\w|\$)+\s*$/;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  function template(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = defaults({}, settings, _$1.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escapeRegExp, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offset.
      return match;
    });
    source += "';\n";

    var argument = settings.variable;
    if (argument) {
      // Insure against third-party code injection. (CVE-2021-23358)
      if (!bareIdentifier.test(argument)) throw new Error(
        'variable is not a bare identifier: ' + argument
      );
    } else {
      // If a variable is not specified, place data values in local scope.
      source = 'with(obj||{}){\n' + source + '}\n';
      argument = 'obj';
    }

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    var render;
    try {
      render = new Function(argument, '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _$1);
    };

    // Provide the compiled source as a convenience for precompilation.
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  }

  // Traverses the children of `obj` along `path`. If a child is a function, it
  // is invoked with its parent as context. Returns the value of the final
  // child, or `fallback` if any child is undefined.
  function result(obj, path, fallback) {
    path = toPath(path);
    var length = path.length;
    if (!length) {
      return isFunction$1(fallback) ? fallback.call(obj) : fallback;
    }
    for (var i = 0; i < length; i++) {
      var prop = obj == null ? void 0 : obj[path[i]];
      if (prop === void 0) {
        prop = fallback;
        i = length; // Ensure we don't continue iterating.
      }
      obj = isFunction$1(prop) ? prop.call(obj) : prop;
    }
    return obj;
  }

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  function uniqueId(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  }

  // Start chaining a wrapped Underscore object.
  function chain(obj) {
    var instance = _$1(obj);
    instance._chain = true;
    return instance;
  }

  // Internal function to execute `sourceFunc` bound to `context` with optional
  // `args`. Determines whether to execute a function as a constructor or as a
  // normal function.
  function executeBound(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (isObject(result)) return result;
    return self;
  }

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. `_` acts
  // as a placeholder by default, allowing any combination of arguments to be
  // pre-filled. Set `_.partial.placeholder` for a custom placeholder argument.
  var partial = restArguments(function(func, boundArgs) {
    var placeholder = partial.placeholder;
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === placeholder ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  });

  partial.placeholder = _$1;

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally).
  var bind = restArguments(function(func, context, args) {
    if (!isFunction$1(func)) throw new TypeError('Bind must be called on a function');
    var bound = restArguments(function(callArgs) {
      return executeBound(func, bound, context, this, args.concat(callArgs));
    });
    return bound;
  });

  // Internal helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object.
  // Related: https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var isArrayLike = createSizePropertyCheck(getLength);

  // Internal implementation of a recursive `flatten` function.
  function flatten$1(input, depth, strict, output) {
    output = output || [];
    if (!depth && depth !== 0) {
      depth = Infinity;
    } else if (depth <= 0) {
      return output.concat(input);
    }
    var idx = output.length;
    for (var i = 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (isArray(value) || isArguments$1(value))) {
        // Flatten current level of array or arguments object.
        if (depth > 1) {
          flatten$1(value, depth - 1, strict, output);
          idx = output.length;
        } else {
          var j = 0, len = value.length;
          while (j < len) output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  }

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  var bindAll = restArguments(function(obj, keys) {
    keys = flatten$1(keys, false, false);
    var index = keys.length;
    if (index < 1) throw new Error('bindAll must be passed function names');
    while (index--) {
      var key = keys[index];
      obj[key] = bind(obj[key], obj);
    }
    return obj;
  });

  // Memoize an expensive function by storing its results.
  function memoize(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!has$1(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  }

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  var delay = restArguments(function(func, wait, args) {
    return setTimeout(function() {
      return func.apply(null, args);
    }, wait);
  });

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  var defer = partial(delay, _$1, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  function throttle(func, wait, options) {
    var timeout, context, args, result;
    var previous = 0;
    if (!options) options = {};

    var later = function() {
      previous = options.leading === false ? 0 : now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };

    var throttled = function() {
      var _now = now();
      if (!previous && options.leading === false) previous = _now;
      var remaining = wait - (_now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = _now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };

    throttled.cancel = function() {
      clearTimeout(timeout);
      previous = 0;
      timeout = context = args = null;
    };

    return throttled;
  }

  // When a sequence of calls of the returned function ends, the argument
  // function is triggered. The end of a sequence is defined by the `wait`
  // parameter. If `immediate` is passed, the argument function will be
  // triggered at the beginning of the sequence instead of at the end.
  function debounce(func, wait, immediate) {
    var timeout, previous, args, result, context;

    var later = function() {
      var passed = now() - previous;
      if (wait > passed) {
        timeout = setTimeout(later, wait - passed);
      } else {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
        // This check is needed because `func` can recursively invoke `debounced`.
        if (!timeout) args = context = null;
      }
    };

    var debounced = restArguments(function(_args) {
      context = this;
      args = _args;
      previous = now();
      if (!timeout) {
        timeout = setTimeout(later, wait);
        if (immediate) result = func.apply(context, args);
      }
      return result;
    });

    debounced.cancel = function() {
      clearTimeout(timeout);
      timeout = args = context = null;
    };

    return debounced;
  }

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  function wrap(func, wrapper) {
    return partial(wrapper, func);
  }

  // Returns a negated version of the passed-in predicate.
  function negate(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  }

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  function compose() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  }

  // Returns a function that will only be executed on and after the Nth call.
  function after(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  }

  // Returns a function that will only be executed up to (but not including) the
  // Nth call.
  function before(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  }

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  var once = partial(before, 2);

  // Returns the first key on an object that passes a truth test.
  function findKey(obj, predicate, context) {
    predicate = cb(predicate, context);
    var _keys = keys(obj), key;
    for (var i = 0, length = _keys.length; i < length; i++) {
      key = _keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  }

  // Internal function to generate `_.findIndex` and `_.findLastIndex`.
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a truth test.
  var findIndex = createPredicateIndexFinder(1);

  // Returns the last index on an array-like that passes a truth test.
  var findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  function sortedIndex(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  }

  // Internal function to generate the `_.indexOf` and `_.lastIndexOf` functions.
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
          i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
          length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), isNaN$1);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  var indexOf = createIndexFinder(1, findIndex, sortedIndex);

  // Return the position of the last occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  var lastIndexOf = createIndexFinder(-1, findLastIndex);

  // Return the first value which passes a truth test.
  function find(obj, predicate, context) {
    var keyFinder = isArrayLike(obj) ? findIndex : findKey;
    var key = keyFinder(obj, predicate, context);
    if (key !== void 0 && key !== -1) return obj[key];
  }

  // Convenience version of a common use case of `_.find`: getting the first
  // object containing specific `key:value` pairs.
  function findWhere(obj, attrs) {
    return find(obj, matcher(attrs));
  }

  // The cornerstone for collection functions, an `each`
  // implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  function each(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var _keys = keys(obj);
      for (i = 0, length = _keys.length; i < length; i++) {
        iteratee(obj[_keys[i]], _keys[i], obj);
      }
    }
    return obj;
  }

  // Return the results of applying the iteratee to each element.
  function map(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var _keys = !isArrayLike(obj) && keys(obj),
        length = (_keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = _keys ? _keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  }

  // Internal helper to create a reducing function, iterating left or right.
  function createReduce(dir) {
    // Wrap code that reassigns argument variables in a separate function than
    // the one that accesses `arguments.length` to avoid a perf hit. (#1991)
    var reducer = function(obj, iteratee, memo, initial) {
      var _keys = !isArrayLike(obj) && keys(obj),
          length = (_keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      if (!initial) {
        memo = obj[_keys ? _keys[index] : index];
        index += dir;
      }
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = _keys ? _keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    };

    return function(obj, iteratee, memo, context) {
      var initial = arguments.length >= 3;
      return reducer(obj, optimizeCb(iteratee, context, 4), memo, initial);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  var reduce = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  var reduceRight = createReduce(-1);

  // Return all the elements that pass a truth test.
  function filter(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  }

  // Return all the elements for which a truth test fails.
  function reject(obj, predicate, context) {
    return filter(obj, negate(cb(predicate)), context);
  }

  // Determine whether all of the elements pass a truth test.
  function every(obj, predicate, context) {
    predicate = cb(predicate, context);
    var _keys = !isArrayLike(obj) && keys(obj),
        length = (_keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = _keys ? _keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  }

  // Determine if at least one element in the object passes a truth test.
  function some(obj, predicate, context) {
    predicate = cb(predicate, context);
    var _keys = !isArrayLike(obj) && keys(obj),
        length = (_keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = _keys ? _keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  }

  // Determine if the array or object contains a given item (using `===`).
  function contains(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return indexOf(obj, item, fromIndex) >= 0;
  }

  // Invoke a method (with arguments) on every item in a collection.
  var invoke = restArguments(function(obj, path, args) {
    var contextPath, func;
    if (isFunction$1(path)) {
      func = path;
    } else {
      path = toPath(path);
      contextPath = path.slice(0, -1);
      path = path[path.length - 1];
    }
    return map(obj, function(context) {
      var method = func;
      if (!method) {
        if (contextPath && contextPath.length) {
          context = deepGet(context, contextPath);
        }
        if (context == null) return void 0;
        method = context[path];
      }
      return method == null ? method : method.apply(context, args);
    });
  });

  // Convenience version of a common use case of `_.map`: fetching a property.
  function pluck(obj, key) {
    return map(obj, property(key));
  }

  // Convenience version of a common use case of `_.filter`: selecting only
  // objects containing specific `key:value` pairs.
  function where(obj, attrs) {
    return filter(obj, matcher(attrs));
  }

  // Return the maximum element (or element-based computation).
  function max(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null || typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null) {
      obj = isArrayLike(obj) ? obj : values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value != null && value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      each(obj, function(v, index, list) {
        computed = iteratee(v, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = v;
          lastComputed = computed;
        }
      });
    }
    return result;
  }

  // Return the minimum element (or element-based computation).
  function min(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null || typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null) {
      obj = isArrayLike(obj) ? obj : values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value != null && value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      each(obj, function(v, index, list) {
        computed = iteratee(v, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = v;
          lastComputed = computed;
        }
      });
    }
    return result;
  }

  // Sample **n** random values from a collection using the modern version of the
  // [Fisher-Yates shuffle](https://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `_.map`.
  function sample(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = values(obj);
      return obj[random(obj.length - 1)];
    }
    var sample = isArrayLike(obj) ? clone(obj) : values(obj);
    var length = getLength(sample);
    n = Math.max(Math.min(n, length), 0);
    var last = length - 1;
    for (var index = 0; index < n; index++) {
      var rand = random(index, last);
      var temp = sample[index];
      sample[index] = sample[rand];
      sample[rand] = temp;
    }
    return sample.slice(0, n);
  }

  // Shuffle a collection.
  function shuffle(obj) {
    return sample(obj, Infinity);
  }

  // Sort the object's values by a criterion produced by an iteratee.
  function sortBy(obj, iteratee, context) {
    var index = 0;
    iteratee = cb(iteratee, context);
    return pluck(map(obj, function(value, key, list) {
      return {
        value: value,
        index: index++,
        criteria: iteratee(value, key, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  }

  // An internal function used for aggregate "group by" operations.
  function group(behavior, partition) {
    return function(obj, iteratee, context) {
      var result = partition ? [[], []] : {};
      iteratee = cb(iteratee, context);
      each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  }

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  var groupBy = group(function(result, value, key) {
    if (has$1(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `_.groupBy`, but for
  // when you know that your index values will be unique.
  var indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  var countBy = group(function(result, value, key) {
    if (has$1(result, key)) result[key]++; else result[key] = 1;
  });

  // Split a collection into two arrays: one whose elements all pass the given
  // truth test, and one whose elements all do not pass the truth test.
  var partition = group(function(result, value, pass) {
    result[pass ? 0 : 1].push(value);
  }, true);

  // Safely create a real, live array from anything iterable.
  var reStrSymbol = /[^\ud800-\udfff]|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g;
  function toArray(obj) {
    if (!obj) return [];
    if (isArray(obj)) return slice.call(obj);
    if (isString(obj)) {
      // Keep surrogate pair characters together.
      return obj.match(reStrSymbol);
    }
    if (isArrayLike(obj)) return map(obj, identity);
    return values(obj);
  }

  // Return the number of elements in a collection.
  function size(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : keys(obj).length;
  }

  // Internal `_.pick` helper function to determine whether `key` is an enumerable
  // property name of `obj`.
  function keyInObj(value, key, obj) {
    return key in obj;
  }

  // Return a copy of the object only containing the allowed properties.
  var pick = restArguments(function(obj, keys) {
    var result = {}, iteratee = keys[0];
    if (obj == null) return result;
    if (isFunction$1(iteratee)) {
      if (keys.length > 1) iteratee = optimizeCb(iteratee, keys[1]);
      keys = allKeys(obj);
    } else {
      iteratee = keyInObj;
      keys = flatten$1(keys, false, false);
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  });

  // Return a copy of the object without the disallowed properties.
  var omit = restArguments(function(obj, keys) {
    var iteratee = keys[0], context;
    if (isFunction$1(iteratee)) {
      iteratee = negate(iteratee);
      if (keys.length > 1) context = keys[1];
    } else {
      keys = map(flatten$1(keys, false, false), String);
      iteratee = function(value, key) {
        return !contains(keys, key);
      };
    }
    return pick(obj, iteratee, context);
  });

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  function initial(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  }

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. The **guard** check allows it to work with `_.map`.
  function first(array, n, guard) {
    if (array == null || array.length < 1) return n == null || guard ? void 0 : [];
    if (n == null || guard) return array[0];
    return initial(array, array.length - n);
  }

  // Returns everything but the first entry of the `array`. Especially useful on
  // the `arguments` object. Passing an **n** will return the rest N values in the
  // `array`.
  function rest(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  }

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  function last(array, n, guard) {
    if (array == null || array.length < 1) return n == null || guard ? void 0 : [];
    if (n == null || guard) return array[array.length - 1];
    return rest(array, Math.max(0, array.length - n));
  }

  // Trim out all falsy values from an array.
  function compact(array) {
    return filter(array, Boolean);
  }

  // Flatten out an array, either recursively (by default), or up to `depth`.
  // Passing `true` or `false` as `depth` means `1` or `Infinity`, respectively.
  function flatten(array, depth) {
    return flatten$1(array, depth, false);
  }

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  var difference = restArguments(function(array, rest) {
    rest = flatten$1(rest, true, true);
    return filter(array, function(value){
      return !contains(rest, value);
    });
  });

  // Return a version of the array that does not contain the specified value(s).
  var without = restArguments(function(array, otherArrays) {
    return difference(array, otherArrays);
  });

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // The faster algorithm will not work with an iteratee if the iteratee
  // is not a one-to-one function, so providing an iteratee will disable
  // the faster algorithm.
  function uniq(array, isSorted, iteratee, context) {
    if (!isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted && !iteratee) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  }

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  var union = restArguments(function(arrays) {
    return uniq(flatten$1(arrays, true, true));
  });

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  function intersection(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (contains(result, item)) continue;
      var j;
      for (j = 1; j < argsLength; j++) {
        if (!contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  }

  // Complement of zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices.
  function unzip(array) {
    var length = array && max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = pluck(array, index);
    }
    return result;
  }

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  var zip = restArguments(unzip);

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values. Passing by pairs is the reverse of `_.pairs`.
  function object(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  }

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](https://docs.python.org/library/functions.html#range).
  function range(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    if (!step) {
      step = stop < start ? -1 : 1;
    }

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  }

  // Chunk a single array into multiple arrays, each containing `count` or fewer
  // items.
  function chunk(array, count) {
    if (count == null || count < 1) return [];
    var result = [];
    var i = 0, length = array.length;
    while (i < length) {
      result.push(slice.call(array, i, i += count));
    }
    return result;
  }

  // Helper function to continue chaining intermediate results.
  function chainResult(instance, obj) {
    return instance._chain ? _$1(obj).chain() : obj;
  }

  // Add your own custom functions to the Underscore object.
  function mixin(obj) {
    each(functions(obj), function(name) {
      var func = _$1[name] = obj[name];
      _$1.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return chainResult(this, func.apply(_$1, args));
      };
    });
    return _$1;
  }

  // Add all mutator `Array` functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _$1.prototype[name] = function() {
      var obj = this._wrapped;
      if (obj != null) {
        method.apply(obj, arguments);
        if ((name === 'shift' || name === 'splice') && obj.length === 0) {
          delete obj[0];
        }
      }
      return chainResult(this, obj);
    };
  });

  // Add all accessor `Array` functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _$1.prototype[name] = function() {
      var obj = this._wrapped;
      if (obj != null) obj = method.apply(obj, arguments);
      return chainResult(this, obj);
    };
  });

  // Named Exports

  var allExports = {
    __proto__: null,
    VERSION: VERSION,
    restArguments: restArguments,
    isObject: isObject,
    isNull: isNull,
    isUndefined: isUndefined,
    isBoolean: isBoolean,
    isElement: isElement,
    isString: isString,
    isNumber: isNumber,
    isDate: isDate,
    isRegExp: isRegExp,
    isError: isError,
    isSymbol: isSymbol,
    isArrayBuffer: isArrayBuffer,
    isDataView: isDataView$1,
    isArray: isArray,
    isFunction: isFunction$1,
    isArguments: isArguments$1,
    isFinite: isFinite$1,
    isNaN: isNaN$1,
    isTypedArray: isTypedArray$1,
    isEmpty: isEmpty,
    isMatch: isMatch,
    isEqual: isEqual,
    isMap: isMap,
    isWeakMap: isWeakMap,
    isSet: isSet,
    isWeakSet: isWeakSet,
    keys: keys,
    allKeys: allKeys,
    values: values,
    pairs: pairs,
    invert: invert,
    functions: functions,
    methods: functions,
    extend: extend,
    extendOwn: extendOwn,
    assign: extendOwn,
    defaults: defaults,
    create: create,
    clone: clone,
    tap: tap,
    get: get,
    has: has,
    mapObject: mapObject,
    identity: identity,
    constant: constant,
    noop: noop,
    toPath: toPath$1,
    property: property,
    propertyOf: propertyOf,
    matcher: matcher,
    matches: matcher,
    times: times,
    random: random,
    now: now,
    escape: _escape,
    unescape: _unescape,
    templateSettings: templateSettings,
    template: template,
    result: result,
    uniqueId: uniqueId,
    chain: chain,
    iteratee: iteratee,
    partial: partial,
    bind: bind,
    bindAll: bindAll,
    memoize: memoize,
    delay: delay,
    defer: defer,
    throttle: throttle,
    debounce: debounce,
    wrap: wrap,
    negate: negate,
    compose: compose,
    after: after,
    before: before,
    once: once,
    findKey: findKey,
    findIndex: findIndex,
    findLastIndex: findLastIndex,
    sortedIndex: sortedIndex,
    indexOf: indexOf,
    lastIndexOf: lastIndexOf,
    find: find,
    detect: find,
    findWhere: findWhere,
    each: each,
    forEach: each,
    map: map,
    collect: map,
    reduce: reduce,
    foldl: reduce,
    inject: reduce,
    reduceRight: reduceRight,
    foldr: reduceRight,
    filter: filter,
    select: filter,
    reject: reject,
    every: every,
    all: every,
    some: some,
    any: some,
    contains: contains,
    includes: contains,
    include: contains,
    invoke: invoke,
    pluck: pluck,
    where: where,
    max: max,
    min: min,
    shuffle: shuffle,
    sample: sample,
    sortBy: sortBy,
    groupBy: groupBy,
    indexBy: indexBy,
    countBy: countBy,
    partition: partition,
    toArray: toArray,
    size: size,
    pick: pick,
    omit: omit,
    first: first,
    head: first,
    take: first,
    initial: initial,
    last: last,
    rest: rest,
    tail: rest,
    drop: rest,
    compact: compact,
    flatten: flatten,
    without: without,
    uniq: uniq,
    unique: uniq,
    union: union,
    intersection: intersection,
    difference: difference,
    unzip: unzip,
    transpose: unzip,
    zip: zip,
    object: object,
    range: range,
    chunk: chunk,
    mixin: mixin,
    'default': _$1
  };

  // Default Export

  // Add all of the Underscore functions to the wrapper object.
  var _ = mixin(allExports);
  // Legacy Node.js API.
  _._ = _;

  return _;

})));


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],103:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var assign, getValue, isArray, isEmpty, isFunction, isObject, isPlainObject,
    slice = [].slice,
    hasProp = {}.hasOwnProperty;

  assign = function() {
    var i, key, len, source, sources, target;
    target = arguments[0], sources = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    if (isFunction(Object.assign)) {
      Object.assign.apply(null, arguments);
    } else {
      for (i = 0, len = sources.length; i < len; i++) {
        source = sources[i];
        if (source != null) {
          for (key in source) {
            if (!hasProp.call(source, key)) continue;
            target[key] = source[key];
          }
        }
      }
    }
    return target;
  };

  isFunction = function(val) {
    return !!val && Object.prototype.toString.call(val) === '[object Function]';
  };

  isObject = function(val) {
    var ref;
    return !!val && ((ref = typeof val) === 'function' || ref === 'object');
  };

  isArray = function(val) {
    if (isFunction(Array.isArray)) {
      return Array.isArray(val);
    } else {
      return Object.prototype.toString.call(val) === '[object Array]';
    }
  };

  isEmpty = function(val) {
    var key;
    if (isArray(val)) {
      return !val.length;
    } else {
      for (key in val) {
        if (!hasProp.call(val, key)) continue;
        return false;
      }
      return true;
    }
  };

  isPlainObject = function(val) {
    var ctor, proto;
    return isObject(val) && (proto = Object.getPrototypeOf(val)) && (ctor = proto.constructor) && (typeof ctor === 'function') && (ctor instanceof ctor) && (Function.prototype.toString.call(ctor) === Function.prototype.toString.call(Object));
  };

  getValue = function(obj) {
    if (isFunction(obj.valueOf)) {
      return obj.valueOf();
    } else {
      return obj;
    }
  };

  module.exports.assign = assign;

  module.exports.isFunction = isFunction;

  module.exports.isObject = isObject;

  module.exports.isArray = isArray;

  module.exports.isEmpty = isEmpty;

  module.exports.isPlainObject = isPlainObject;

  module.exports.getValue = getValue;

}).call(this);

},{}],104:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLAttribute;

  module.exports = XMLAttribute = (function() {
    function XMLAttribute(parent, name, value) {
      this.options = parent.options;
      this.stringify = parent.stringify;
      this.parent = parent;
      if (name == null) {
        throw new Error("Missing attribute name. " + this.debugInfo(name));
      }
      if (value == null) {
        throw new Error("Missing attribute value. " + this.debugInfo(name));
      }
      this.name = this.stringify.attName(name);
      this.value = this.stringify.attValue(value);
    }

    XMLAttribute.prototype.clone = function() {
      return Object.create(this);
    };

    XMLAttribute.prototype.toString = function(options) {
      return this.options.writer.set(options).attribute(this);
    };

    XMLAttribute.prototype.debugInfo = function(name) {
      var ref, ref1;
      name = name || this.name;
      if ((name == null) && !((ref = this.parent) != null ? ref.name : void 0)) {
        return "";
      } else if (name == null) {
        return "parent: <" + this.parent.name + ">";
      } else if (!((ref1 = this.parent) != null ? ref1.name : void 0)) {
        return "attribute: {" + name + "}";
      } else {
        return "attribute: {" + name + "}, parent: <" + this.parent.name + ">";
      }
    };

    return XMLAttribute;

  })();

}).call(this);

},{}],105:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLCData, XMLNode,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  XMLNode = require('./XMLNode');

  module.exports = XMLCData = (function(superClass) {
    extend(XMLCData, superClass);

    function XMLCData(parent, text) {
      XMLCData.__super__.constructor.call(this, parent);
      if (text == null) {
        throw new Error("Missing CDATA text. " + this.debugInfo());
      }
      this.text = this.stringify.cdata(text);
    }

    XMLCData.prototype.clone = function() {
      return Object.create(this);
    };

    XMLCData.prototype.toString = function(options) {
      return this.options.writer.set(options).cdata(this);
    };

    return XMLCData;

  })(XMLNode);

}).call(this);

},{"./XMLNode":116}],106:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLComment, XMLNode,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  XMLNode = require('./XMLNode');

  module.exports = XMLComment = (function(superClass) {
    extend(XMLComment, superClass);

    function XMLComment(parent, text) {
      XMLComment.__super__.constructor.call(this, parent);
      if (text == null) {
        throw new Error("Missing comment text. " + this.debugInfo());
      }
      this.text = this.stringify.comment(text);
    }

    XMLComment.prototype.clone = function() {
      return Object.create(this);
    };

    XMLComment.prototype.toString = function(options) {
      return this.options.writer.set(options).comment(this);
    };

    return XMLComment;

  })(XMLNode);

}).call(this);

},{"./XMLNode":116}],107:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLDTDAttList, XMLNode,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  XMLNode = require('./XMLNode');

  module.exports = XMLDTDAttList = (function(superClass) {
    extend(XMLDTDAttList, superClass);

    function XMLDTDAttList(parent, elementName, attributeName, attributeType, defaultValueType, defaultValue) {
      XMLDTDAttList.__super__.constructor.call(this, parent);
      if (elementName == null) {
        throw new Error("Missing DTD element name. " + this.debugInfo());
      }
      if (attributeName == null) {
        throw new Error("Missing DTD attribute name. " + this.debugInfo(elementName));
      }
      if (!attributeType) {
        throw new Error("Missing DTD attribute type. " + this.debugInfo(elementName));
      }
      if (!defaultValueType) {
        throw new Error("Missing DTD attribute default. " + this.debugInfo(elementName));
      }
      if (defaultValueType.indexOf('#') !== 0) {
        defaultValueType = '#' + defaultValueType;
      }
      if (!defaultValueType.match(/^(#REQUIRED|#IMPLIED|#FIXED|#DEFAULT)$/)) {
        throw new Error("Invalid default value type; expected: #REQUIRED, #IMPLIED, #FIXED or #DEFAULT. " + this.debugInfo(elementName));
      }
      if (defaultValue && !defaultValueType.match(/^(#FIXED|#DEFAULT)$/)) {
        throw new Error("Default value only applies to #FIXED or #DEFAULT. " + this.debugInfo(elementName));
      }
      this.elementName = this.stringify.eleName(elementName);
      this.attributeName = this.stringify.attName(attributeName);
      this.attributeType = this.stringify.dtdAttType(attributeType);
      this.defaultValue = this.stringify.dtdAttDefault(defaultValue);
      this.defaultValueType = defaultValueType;
    }

    XMLDTDAttList.prototype.toString = function(options) {
      return this.options.writer.set(options).dtdAttList(this);
    };

    return XMLDTDAttList;

  })(XMLNode);

}).call(this);

},{"./XMLNode":116}],108:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLDTDElement, XMLNode,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  XMLNode = require('./XMLNode');

  module.exports = XMLDTDElement = (function(superClass) {
    extend(XMLDTDElement, superClass);

    function XMLDTDElement(parent, name, value) {
      XMLDTDElement.__super__.constructor.call(this, parent);
      if (name == null) {
        throw new Error("Missing DTD element name. " + this.debugInfo());
      }
      if (!value) {
        value = '(#PCDATA)';
      }
      if (Array.isArray(value)) {
        value = '(' + value.join(',') + ')';
      }
      this.name = this.stringify.eleName(name);
      this.value = this.stringify.dtdElementValue(value);
    }

    XMLDTDElement.prototype.toString = function(options) {
      return this.options.writer.set(options).dtdElement(this);
    };

    return XMLDTDElement;

  })(XMLNode);

}).call(this);

},{"./XMLNode":116}],109:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLDTDEntity, XMLNode, isObject,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  isObject = require('./Utility').isObject;

  XMLNode = require('./XMLNode');

  module.exports = XMLDTDEntity = (function(superClass) {
    extend(XMLDTDEntity, superClass);

    function XMLDTDEntity(parent, pe, name, value) {
      XMLDTDEntity.__super__.constructor.call(this, parent);
      if (name == null) {
        throw new Error("Missing DTD entity name. " + this.debugInfo(name));
      }
      if (value == null) {
        throw new Error("Missing DTD entity value. " + this.debugInfo(name));
      }
      this.pe = !!pe;
      this.name = this.stringify.eleName(name);
      if (!isObject(value)) {
        this.value = this.stringify.dtdEntityValue(value);
      } else {
        if (!value.pubID && !value.sysID) {
          throw new Error("Public and/or system identifiers are required for an external entity. " + this.debugInfo(name));
        }
        if (value.pubID && !value.sysID) {
          throw new Error("System identifier is required for a public external entity. " + this.debugInfo(name));
        }
        if (value.pubID != null) {
          this.pubID = this.stringify.dtdPubID(value.pubID);
        }
        if (value.sysID != null) {
          this.sysID = this.stringify.dtdSysID(value.sysID);
        }
        if (value.nData != null) {
          this.nData = this.stringify.dtdNData(value.nData);
        }
        if (this.pe && this.nData) {
          throw new Error("Notation declaration is not allowed in a parameter entity. " + this.debugInfo(name));
        }
      }
    }

    XMLDTDEntity.prototype.toString = function(options) {
      return this.options.writer.set(options).dtdEntity(this);
    };

    return XMLDTDEntity;

  })(XMLNode);

}).call(this);

},{"./Utility":103,"./XMLNode":116}],110:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLDTDNotation, XMLNode,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  XMLNode = require('./XMLNode');

  module.exports = XMLDTDNotation = (function(superClass) {
    extend(XMLDTDNotation, superClass);

    function XMLDTDNotation(parent, name, value) {
      XMLDTDNotation.__super__.constructor.call(this, parent);
      if (name == null) {
        throw new Error("Missing DTD notation name. " + this.debugInfo(name));
      }
      if (!value.pubID && !value.sysID) {
        throw new Error("Public or system identifiers are required for an external entity. " + this.debugInfo(name));
      }
      this.name = this.stringify.eleName(name);
      if (value.pubID != null) {
        this.pubID = this.stringify.dtdPubID(value.pubID);
      }
      if (value.sysID != null) {
        this.sysID = this.stringify.dtdSysID(value.sysID);
      }
    }

    XMLDTDNotation.prototype.toString = function(options) {
      return this.options.writer.set(options).dtdNotation(this);
    };

    return XMLDTDNotation;

  })(XMLNode);

}).call(this);

},{"./XMLNode":116}],111:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLDeclaration, XMLNode, isObject,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  isObject = require('./Utility').isObject;

  XMLNode = require('./XMLNode');

  module.exports = XMLDeclaration = (function(superClass) {
    extend(XMLDeclaration, superClass);

    function XMLDeclaration(parent, version, encoding, standalone) {
      var ref;
      XMLDeclaration.__super__.constructor.call(this, parent);
      if (isObject(version)) {
        ref = version, version = ref.version, encoding = ref.encoding, standalone = ref.standalone;
      }
      if (!version) {
        version = '1.0';
      }
      this.version = this.stringify.xmlVersion(version);
      if (encoding != null) {
        this.encoding = this.stringify.xmlEncoding(encoding);
      }
      if (standalone != null) {
        this.standalone = this.stringify.xmlStandalone(standalone);
      }
    }

    XMLDeclaration.prototype.toString = function(options) {
      return this.options.writer.set(options).declaration(this);
    };

    return XMLDeclaration;

  })(XMLNode);

}).call(this);

},{"./Utility":103,"./XMLNode":116}],112:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLDTDAttList, XMLDTDElement, XMLDTDEntity, XMLDTDNotation, XMLDocType, XMLNode, isObject,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  isObject = require('./Utility').isObject;

  XMLNode = require('./XMLNode');

  XMLDTDAttList = require('./XMLDTDAttList');

  XMLDTDEntity = require('./XMLDTDEntity');

  XMLDTDElement = require('./XMLDTDElement');

  XMLDTDNotation = require('./XMLDTDNotation');

  module.exports = XMLDocType = (function(superClass) {
    extend(XMLDocType, superClass);

    function XMLDocType(parent, pubID, sysID) {
      var ref, ref1;
      XMLDocType.__super__.constructor.call(this, parent);
      this.name = "!DOCTYPE";
      this.documentObject = parent;
      if (isObject(pubID)) {
        ref = pubID, pubID = ref.pubID, sysID = ref.sysID;
      }
      if (sysID == null) {
        ref1 = [pubID, sysID], sysID = ref1[0], pubID = ref1[1];
      }
      if (pubID != null) {
        this.pubID = this.stringify.dtdPubID(pubID);
      }
      if (sysID != null) {
        this.sysID = this.stringify.dtdSysID(sysID);
      }
    }

    XMLDocType.prototype.element = function(name, value) {
      var child;
      child = new XMLDTDElement(this, name, value);
      this.children.push(child);
      return this;
    };

    XMLDocType.prototype.attList = function(elementName, attributeName, attributeType, defaultValueType, defaultValue) {
      var child;
      child = new XMLDTDAttList(this, elementName, attributeName, attributeType, defaultValueType, defaultValue);
      this.children.push(child);
      return this;
    };

    XMLDocType.prototype.entity = function(name, value) {
      var child;
      child = new XMLDTDEntity(this, false, name, value);
      this.children.push(child);
      return this;
    };

    XMLDocType.prototype.pEntity = function(name, value) {
      var child;
      child = new XMLDTDEntity(this, true, name, value);
      this.children.push(child);
      return this;
    };

    XMLDocType.prototype.notation = function(name, value) {
      var child;
      child = new XMLDTDNotation(this, name, value);
      this.children.push(child);
      return this;
    };

    XMLDocType.prototype.toString = function(options) {
      return this.options.writer.set(options).docType(this);
    };

    XMLDocType.prototype.ele = function(name, value) {
      return this.element(name, value);
    };

    XMLDocType.prototype.att = function(elementName, attributeName, attributeType, defaultValueType, defaultValue) {
      return this.attList(elementName, attributeName, attributeType, defaultValueType, defaultValue);
    };

    XMLDocType.prototype.ent = function(name, value) {
      return this.entity(name, value);
    };

    XMLDocType.prototype.pent = function(name, value) {
      return this.pEntity(name, value);
    };

    XMLDocType.prototype.not = function(name, value) {
      return this.notation(name, value);
    };

    XMLDocType.prototype.up = function() {
      return this.root() || this.documentObject;
    };

    return XMLDocType;

  })(XMLNode);

}).call(this);

},{"./Utility":103,"./XMLDTDAttList":107,"./XMLDTDElement":108,"./XMLDTDEntity":109,"./XMLDTDNotation":110,"./XMLNode":116}],113:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLDocument, XMLNode, XMLStringWriter, XMLStringifier, isPlainObject,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  isPlainObject = require('./Utility').isPlainObject;

  XMLNode = require('./XMLNode');

  XMLStringifier = require('./XMLStringifier');

  XMLStringWriter = require('./XMLStringWriter');

  module.exports = XMLDocument = (function(superClass) {
    extend(XMLDocument, superClass);

    function XMLDocument(options) {
      XMLDocument.__super__.constructor.call(this, null);
      this.name = "?xml";
      options || (options = {});
      if (!options.writer) {
        options.writer = new XMLStringWriter();
      }
      this.options = options;
      this.stringify = new XMLStringifier(options);
      this.isDocument = true;
    }

    XMLDocument.prototype.end = function(writer) {
      var writerOptions;
      if (!writer) {
        writer = this.options.writer;
      } else if (isPlainObject(writer)) {
        writerOptions = writer;
        writer = this.options.writer.set(writerOptions);
      }
      return writer.document(this);
    };

    XMLDocument.prototype.toString = function(options) {
      return this.options.writer.set(options).document(this);
    };

    return XMLDocument;

  })(XMLNode);

}).call(this);

},{"./Utility":103,"./XMLNode":116,"./XMLStringWriter":120,"./XMLStringifier":121}],114:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLAttribute, XMLCData, XMLComment, XMLDTDAttList, XMLDTDElement, XMLDTDEntity, XMLDTDNotation, XMLDeclaration, XMLDocType, XMLDocumentCB, XMLElement, XMLProcessingInstruction, XMLRaw, XMLStringWriter, XMLStringifier, XMLText, getValue, isFunction, isObject, isPlainObject, ref,
    hasProp = {}.hasOwnProperty;

  ref = require('./Utility'), isObject = ref.isObject, isFunction = ref.isFunction, isPlainObject = ref.isPlainObject, getValue = ref.getValue;

  XMLElement = require('./XMLElement');

  XMLCData = require('./XMLCData');

  XMLComment = require('./XMLComment');

  XMLRaw = require('./XMLRaw');

  XMLText = require('./XMLText');

  XMLProcessingInstruction = require('./XMLProcessingInstruction');

  XMLDeclaration = require('./XMLDeclaration');

  XMLDocType = require('./XMLDocType');

  XMLDTDAttList = require('./XMLDTDAttList');

  XMLDTDEntity = require('./XMLDTDEntity');

  XMLDTDElement = require('./XMLDTDElement');

  XMLDTDNotation = require('./XMLDTDNotation');

  XMLAttribute = require('./XMLAttribute');

  XMLStringifier = require('./XMLStringifier');

  XMLStringWriter = require('./XMLStringWriter');

  module.exports = XMLDocumentCB = (function() {
    function XMLDocumentCB(options, onData, onEnd) {
      var writerOptions;
      this.name = "?xml";
      options || (options = {});
      if (!options.writer) {
        options.writer = new XMLStringWriter(options);
      } else if (isPlainObject(options.writer)) {
        writerOptions = options.writer;
        options.writer = new XMLStringWriter(writerOptions);
      }
      this.options = options;
      this.writer = options.writer;
      this.stringify = new XMLStringifier(options);
      this.onDataCallback = onData || function() {};
      this.onEndCallback = onEnd || function() {};
      this.currentNode = null;
      this.currentLevel = -1;
      this.openTags = {};
      this.documentStarted = false;
      this.documentCompleted = false;
      this.root = null;
    }

    XMLDocumentCB.prototype.node = function(name, attributes, text) {
      var ref1;
      if (name == null) {
        throw new Error("Missing node name.");
      }
      if (this.root && this.currentLevel === -1) {
        throw new Error("Document can only have one root node. " + this.debugInfo(name));
      }
      this.openCurrent();
      name = getValue(name);
      if (attributes == null) {
        attributes = {};
      }
      attributes = getValue(attributes);
      if (!isObject(attributes)) {
        ref1 = [attributes, text], text = ref1[0], attributes = ref1[1];
      }
      this.currentNode = new XMLElement(this, name, attributes);
      this.currentNode.children = false;
      this.currentLevel++;
      this.openTags[this.currentLevel] = this.currentNode;
      if (text != null) {
        this.text(text);
      }
      return this;
    };

    XMLDocumentCB.prototype.element = function(name, attributes, text) {
      if (this.currentNode && this.currentNode instanceof XMLDocType) {
        return this.dtdElement.apply(this, arguments);
      } else {
        return this.node(name, attributes, text);
      }
    };

    XMLDocumentCB.prototype.attribute = function(name, value) {
      var attName, attValue;
      if (!this.currentNode || this.currentNode.children) {
        throw new Error("att() can only be used immediately after an ele() call in callback mode. " + this.debugInfo(name));
      }
      if (name != null) {
        name = getValue(name);
      }
      if (isObject(name)) {
        for (attName in name) {
          if (!hasProp.call(name, attName)) continue;
          attValue = name[attName];
          this.attribute(attName, attValue);
        }
      } else {
        if (isFunction(value)) {
          value = value.apply();
        }
        if (!this.options.skipNullAttributes || (value != null)) {
          this.currentNode.attributes[name] = new XMLAttribute(this, name, value);
        }
      }
      return this;
    };

    XMLDocumentCB.prototype.text = function(value) {
      var node;
      this.openCurrent();
      node = new XMLText(this, value);
      this.onData(this.writer.text(node, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    };

    XMLDocumentCB.prototype.cdata = function(value) {
      var node;
      this.openCurrent();
      node = new XMLCData(this, value);
      this.onData(this.writer.cdata(node, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    };

    XMLDocumentCB.prototype.comment = function(value) {
      var node;
      this.openCurrent();
      node = new XMLComment(this, value);
      this.onData(this.writer.comment(node, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    };

    XMLDocumentCB.prototype.raw = function(value) {
      var node;
      this.openCurrent();
      node = new XMLRaw(this, value);
      this.onData(this.writer.raw(node, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    };

    XMLDocumentCB.prototype.instruction = function(target, value) {
      var i, insTarget, insValue, len, node;
      this.openCurrent();
      if (target != null) {
        target = getValue(target);
      }
      if (value != null) {
        value = getValue(value);
      }
      if (Array.isArray(target)) {
        for (i = 0, len = target.length; i < len; i++) {
          insTarget = target[i];
          this.instruction(insTarget);
        }
      } else if (isObject(target)) {
        for (insTarget in target) {
          if (!hasProp.call(target, insTarget)) continue;
          insValue = target[insTarget];
          this.instruction(insTarget, insValue);
        }
      } else {
        if (isFunction(value)) {
          value = value.apply();
        }
        node = new XMLProcessingInstruction(this, target, value);
        this.onData(this.writer.processingInstruction(node, this.currentLevel + 1), this.currentLevel + 1);
      }
      return this;
    };

    XMLDocumentCB.prototype.declaration = function(version, encoding, standalone) {
      var node;
      this.openCurrent();
      if (this.documentStarted) {
        throw new Error("declaration() must be the first node.");
      }
      node = new XMLDeclaration(this, version, encoding, standalone);
      this.onData(this.writer.declaration(node, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    };

    XMLDocumentCB.prototype.doctype = function(root, pubID, sysID) {
      this.openCurrent();
      if (root == null) {
        throw new Error("Missing root node name.");
      }
      if (this.root) {
        throw new Error("dtd() must come before the root node.");
      }
      this.currentNode = new XMLDocType(this, pubID, sysID);
      this.currentNode.rootNodeName = root;
      this.currentNode.children = false;
      this.currentLevel++;
      this.openTags[this.currentLevel] = this.currentNode;
      return this;
    };

    XMLDocumentCB.prototype.dtdElement = function(name, value) {
      var node;
      this.openCurrent();
      node = new XMLDTDElement(this, name, value);
      this.onData(this.writer.dtdElement(node, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    };

    XMLDocumentCB.prototype.attList = function(elementName, attributeName, attributeType, defaultValueType, defaultValue) {
      var node;
      this.openCurrent();
      node = new XMLDTDAttList(this, elementName, attributeName, attributeType, defaultValueType, defaultValue);
      this.onData(this.writer.dtdAttList(node, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    };

    XMLDocumentCB.prototype.entity = function(name, value) {
      var node;
      this.openCurrent();
      node = new XMLDTDEntity(this, false, name, value);
      this.onData(this.writer.dtdEntity(node, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    };

    XMLDocumentCB.prototype.pEntity = function(name, value) {
      var node;
      this.openCurrent();
      node = new XMLDTDEntity(this, true, name, value);
      this.onData(this.writer.dtdEntity(node, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    };

    XMLDocumentCB.prototype.notation = function(name, value) {
      var node;
      this.openCurrent();
      node = new XMLDTDNotation(this, name, value);
      this.onData(this.writer.dtdNotation(node, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    };

    XMLDocumentCB.prototype.up = function() {
      if (this.currentLevel < 0) {
        throw new Error("The document node has no parent.");
      }
      if (this.currentNode) {
        if (this.currentNode.children) {
          this.closeNode(this.currentNode);
        } else {
          this.openNode(this.currentNode);
        }
        this.currentNode = null;
      } else {
        this.closeNode(this.openTags[this.currentLevel]);
      }
      delete this.openTags[this.currentLevel];
      this.currentLevel--;
      return this;
    };

    XMLDocumentCB.prototype.end = function() {
      while (this.currentLevel >= 0) {
        this.up();
      }
      return this.onEnd();
    };

    XMLDocumentCB.prototype.openCurrent = function() {
      if (this.currentNode) {
        this.currentNode.children = true;
        return this.openNode(this.currentNode);
      }
    };

    XMLDocumentCB.prototype.openNode = function(node) {
      if (!node.isOpen) {
        if (!this.root && this.currentLevel === 0 && node instanceof XMLElement) {
          this.root = node;
        }
        this.onData(this.writer.openNode(node, this.currentLevel), this.currentLevel);
        return node.isOpen = true;
      }
    };

    XMLDocumentCB.prototype.closeNode = function(node) {
      if (!node.isClosed) {
        this.onData(this.writer.closeNode(node, this.currentLevel), this.currentLevel);
        return node.isClosed = true;
      }
    };

    XMLDocumentCB.prototype.onData = function(chunk, level) {
      this.documentStarted = true;
      return this.onDataCallback(chunk, level + 1);
    };

    XMLDocumentCB.prototype.onEnd = function() {
      this.documentCompleted = true;
      return this.onEndCallback();
    };

    XMLDocumentCB.prototype.debugInfo = function(name) {
      if (name == null) {
        return "";
      } else {
        return "node: <" + name + ">";
      }
    };

    XMLDocumentCB.prototype.ele = function() {
      return this.element.apply(this, arguments);
    };

    XMLDocumentCB.prototype.nod = function(name, attributes, text) {
      return this.node(name, attributes, text);
    };

    XMLDocumentCB.prototype.txt = function(value) {
      return this.text(value);
    };

    XMLDocumentCB.prototype.dat = function(value) {
      return this.cdata(value);
    };

    XMLDocumentCB.prototype.com = function(value) {
      return this.comment(value);
    };

    XMLDocumentCB.prototype.ins = function(target, value) {
      return this.instruction(target, value);
    };

    XMLDocumentCB.prototype.dec = function(version, encoding, standalone) {
      return this.declaration(version, encoding, standalone);
    };

    XMLDocumentCB.prototype.dtd = function(root, pubID, sysID) {
      return this.doctype(root, pubID, sysID);
    };

    XMLDocumentCB.prototype.e = function(name, attributes, text) {
      return this.element(name, attributes, text);
    };

    XMLDocumentCB.prototype.n = function(name, attributes, text) {
      return this.node(name, attributes, text);
    };

    XMLDocumentCB.prototype.t = function(value) {
      return this.text(value);
    };

    XMLDocumentCB.prototype.d = function(value) {
      return this.cdata(value);
    };

    XMLDocumentCB.prototype.c = function(value) {
      return this.comment(value);
    };

    XMLDocumentCB.prototype.r = function(value) {
      return this.raw(value);
    };

    XMLDocumentCB.prototype.i = function(target, value) {
      return this.instruction(target, value);
    };

    XMLDocumentCB.prototype.att = function() {
      if (this.currentNode && this.currentNode instanceof XMLDocType) {
        return this.attList.apply(this, arguments);
      } else {
        return this.attribute.apply(this, arguments);
      }
    };

    XMLDocumentCB.prototype.a = function() {
      if (this.currentNode && this.currentNode instanceof XMLDocType) {
        return this.attList.apply(this, arguments);
      } else {
        return this.attribute.apply(this, arguments);
      }
    };

    XMLDocumentCB.prototype.ent = function(name, value) {
      return this.entity(name, value);
    };

    XMLDocumentCB.prototype.pent = function(name, value) {
      return this.pEntity(name, value);
    };

    XMLDocumentCB.prototype.not = function(name, value) {
      return this.notation(name, value);
    };

    return XMLDocumentCB;

  })();

}).call(this);

},{"./Utility":103,"./XMLAttribute":104,"./XMLCData":105,"./XMLComment":106,"./XMLDTDAttList":107,"./XMLDTDElement":108,"./XMLDTDEntity":109,"./XMLDTDNotation":110,"./XMLDeclaration":111,"./XMLDocType":112,"./XMLElement":115,"./XMLProcessingInstruction":117,"./XMLRaw":118,"./XMLStringWriter":120,"./XMLStringifier":121,"./XMLText":122}],115:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLAttribute, XMLElement, XMLNode, getValue, isFunction, isObject, ref,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  ref = require('./Utility'), isObject = ref.isObject, isFunction = ref.isFunction, getValue = ref.getValue;

  XMLNode = require('./XMLNode');

  XMLAttribute = require('./XMLAttribute');

  module.exports = XMLElement = (function(superClass) {
    extend(XMLElement, superClass);

    function XMLElement(parent, name, attributes) {
      XMLElement.__super__.constructor.call(this, parent);
      if (name == null) {
        throw new Error("Missing element name. " + this.debugInfo());
      }
      this.name = this.stringify.eleName(name);
      this.attributes = {};
      if (attributes != null) {
        this.attribute(attributes);
      }
      if (parent.isDocument) {
        this.isRoot = true;
        this.documentObject = parent;
        parent.rootObject = this;
      }
    }

    XMLElement.prototype.clone = function() {
      var att, attName, clonedSelf, ref1;
      clonedSelf = Object.create(this);
      if (clonedSelf.isRoot) {
        clonedSelf.documentObject = null;
      }
      clonedSelf.attributes = {};
      ref1 = this.attributes;
      for (attName in ref1) {
        if (!hasProp.call(ref1, attName)) continue;
        att = ref1[attName];
        clonedSelf.attributes[attName] = att.clone();
      }
      clonedSelf.children = [];
      this.children.forEach(function(child) {
        var clonedChild;
        clonedChild = child.clone();
        clonedChild.parent = clonedSelf;
        return clonedSelf.children.push(clonedChild);
      });
      return clonedSelf;
    };

    XMLElement.prototype.attribute = function(name, value) {
      var attName, attValue;
      if (name != null) {
        name = getValue(name);
      }
      if (isObject(name)) {
        for (attName in name) {
          if (!hasProp.call(name, attName)) continue;
          attValue = name[attName];
          this.attribute(attName, attValue);
        }
      } else {
        if (isFunction(value)) {
          value = value.apply();
        }
        if (!this.options.skipNullAttributes || (value != null)) {
          this.attributes[name] = new XMLAttribute(this, name, value);
        }
      }
      return this;
    };

    XMLElement.prototype.removeAttribute = function(name) {
      var attName, i, len;
      if (name == null) {
        throw new Error("Missing attribute name. " + this.debugInfo());
      }
      name = getValue(name);
      if (Array.isArray(name)) {
        for (i = 0, len = name.length; i < len; i++) {
          attName = name[i];
          delete this.attributes[attName];
        }
      } else {
        delete this.attributes[name];
      }
      return this;
    };

    XMLElement.prototype.toString = function(options) {
      return this.options.writer.set(options).element(this);
    };

    XMLElement.prototype.att = function(name, value) {
      return this.attribute(name, value);
    };

    XMLElement.prototype.a = function(name, value) {
      return this.attribute(name, value);
    };

    return XMLElement;

  })(XMLNode);

}).call(this);

},{"./Utility":103,"./XMLAttribute":104,"./XMLNode":116}],116:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLCData, XMLComment, XMLDeclaration, XMLDocType, XMLElement, XMLNode, XMLProcessingInstruction, XMLRaw, XMLText, getValue, isEmpty, isFunction, isObject, ref,
    hasProp = {}.hasOwnProperty;

  ref = require('./Utility'), isObject = ref.isObject, isFunction = ref.isFunction, isEmpty = ref.isEmpty, getValue = ref.getValue;

  XMLElement = null;

  XMLCData = null;

  XMLComment = null;

  XMLDeclaration = null;

  XMLDocType = null;

  XMLRaw = null;

  XMLText = null;

  XMLProcessingInstruction = null;

  module.exports = XMLNode = (function() {
    function XMLNode(parent) {
      this.parent = parent;
      if (this.parent) {
        this.options = this.parent.options;
        this.stringify = this.parent.stringify;
      }
      this.children = [];
      if (!XMLElement) {
        XMLElement = require('./XMLElement');
        XMLCData = require('./XMLCData');
        XMLComment = require('./XMLComment');
        XMLDeclaration = require('./XMLDeclaration');
        XMLDocType = require('./XMLDocType');
        XMLRaw = require('./XMLRaw');
        XMLText = require('./XMLText');
        XMLProcessingInstruction = require('./XMLProcessingInstruction');
      }
    }

    XMLNode.prototype.element = function(name, attributes, text) {
      var childNode, item, j, k, key, lastChild, len, len1, ref1, val;
      lastChild = null;
      if (attributes == null) {
        attributes = {};
      }
      attributes = getValue(attributes);
      if (!isObject(attributes)) {
        ref1 = [attributes, text], text = ref1[0], attributes = ref1[1];
      }
      if (name != null) {
        name = getValue(name);
      }
      if (Array.isArray(name)) {
        for (j = 0, len = name.length; j < len; j++) {
          item = name[j];
          lastChild = this.element(item);
        }
      } else if (isFunction(name)) {
        lastChild = this.element(name.apply());
      } else if (isObject(name)) {
        for (key in name) {
          if (!hasProp.call(name, key)) continue;
          val = name[key];
          if (isFunction(val)) {
            val = val.apply();
          }
          if ((isObject(val)) && (isEmpty(val))) {
            val = null;
          }
          if (!this.options.ignoreDecorators && this.stringify.convertAttKey && key.indexOf(this.stringify.convertAttKey) === 0) {
            lastChild = this.attribute(key.substr(this.stringify.convertAttKey.length), val);
          } else if (!this.options.separateArrayItems && Array.isArray(val)) {
            for (k = 0, len1 = val.length; k < len1; k++) {
              item = val[k];
              childNode = {};
              childNode[key] = item;
              lastChild = this.element(childNode);
            }
          } else if (isObject(val)) {
            lastChild = this.element(key);
            lastChild.element(val);
          } else {
            lastChild = this.element(key, val);
          }
        }
      } else {
        if (!this.options.ignoreDecorators && this.stringify.convertTextKey && name.indexOf(this.stringify.convertTextKey) === 0) {
          lastChild = this.text(text);
        } else if (!this.options.ignoreDecorators && this.stringify.convertCDataKey && name.indexOf(this.stringify.convertCDataKey) === 0) {
          lastChild = this.cdata(text);
        } else if (!this.options.ignoreDecorators && this.stringify.convertCommentKey && name.indexOf(this.stringify.convertCommentKey) === 0) {
          lastChild = this.comment(text);
        } else if (!this.options.ignoreDecorators && this.stringify.convertRawKey && name.indexOf(this.stringify.convertRawKey) === 0) {
          lastChild = this.raw(text);
        } else if (!this.options.ignoreDecorators && this.stringify.convertPIKey && name.indexOf(this.stringify.convertPIKey) === 0) {
          lastChild = this.instruction(name.substr(this.stringify.convertPIKey.length), text);
        } else {
          lastChild = this.node(name, attributes, text);
        }
      }
      if (lastChild == null) {
        throw new Error("Could not create any elements with: " + name + ". " + this.debugInfo());
      }
      return lastChild;
    };

    XMLNode.prototype.insertBefore = function(name, attributes, text) {
      var child, i, removed;
      if (this.isRoot) {
        throw new Error("Cannot insert elements at root level. " + this.debugInfo(name));
      }
      i = this.parent.children.indexOf(this);
      removed = this.parent.children.splice(i);
      child = this.parent.element(name, attributes, text);
      Array.prototype.push.apply(this.parent.children, removed);
      return child;
    };

    XMLNode.prototype.insertAfter = function(name, attributes, text) {
      var child, i, removed;
      if (this.isRoot) {
        throw new Error("Cannot insert elements at root level. " + this.debugInfo(name));
      }
      i = this.parent.children.indexOf(this);
      removed = this.parent.children.splice(i + 1);
      child = this.parent.element(name, attributes, text);
      Array.prototype.push.apply(this.parent.children, removed);
      return child;
    };

    XMLNode.prototype.remove = function() {
      var i, ref1;
      if (this.isRoot) {
        throw new Error("Cannot remove the root element. " + this.debugInfo());
      }
      i = this.parent.children.indexOf(this);
      [].splice.apply(this.parent.children, [i, i - i + 1].concat(ref1 = [])), ref1;
      return this.parent;
    };

    XMLNode.prototype.node = function(name, attributes, text) {
      var child, ref1;
      if (name != null) {
        name = getValue(name);
      }
      attributes || (attributes = {});
      attributes = getValue(attributes);
      if (!isObject(attributes)) {
        ref1 = [attributes, text], text = ref1[0], attributes = ref1[1];
      }
      child = new XMLElement(this, name, attributes);
      if (text != null) {
        child.text(text);
      }
      this.children.push(child);
      return child;
    };

    XMLNode.prototype.text = function(value) {
      var child;
      child = new XMLText(this, value);
      this.children.push(child);
      return this;
    };

    XMLNode.prototype.cdata = function(value) {
      var child;
      child = new XMLCData(this, value);
      this.children.push(child);
      return this;
    };

    XMLNode.prototype.comment = function(value) {
      var child;
      child = new XMLComment(this, value);
      this.children.push(child);
      return this;
    };

    XMLNode.prototype.commentBefore = function(value) {
      var child, i, removed;
      i = this.parent.children.indexOf(this);
      removed = this.parent.children.splice(i);
      child = this.parent.comment(value);
      Array.prototype.push.apply(this.parent.children, removed);
      return this;
    };

    XMLNode.prototype.commentAfter = function(value) {
      var child, i, removed;
      i = this.parent.children.indexOf(this);
      removed = this.parent.children.splice(i + 1);
      child = this.parent.comment(value);
      Array.prototype.push.apply(this.parent.children, removed);
      return this;
    };

    XMLNode.prototype.raw = function(value) {
      var child;
      child = new XMLRaw(this, value);
      this.children.push(child);
      return this;
    };

    XMLNode.prototype.instruction = function(target, value) {
      var insTarget, insValue, instruction, j, len;
      if (target != null) {
        target = getValue(target);
      }
      if (value != null) {
        value = getValue(value);
      }
      if (Array.isArray(target)) {
        for (j = 0, len = target.length; j < len; j++) {
          insTarget = target[j];
          this.instruction(insTarget);
        }
      } else if (isObject(target)) {
        for (insTarget in target) {
          if (!hasProp.call(target, insTarget)) continue;
          insValue = target[insTarget];
          this.instruction(insTarget, insValue);
        }
      } else {
        if (isFunction(value)) {
          value = value.apply();
        }
        instruction = new XMLProcessingInstruction(this, target, value);
        this.children.push(instruction);
      }
      return this;
    };

    XMLNode.prototype.instructionBefore = function(target, value) {
      var child, i, removed;
      i = this.parent.children.indexOf(this);
      removed = this.parent.children.splice(i);
      child = this.parent.instruction(target, value);
      Array.prototype.push.apply(this.parent.children, removed);
      return this;
    };

    XMLNode.prototype.instructionAfter = function(target, value) {
      var child, i, removed;
      i = this.parent.children.indexOf(this);
      removed = this.parent.children.splice(i + 1);
      child = this.parent.instruction(target, value);
      Array.prototype.push.apply(this.parent.children, removed);
      return this;
    };

    XMLNode.prototype.declaration = function(version, encoding, standalone) {
      var doc, xmldec;
      doc = this.document();
      xmldec = new XMLDeclaration(doc, version, encoding, standalone);
      if (doc.children[0] instanceof XMLDeclaration) {
        doc.children[0] = xmldec;
      } else {
        doc.children.unshift(xmldec);
      }
      return doc.root() || doc;
    };

    XMLNode.prototype.doctype = function(pubID, sysID) {
      var child, doc, doctype, i, j, k, len, len1, ref1, ref2;
      doc = this.document();
      doctype = new XMLDocType(doc, pubID, sysID);
      ref1 = doc.children;
      for (i = j = 0, len = ref1.length; j < len; i = ++j) {
        child = ref1[i];
        if (child instanceof XMLDocType) {
          doc.children[i] = doctype;
          return doctype;
        }
      }
      ref2 = doc.children;
      for (i = k = 0, len1 = ref2.length; k < len1; i = ++k) {
        child = ref2[i];
        if (child.isRoot) {
          doc.children.splice(i, 0, doctype);
          return doctype;
        }
      }
      doc.children.push(doctype);
      return doctype;
    };

    XMLNode.prototype.up = function() {
      if (this.isRoot) {
        throw new Error("The root node has no parent. Use doc() if you need to get the document object.");
      }
      return this.parent;
    };

    XMLNode.prototype.root = function() {
      var node;
      node = this;
      while (node) {
        if (node.isDocument) {
          return node.rootObject;
        } else if (node.isRoot) {
          return node;
        } else {
          node = node.parent;
        }
      }
    };

    XMLNode.prototype.document = function() {
      var node;
      node = this;
      while (node) {
        if (node.isDocument) {
          return node;
        } else {
          node = node.parent;
        }
      }
    };

    XMLNode.prototype.end = function(options) {
      return this.document().end(options);
    };

    XMLNode.prototype.prev = function() {
      var i;
      i = this.parent.children.indexOf(this);
      if (i < 1) {
        throw new Error("Already at the first node. " + this.debugInfo());
      }
      return this.parent.children[i - 1];
    };

    XMLNode.prototype.next = function() {
      var i;
      i = this.parent.children.indexOf(this);
      if (i === -1 || i === this.parent.children.length - 1) {
        throw new Error("Already at the last node. " + this.debugInfo());
      }
      return this.parent.children[i + 1];
    };

    XMLNode.prototype.importDocument = function(doc) {
      var clonedRoot;
      clonedRoot = doc.root().clone();
      clonedRoot.parent = this;
      clonedRoot.isRoot = false;
      this.children.push(clonedRoot);
      return this;
    };

    XMLNode.prototype.debugInfo = function(name) {
      var ref1, ref2;
      name = name || this.name;
      if ((name == null) && !((ref1 = this.parent) != null ? ref1.name : void 0)) {
        return "";
      } else if (name == null) {
        return "parent: <" + this.parent.name + ">";
      } else if (!((ref2 = this.parent) != null ? ref2.name : void 0)) {
        return "node: <" + name + ">";
      } else {
        return "node: <" + name + ">, parent: <" + this.parent.name + ">";
      }
    };

    XMLNode.prototype.ele = function(name, attributes, text) {
      return this.element(name, attributes, text);
    };

    XMLNode.prototype.nod = function(name, attributes, text) {
      return this.node(name, attributes, text);
    };

    XMLNode.prototype.txt = function(value) {
      return this.text(value);
    };

    XMLNode.prototype.dat = function(value) {
      return this.cdata(value);
    };

    XMLNode.prototype.com = function(value) {
      return this.comment(value);
    };

    XMLNode.prototype.ins = function(target, value) {
      return this.instruction(target, value);
    };

    XMLNode.prototype.doc = function() {
      return this.document();
    };

    XMLNode.prototype.dec = function(version, encoding, standalone) {
      return this.declaration(version, encoding, standalone);
    };

    XMLNode.prototype.dtd = function(pubID, sysID) {
      return this.doctype(pubID, sysID);
    };

    XMLNode.prototype.e = function(name, attributes, text) {
      return this.element(name, attributes, text);
    };

    XMLNode.prototype.n = function(name, attributes, text) {
      return this.node(name, attributes, text);
    };

    XMLNode.prototype.t = function(value) {
      return this.text(value);
    };

    XMLNode.prototype.d = function(value) {
      return this.cdata(value);
    };

    XMLNode.prototype.c = function(value) {
      return this.comment(value);
    };

    XMLNode.prototype.r = function(value) {
      return this.raw(value);
    };

    XMLNode.prototype.i = function(target, value) {
      return this.instruction(target, value);
    };

    XMLNode.prototype.u = function() {
      return this.up();
    };

    XMLNode.prototype.importXMLBuilder = function(doc) {
      return this.importDocument(doc);
    };

    return XMLNode;

  })();

}).call(this);

},{"./Utility":103,"./XMLCData":105,"./XMLComment":106,"./XMLDeclaration":111,"./XMLDocType":112,"./XMLElement":115,"./XMLProcessingInstruction":117,"./XMLRaw":118,"./XMLText":122}],117:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLNode, XMLProcessingInstruction,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  XMLNode = require('./XMLNode');

  module.exports = XMLProcessingInstruction = (function(superClass) {
    extend(XMLProcessingInstruction, superClass);

    function XMLProcessingInstruction(parent, target, value) {
      XMLProcessingInstruction.__super__.constructor.call(this, parent);
      if (target == null) {
        throw new Error("Missing instruction target. " + this.debugInfo());
      }
      this.target = this.stringify.insTarget(target);
      if (value) {
        this.value = this.stringify.insValue(value);
      }
    }

    XMLProcessingInstruction.prototype.clone = function() {
      return Object.create(this);
    };

    XMLProcessingInstruction.prototype.toString = function(options) {
      return this.options.writer.set(options).processingInstruction(this);
    };

    return XMLProcessingInstruction;

  })(XMLNode);

}).call(this);

},{"./XMLNode":116}],118:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLNode, XMLRaw,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  XMLNode = require('./XMLNode');

  module.exports = XMLRaw = (function(superClass) {
    extend(XMLRaw, superClass);

    function XMLRaw(parent, text) {
      XMLRaw.__super__.constructor.call(this, parent);
      if (text == null) {
        throw new Error("Missing raw text. " + this.debugInfo());
      }
      this.value = this.stringify.raw(text);
    }

    XMLRaw.prototype.clone = function() {
      return Object.create(this);
    };

    XMLRaw.prototype.toString = function(options) {
      return this.options.writer.set(options).raw(this);
    };

    return XMLRaw;

  })(XMLNode);

}).call(this);

},{"./XMLNode":116}],119:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLCData, XMLComment, XMLDTDAttList, XMLDTDElement, XMLDTDEntity, XMLDTDNotation, XMLDeclaration, XMLDocType, XMLElement, XMLProcessingInstruction, XMLRaw, XMLStreamWriter, XMLText, XMLWriterBase,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  XMLDeclaration = require('./XMLDeclaration');

  XMLDocType = require('./XMLDocType');

  XMLCData = require('./XMLCData');

  XMLComment = require('./XMLComment');

  XMLElement = require('./XMLElement');

  XMLRaw = require('./XMLRaw');

  XMLText = require('./XMLText');

  XMLProcessingInstruction = require('./XMLProcessingInstruction');

  XMLDTDAttList = require('./XMLDTDAttList');

  XMLDTDElement = require('./XMLDTDElement');

  XMLDTDEntity = require('./XMLDTDEntity');

  XMLDTDNotation = require('./XMLDTDNotation');

  XMLWriterBase = require('./XMLWriterBase');

  module.exports = XMLStreamWriter = (function(superClass) {
    extend(XMLStreamWriter, superClass);

    function XMLStreamWriter(stream, options) {
      XMLStreamWriter.__super__.constructor.call(this, options);
      this.stream = stream;
    }

    XMLStreamWriter.prototype.document = function(doc) {
      var child, i, j, len, len1, ref, ref1, results;
      ref = doc.children;
      for (i = 0, len = ref.length; i < len; i++) {
        child = ref[i];
        child.isLastRootNode = false;
      }
      doc.children[doc.children.length - 1].isLastRootNode = true;
      ref1 = doc.children;
      results = [];
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        child = ref1[j];
        switch (false) {
          case !(child instanceof XMLDeclaration):
            results.push(this.declaration(child));
            break;
          case !(child instanceof XMLDocType):
            results.push(this.docType(child));
            break;
          case !(child instanceof XMLComment):
            results.push(this.comment(child));
            break;
          case !(child instanceof XMLProcessingInstruction):
            results.push(this.processingInstruction(child));
            break;
          default:
            results.push(this.element(child));
        }
      }
      return results;
    };

    XMLStreamWriter.prototype.attribute = function(att) {
      return this.stream.write(' ' + att.name + '="' + att.value + '"');
    };

    XMLStreamWriter.prototype.cdata = function(node, level) {
      return this.stream.write(this.space(level) + '<![CDATA[' + node.text + ']]>' + this.endline(node));
    };

    XMLStreamWriter.prototype.comment = function(node, level) {
      return this.stream.write(this.space(level) + '<!-- ' + node.text + ' -->' + this.endline(node));
    };

    XMLStreamWriter.prototype.declaration = function(node, level) {
      this.stream.write(this.space(level));
      this.stream.write('<?xml version="' + node.version + '"');
      if (node.encoding != null) {
        this.stream.write(' encoding="' + node.encoding + '"');
      }
      if (node.standalone != null) {
        this.stream.write(' standalone="' + node.standalone + '"');
      }
      this.stream.write(this.spacebeforeslash + '?>');
      return this.stream.write(this.endline(node));
    };

    XMLStreamWriter.prototype.docType = function(node, level) {
      var child, i, len, ref;
      level || (level = 0);
      this.stream.write(this.space(level));
      this.stream.write('<!DOCTYPE ' + node.root().name);
      if (node.pubID && node.sysID) {
        this.stream.write(' PUBLIC "' + node.pubID + '" "' + node.sysID + '"');
      } else if (node.sysID) {
        this.stream.write(' SYSTEM "' + node.sysID + '"');
      }
      if (node.children.length > 0) {
        this.stream.write(' [');
        this.stream.write(this.endline(node));
        ref = node.children;
        for (i = 0, len = ref.length; i < len; i++) {
          child = ref[i];
          switch (false) {
            case !(child instanceof XMLDTDAttList):
              this.dtdAttList(child, level + 1);
              break;
            case !(child instanceof XMLDTDElement):
              this.dtdElement(child, level + 1);
              break;
            case !(child instanceof XMLDTDEntity):
              this.dtdEntity(child, level + 1);
              break;
            case !(child instanceof XMLDTDNotation):
              this.dtdNotation(child, level + 1);
              break;
            case !(child instanceof XMLCData):
              this.cdata(child, level + 1);
              break;
            case !(child instanceof XMLComment):
              this.comment(child, level + 1);
              break;
            case !(child instanceof XMLProcessingInstruction):
              this.processingInstruction(child, level + 1);
              break;
            default:
              throw new Error("Unknown DTD node type: " + child.constructor.name);
          }
        }
        this.stream.write(']');
      }
      this.stream.write(this.spacebeforeslash + '>');
      return this.stream.write(this.endline(node));
    };

    XMLStreamWriter.prototype.element = function(node, level) {
      var att, child, i, len, name, ref, ref1, space;
      level || (level = 0);
      space = this.space(level);
      this.stream.write(space + '<' + node.name);
      ref = node.attributes;
      for (name in ref) {
        if (!hasProp.call(ref, name)) continue;
        att = ref[name];
        this.attribute(att);
      }
      if (node.children.length === 0 || node.children.every(function(e) {
        return e.value === '';
      })) {
        if (this.allowEmpty) {
          this.stream.write('></' + node.name + '>');
        } else {
          this.stream.write(this.spacebeforeslash + '/>');
        }
      } else if (this.pretty && node.children.length === 1 && (node.children[0].value != null)) {
        this.stream.write('>');
        this.stream.write(node.children[0].value);
        this.stream.write('</' + node.name + '>');
      } else {
        this.stream.write('>' + this.newline);
        ref1 = node.children;
        for (i = 0, len = ref1.length; i < len; i++) {
          child = ref1[i];
          switch (false) {
            case !(child instanceof XMLCData):
              this.cdata(child, level + 1);
              break;
            case !(child instanceof XMLComment):
              this.comment(child, level + 1);
              break;
            case !(child instanceof XMLElement):
              this.element(child, level + 1);
              break;
            case !(child instanceof XMLRaw):
              this.raw(child, level + 1);
              break;
            case !(child instanceof XMLText):
              this.text(child, level + 1);
              break;
            case !(child instanceof XMLProcessingInstruction):
              this.processingInstruction(child, level + 1);
              break;
            default:
              throw new Error("Unknown XML node type: " + child.constructor.name);
          }
        }
        this.stream.write(space + '</' + node.name + '>');
      }
      return this.stream.write(this.endline(node));
    };

    XMLStreamWriter.prototype.processingInstruction = function(node, level) {
      this.stream.write(this.space(level) + '<?' + node.target);
      if (node.value) {
        this.stream.write(' ' + node.value);
      }
      return this.stream.write(this.spacebeforeslash + '?>' + this.endline(node));
    };

    XMLStreamWriter.prototype.raw = function(node, level) {
      return this.stream.write(this.space(level) + node.value + this.endline(node));
    };

    XMLStreamWriter.prototype.text = function(node, level) {
      return this.stream.write(this.space(level) + node.value + this.endline(node));
    };

    XMLStreamWriter.prototype.dtdAttList = function(node, level) {
      this.stream.write(this.space(level) + '<!ATTLIST ' + node.elementName + ' ' + node.attributeName + ' ' + node.attributeType);
      if (node.defaultValueType !== '#DEFAULT') {
        this.stream.write(' ' + node.defaultValueType);
      }
      if (node.defaultValue) {
        this.stream.write(' "' + node.defaultValue + '"');
      }
      return this.stream.write(this.spacebeforeslash + '>' + this.endline(node));
    };

    XMLStreamWriter.prototype.dtdElement = function(node, level) {
      this.stream.write(this.space(level) + '<!ELEMENT ' + node.name + ' ' + node.value);
      return this.stream.write(this.spacebeforeslash + '>' + this.endline(node));
    };

    XMLStreamWriter.prototype.dtdEntity = function(node, level) {
      this.stream.write(this.space(level) + '<!ENTITY');
      if (node.pe) {
        this.stream.write(' %');
      }
      this.stream.write(' ' + node.name);
      if (node.value) {
        this.stream.write(' "' + node.value + '"');
      } else {
        if (node.pubID && node.sysID) {
          this.stream.write(' PUBLIC "' + node.pubID + '" "' + node.sysID + '"');
        } else if (node.sysID) {
          this.stream.write(' SYSTEM "' + node.sysID + '"');
        }
        if (node.nData) {
          this.stream.write(' NDATA ' + node.nData);
        }
      }
      return this.stream.write(this.spacebeforeslash + '>' + this.endline(node));
    };

    XMLStreamWriter.prototype.dtdNotation = function(node, level) {
      this.stream.write(this.space(level) + '<!NOTATION ' + node.name);
      if (node.pubID && node.sysID) {
        this.stream.write(' PUBLIC "' + node.pubID + '" "' + node.sysID + '"');
      } else if (node.pubID) {
        this.stream.write(' PUBLIC "' + node.pubID + '"');
      } else if (node.sysID) {
        this.stream.write(' SYSTEM "' + node.sysID + '"');
      }
      return this.stream.write(this.spacebeforeslash + '>' + this.endline(node));
    };

    XMLStreamWriter.prototype.endline = function(node) {
      if (!node.isLastRootNode) {
        return this.newline;
      } else {
        return '';
      }
    };

    return XMLStreamWriter;

  })(XMLWriterBase);

}).call(this);

},{"./XMLCData":105,"./XMLComment":106,"./XMLDTDAttList":107,"./XMLDTDElement":108,"./XMLDTDEntity":109,"./XMLDTDNotation":110,"./XMLDeclaration":111,"./XMLDocType":112,"./XMLElement":115,"./XMLProcessingInstruction":117,"./XMLRaw":118,"./XMLText":122,"./XMLWriterBase":123}],120:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLCData, XMLComment, XMLDTDAttList, XMLDTDElement, XMLDTDEntity, XMLDTDNotation, XMLDeclaration, XMLDocType, XMLElement, XMLProcessingInstruction, XMLRaw, XMLStringWriter, XMLText, XMLWriterBase,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  XMLDeclaration = require('./XMLDeclaration');

  XMLDocType = require('./XMLDocType');

  XMLCData = require('./XMLCData');

  XMLComment = require('./XMLComment');

  XMLElement = require('./XMLElement');

  XMLRaw = require('./XMLRaw');

  XMLText = require('./XMLText');

  XMLProcessingInstruction = require('./XMLProcessingInstruction');

  XMLDTDAttList = require('./XMLDTDAttList');

  XMLDTDElement = require('./XMLDTDElement');

  XMLDTDEntity = require('./XMLDTDEntity');

  XMLDTDNotation = require('./XMLDTDNotation');

  XMLWriterBase = require('./XMLWriterBase');

  module.exports = XMLStringWriter = (function(superClass) {
    extend(XMLStringWriter, superClass);

    function XMLStringWriter(options) {
      XMLStringWriter.__super__.constructor.call(this, options);
    }

    XMLStringWriter.prototype.document = function(doc) {
      var child, i, len, r, ref;
      this.textispresent = false;
      r = '';
      ref = doc.children;
      for (i = 0, len = ref.length; i < len; i++) {
        child = ref[i];
        r += (function() {
          switch (false) {
            case !(child instanceof XMLDeclaration):
              return this.declaration(child);
            case !(child instanceof XMLDocType):
              return this.docType(child);
            case !(child instanceof XMLComment):
              return this.comment(child);
            case !(child instanceof XMLProcessingInstruction):
              return this.processingInstruction(child);
            default:
              return this.element(child, 0);
          }
        }).call(this);
      }
      if (this.pretty && r.slice(-this.newline.length) === this.newline) {
        r = r.slice(0, -this.newline.length);
      }
      return r;
    };

    XMLStringWriter.prototype.attribute = function(att) {
      return ' ' + att.name + '="' + att.value + '"';
    };

    XMLStringWriter.prototype.cdata = function(node, level) {
      return this.space(level) + '<![CDATA[' + node.text + ']]>' + this.newline;
    };

    XMLStringWriter.prototype.comment = function(node, level) {
      return this.space(level) + '<!-- ' + node.text + ' -->' + this.newline;
    };

    XMLStringWriter.prototype.declaration = function(node, level) {
      var r;
      r = this.space(level);
      r += '<?xml version="' + node.version + '"';
      if (node.encoding != null) {
        r += ' encoding="' + node.encoding + '"';
      }
      if (node.standalone != null) {
        r += ' standalone="' + node.standalone + '"';
      }
      r += this.spacebeforeslash + '?>';
      r += this.newline;
      return r;
    };

    XMLStringWriter.prototype.docType = function(node, level) {
      var child, i, len, r, ref;
      level || (level = 0);
      r = this.space(level);
      r += '<!DOCTYPE ' + node.root().name;
      if (node.pubID && node.sysID) {
        r += ' PUBLIC "' + node.pubID + '" "' + node.sysID + '"';
      } else if (node.sysID) {
        r += ' SYSTEM "' + node.sysID + '"';
      }
      if (node.children.length > 0) {
        r += ' [';
        r += this.newline;
        ref = node.children;
        for (i = 0, len = ref.length; i < len; i++) {
          child = ref[i];
          r += (function() {
            switch (false) {
              case !(child instanceof XMLDTDAttList):
                return this.dtdAttList(child, level + 1);
              case !(child instanceof XMLDTDElement):
                return this.dtdElement(child, level + 1);
              case !(child instanceof XMLDTDEntity):
                return this.dtdEntity(child, level + 1);
              case !(child instanceof XMLDTDNotation):
                return this.dtdNotation(child, level + 1);
              case !(child instanceof XMLCData):
                return this.cdata(child, level + 1);
              case !(child instanceof XMLComment):
                return this.comment(child, level + 1);
              case !(child instanceof XMLProcessingInstruction):
                return this.processingInstruction(child, level + 1);
              default:
                throw new Error("Unknown DTD node type: " + child.constructor.name);
            }
          }).call(this);
        }
        r += ']';
      }
      r += this.spacebeforeslash + '>';
      r += this.newline;
      return r;
    };

    XMLStringWriter.prototype.element = function(node, level) {
      var att, child, i, j, len, len1, name, r, ref, ref1, ref2, space, textispresentwasset;
      level || (level = 0);
      textispresentwasset = false;
      if (this.textispresent) {
        this.newline = '';
        this.pretty = false;
      } else {
        this.newline = this.newlinedefault;
        this.pretty = this.prettydefault;
      }
      space = this.space(level);
      r = '';
      r += space + '<' + node.name;
      ref = node.attributes;
      for (name in ref) {
        if (!hasProp.call(ref, name)) continue;
        att = ref[name];
        r += this.attribute(att);
      }
      if (node.children.length === 0 || node.children.every(function(e) {
        return e.value === '';
      })) {
        if (this.allowEmpty) {
          r += '></' + node.name + '>' + this.newline;
        } else {
          r += this.spacebeforeslash + '/>' + this.newline;
        }
      } else if (this.pretty && node.children.length === 1 && (node.children[0].value != null)) {
        r += '>';
        r += node.children[0].value;
        r += '</' + node.name + '>' + this.newline;
      } else {
        if (this.dontprettytextnodes) {
          ref1 = node.children;
          for (i = 0, len = ref1.length; i < len; i++) {
            child = ref1[i];
            if (child.value != null) {
              this.textispresent++;
              textispresentwasset = true;
              break;
            }
          }
        }
        if (this.textispresent) {
          this.newline = '';
          this.pretty = false;
          space = this.space(level);
        }
        r += '>' + this.newline;
        ref2 = node.children;
        for (j = 0, len1 = ref2.length; j < len1; j++) {
          child = ref2[j];
          r += (function() {
            switch (false) {
              case !(child instanceof XMLCData):
                return this.cdata(child, level + 1);
              case !(child instanceof XMLComment):
                return this.comment(child, level + 1);
              case !(child instanceof XMLElement):
                return this.element(child, level + 1);
              case !(child instanceof XMLRaw):
                return this.raw(child, level + 1);
              case !(child instanceof XMLText):
                return this.text(child, level + 1);
              case !(child instanceof XMLProcessingInstruction):
                return this.processingInstruction(child, level + 1);
              default:
                throw new Error("Unknown XML node type: " + child.constructor.name);
            }
          }).call(this);
        }
        if (textispresentwasset) {
          this.textispresent--;
        }
        if (!this.textispresent) {
          this.newline = this.newlinedefault;
          this.pretty = this.prettydefault;
        }
        r += space + '</' + node.name + '>' + this.newline;
      }
      return r;
    };

    XMLStringWriter.prototype.processingInstruction = function(node, level) {
      var r;
      r = this.space(level) + '<?' + node.target;
      if (node.value) {
        r += ' ' + node.value;
      }
      r += this.spacebeforeslash + '?>' + this.newline;
      return r;
    };

    XMLStringWriter.prototype.raw = function(node, level) {
      return this.space(level) + node.value + this.newline;
    };

    XMLStringWriter.prototype.text = function(node, level) {
      return this.space(level) + node.value + this.newline;
    };

    XMLStringWriter.prototype.dtdAttList = function(node, level) {
      var r;
      r = this.space(level) + '<!ATTLIST ' + node.elementName + ' ' + node.attributeName + ' ' + node.attributeType;
      if (node.defaultValueType !== '#DEFAULT') {
        r += ' ' + node.defaultValueType;
      }
      if (node.defaultValue) {
        r += ' "' + node.defaultValue + '"';
      }
      r += this.spacebeforeslash + '>' + this.newline;
      return r;
    };

    XMLStringWriter.prototype.dtdElement = function(node, level) {
      return this.space(level) + '<!ELEMENT ' + node.name + ' ' + node.value + this.spacebeforeslash + '>' + this.newline;
    };

    XMLStringWriter.prototype.dtdEntity = function(node, level) {
      var r;
      r = this.space(level) + '<!ENTITY';
      if (node.pe) {
        r += ' %';
      }
      r += ' ' + node.name;
      if (node.value) {
        r += ' "' + node.value + '"';
      } else {
        if (node.pubID && node.sysID) {
          r += ' PUBLIC "' + node.pubID + '" "' + node.sysID + '"';
        } else if (node.sysID) {
          r += ' SYSTEM "' + node.sysID + '"';
        }
        if (node.nData) {
          r += ' NDATA ' + node.nData;
        }
      }
      r += this.spacebeforeslash + '>' + this.newline;
      return r;
    };

    XMLStringWriter.prototype.dtdNotation = function(node, level) {
      var r;
      r = this.space(level) + '<!NOTATION ' + node.name;
      if (node.pubID && node.sysID) {
        r += ' PUBLIC "' + node.pubID + '" "' + node.sysID + '"';
      } else if (node.pubID) {
        r += ' PUBLIC "' + node.pubID + '"';
      } else if (node.sysID) {
        r += ' SYSTEM "' + node.sysID + '"';
      }
      r += this.spacebeforeslash + '>' + this.newline;
      return r;
    };

    XMLStringWriter.prototype.openNode = function(node, level) {
      var att, name, r, ref;
      level || (level = 0);
      if (node instanceof XMLElement) {
        r = this.space(level) + '<' + node.name;
        ref = node.attributes;
        for (name in ref) {
          if (!hasProp.call(ref, name)) continue;
          att = ref[name];
          r += this.attribute(att);
        }
        r += (node.children ? '>' : '/>') + this.newline;
        return r;
      } else {
        r = this.space(level) + '<!DOCTYPE ' + node.rootNodeName;
        if (node.pubID && node.sysID) {
          r += ' PUBLIC "' + node.pubID + '" "' + node.sysID + '"';
        } else if (node.sysID) {
          r += ' SYSTEM "' + node.sysID + '"';
        }
        r += (node.children ? ' [' : '>') + this.newline;
        return r;
      }
    };

    XMLStringWriter.prototype.closeNode = function(node, level) {
      level || (level = 0);
      switch (false) {
        case !(node instanceof XMLElement):
          return this.space(level) + '</' + node.name + '>' + this.newline;
        case !(node instanceof XMLDocType):
          return this.space(level) + ']>' + this.newline;
      }
    };

    return XMLStringWriter;

  })(XMLWriterBase);

}).call(this);

},{"./XMLCData":105,"./XMLComment":106,"./XMLDTDAttList":107,"./XMLDTDElement":108,"./XMLDTDEntity":109,"./XMLDTDNotation":110,"./XMLDeclaration":111,"./XMLDocType":112,"./XMLElement":115,"./XMLProcessingInstruction":117,"./XMLRaw":118,"./XMLText":122,"./XMLWriterBase":123}],121:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLStringifier,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    hasProp = {}.hasOwnProperty;

  module.exports = XMLStringifier = (function() {
    function XMLStringifier(options) {
      this.assertLegalChar = bind(this.assertLegalChar, this);
      var key, ref, value;
      options || (options = {});
      this.noDoubleEncoding = options.noDoubleEncoding;
      ref = options.stringify || {};
      for (key in ref) {
        if (!hasProp.call(ref, key)) continue;
        value = ref[key];
        this[key] = value;
      }
    }

    XMLStringifier.prototype.eleName = function(val) {
      val = '' + val || '';
      return this.assertLegalChar(val);
    };

    XMLStringifier.prototype.eleText = function(val) {
      val = '' + val || '';
      return this.assertLegalChar(this.elEscape(val));
    };

    XMLStringifier.prototype.cdata = function(val) {
      val = '' + val || '';
      val = val.replace(']]>', ']]]]><![CDATA[>');
      return this.assertLegalChar(val);
    };

    XMLStringifier.prototype.comment = function(val) {
      val = '' + val || '';
      if (val.match(/--/)) {
        throw new Error("Comment text cannot contain double-hypen: " + val);
      }
      return this.assertLegalChar(val);
    };

    XMLStringifier.prototype.raw = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.attName = function(val) {
      return val = '' + val || '';
    };

    XMLStringifier.prototype.attValue = function(val) {
      val = '' + val || '';
      return this.attEscape(val);
    };

    XMLStringifier.prototype.insTarget = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.insValue = function(val) {
      val = '' + val || '';
      if (val.match(/\?>/)) {
        throw new Error("Invalid processing instruction value: " + val);
      }
      return val;
    };

    XMLStringifier.prototype.xmlVersion = function(val) {
      val = '' + val || '';
      if (!val.match(/1\.[0-9]+/)) {
        throw new Error("Invalid version number: " + val);
      }
      return val;
    };

    XMLStringifier.prototype.xmlEncoding = function(val) {
      val = '' + val || '';
      if (!val.match(/^[A-Za-z](?:[A-Za-z0-9._-])*$/)) {
        throw new Error("Invalid encoding: " + val);
      }
      return val;
    };

    XMLStringifier.prototype.xmlStandalone = function(val) {
      if (val) {
        return "yes";
      } else {
        return "no";
      }
    };

    XMLStringifier.prototype.dtdPubID = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.dtdSysID = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.dtdElementValue = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.dtdAttType = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.dtdAttDefault = function(val) {
      if (val != null) {
        return '' + val || '';
      } else {
        return val;
      }
    };

    XMLStringifier.prototype.dtdEntityValue = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.dtdNData = function(val) {
      return '' + val || '';
    };

    XMLStringifier.prototype.convertAttKey = '@';

    XMLStringifier.prototype.convertPIKey = '?';

    XMLStringifier.prototype.convertTextKey = '#text';

    XMLStringifier.prototype.convertCDataKey = '#cdata';

    XMLStringifier.prototype.convertCommentKey = '#comment';

    XMLStringifier.prototype.convertRawKey = '#raw';

    XMLStringifier.prototype.assertLegalChar = function(str) {
      var res;
      res = str.match(/[\0\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/);
      if (res) {
        throw new Error("Invalid character in string: " + str + " at index " + res.index);
      }
      return str;
    };

    XMLStringifier.prototype.elEscape = function(str) {
      var ampregex;
      ampregex = this.noDoubleEncoding ? /(?!&\S+;)&/g : /&/g;
      return str.replace(ampregex, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#xD;');
    };

    XMLStringifier.prototype.attEscape = function(str) {
      var ampregex;
      ampregex = this.noDoubleEncoding ? /(?!&\S+;)&/g : /&/g;
      return str.replace(ampregex, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/\t/g, '&#x9;').replace(/\n/g, '&#xA;').replace(/\r/g, '&#xD;');
    };

    return XMLStringifier;

  })();

}).call(this);

},{}],122:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLNode, XMLText,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  XMLNode = require('./XMLNode');

  module.exports = XMLText = (function(superClass) {
    extend(XMLText, superClass);

    function XMLText(parent, text) {
      XMLText.__super__.constructor.call(this, parent);
      if (text == null) {
        throw new Error("Missing element text. " + this.debugInfo());
      }
      this.value = this.stringify.eleText(text);
    }

    XMLText.prototype.clone = function() {
      return Object.create(this);
    };

    XMLText.prototype.toString = function(options) {
      return this.options.writer.set(options).text(this);
    };

    return XMLText;

  })(XMLNode);

}).call(this);

},{"./XMLNode":116}],123:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLWriterBase,
    hasProp = {}.hasOwnProperty;

  module.exports = XMLWriterBase = (function() {
    function XMLWriterBase(options) {
      var key, ref, ref1, ref2, ref3, ref4, ref5, ref6, value;
      options || (options = {});
      this.pretty = options.pretty || false;
      this.allowEmpty = (ref = options.allowEmpty) != null ? ref : false;
      if (this.pretty) {
        this.indent = (ref1 = options.indent) != null ? ref1 : '  ';
        this.newline = (ref2 = options.newline) != null ? ref2 : '\n';
        this.offset = (ref3 = options.offset) != null ? ref3 : 0;
        this.dontprettytextnodes = (ref4 = options.dontprettytextnodes) != null ? ref4 : 0;
      } else {
        this.indent = '';
        this.newline = '';
        this.offset = 0;
        this.dontprettytextnodes = 0;
      }
      this.spacebeforeslash = (ref5 = options.spacebeforeslash) != null ? ref5 : '';
      if (this.spacebeforeslash === true) {
        this.spacebeforeslash = ' ';
      }
      this.newlinedefault = this.newline;
      this.prettydefault = this.pretty;
      ref6 = options.writer || {};
      for (key in ref6) {
        if (!hasProp.call(ref6, key)) continue;
        value = ref6[key];
        this[key] = value;
      }
    }

    XMLWriterBase.prototype.set = function(options) {
      var key, ref, value;
      options || (options = {});
      if ("pretty" in options) {
        this.pretty = options.pretty;
      }
      if ("allowEmpty" in options) {
        this.allowEmpty = options.allowEmpty;
      }
      if (this.pretty) {
        this.indent = "indent" in options ? options.indent : '  ';
        this.newline = "newline" in options ? options.newline : '\n';
        this.offset = "offset" in options ? options.offset : 0;
        this.dontprettytextnodes = "dontprettytextnodes" in options ? options.dontprettytextnodes : 0;
      } else {
        this.indent = '';
        this.newline = '';
        this.offset = 0;
        this.dontprettytextnodes = 0;
      }
      this.spacebeforeslash = "spacebeforeslash" in options ? options.spacebeforeslash : '';
      if (this.spacebeforeslash === true) {
        this.spacebeforeslash = ' ';
      }
      this.newlinedefault = this.newline;
      this.prettydefault = this.pretty;
      ref = options.writer || {};
      for (key in ref) {
        if (!hasProp.call(ref, key)) continue;
        value = ref[key];
        this[key] = value;
      }
      return this;
    };

    XMLWriterBase.prototype.space = function(level) {
      var indent;
      if (this.pretty) {
        indent = (level || 0) + this.offset + 1;
        if (indent > 0) {
          return new Array(indent).join(this.indent);
        } else {
          return '';
        }
      } else {
        return '';
      }
    };

    return XMLWriterBase;

  })();

}).call(this);

},{}],124:[function(require,module,exports){
// Generated by CoffeeScript 1.12.7
(function() {
  var XMLDocument, XMLDocumentCB, XMLStreamWriter, XMLStringWriter, assign, isFunction, ref;

  ref = require('./Utility'), assign = ref.assign, isFunction = ref.isFunction;

  XMLDocument = require('./XMLDocument');

  XMLDocumentCB = require('./XMLDocumentCB');

  XMLStringWriter = require('./XMLStringWriter');

  XMLStreamWriter = require('./XMLStreamWriter');

  module.exports.create = function(name, xmldec, doctype, options) {
    var doc, root;
    if (name == null) {
      throw new Error("Root element needs a name.");
    }
    options = assign({}, xmldec, doctype, options);
    doc = new XMLDocument(options);
    root = doc.element(name);
    if (!options.headless) {
      doc.declaration(options);
      if ((options.pubID != null) || (options.sysID != null)) {
        doc.doctype(options);
      }
    }
    return root;
  };

  module.exports.begin = function(options, onData, onEnd) {
    var ref1;
    if (isFunction(options)) {
      ref1 = [options, onData], onData = ref1[0], onEnd = ref1[1];
      options = {};
    }
    if (onData) {
      return new XMLDocumentCB(options, onData, onEnd);
    } else {
      return new XMLDocument(options);
    }
  };

  module.exports.stringWriter = function(options) {
    return new XMLStringWriter(options);
  };

  module.exports.streamWriter = function(stream, options) {
    return new XMLStreamWriter(stream, options);
  };

}).call(this);

},{"./Utility":103,"./XMLDocument":113,"./XMLDocumentCB":114,"./XMLStreamWriter":119,"./XMLStringWriter":120}]},{},[21])(21)
});