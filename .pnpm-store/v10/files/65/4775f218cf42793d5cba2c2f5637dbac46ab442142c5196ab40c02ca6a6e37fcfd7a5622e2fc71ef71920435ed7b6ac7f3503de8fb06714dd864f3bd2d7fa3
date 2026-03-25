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
