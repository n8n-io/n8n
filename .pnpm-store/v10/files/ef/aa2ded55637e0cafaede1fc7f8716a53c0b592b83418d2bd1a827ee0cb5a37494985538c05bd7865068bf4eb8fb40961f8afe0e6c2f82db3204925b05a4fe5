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
