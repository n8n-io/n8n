"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMove = exports.parseMoveObjects = void 0;
class GraphQLNearText {
    constructor(args) {
        this.autocorrect = args.autocorrect;
        this.certainty = args.certainty;
        this.concepts = args.concepts;
        this.distance = args.distance;
        this.moveAwayFrom = args.moveAwayFrom;
        this.moveTo = args.moveTo;
        this.targetVectors = args.targetVectors;
    }
    toString() {
        this.validate();
        let args = [`concepts:${JSON.stringify(this.concepts)}`];
        if (this.certainty) {
            args = [...args, `certainty:${this.certainty}`];
        }
        if (this.distance) {
            args = [...args, `distance:${this.distance}`];
        }
        if (this.targetVectors && this.targetVectors.length > 0) {
            args = [...args, `targetVectors:${JSON.stringify(this.targetVectors)}`];
        }
        if (this.moveTo) {
            args = [...args, parseMove('moveTo', this.moveTo)];
        }
        if (this.moveAwayFrom) {
            args = [...args, parseMove('moveAwayFrom', this.moveAwayFrom)];
        }
        if (this.autocorrect !== undefined) {
            args = [...args, `autocorrect:${this.autocorrect}`];
        }
        return `{${args.join(',')}}`;
    }
    validate() {
        if (this.moveTo) {
            if (!this.moveTo.concepts && !this.moveTo.objects) {
                throw new Error('nearText filter: moveTo.concepts or moveTo.objects must be present');
            }
            if (!this.moveTo.force || (!this.moveTo.concepts && !this.moveTo.objects)) {
                throw new Error("nearText filter: moveTo must have fields 'concepts' or 'objects' and 'force'");
            }
        }
        if (this.moveAwayFrom) {
            if (!this.moveAwayFrom.concepts && !this.moveAwayFrom.objects) {
                throw new Error('nearText filter: moveAwayFrom.concepts or moveAwayFrom.objects must be present');
            }
            if (!this.moveAwayFrom.force || (!this.moveAwayFrom.concepts && !this.moveAwayFrom.objects)) {
                throw new Error("nearText filter: moveAwayFrom must have fields 'concepts' or 'objects' and 'force'");
            }
        }
    }
}
exports.default = GraphQLNearText;
function parseMoveObjects(move, objects) {
    const moveObjects = [];
    for (const i in objects) {
        if (!objects[i].id && !objects[i].beacon) {
            throw new Error(`nearText: ${move}.objects[${i}].id or ${move}.objects[${i}].beacon must be present`);
        }
        const objs = [];
        if (objects[i].id) {
            objs.push(`id:"${objects[i].id}"`);
        }
        if (objects[i].beacon) {
            objs.push(`beacon:"${objects[i].beacon}"`);
        }
        moveObjects.push(`{${objs.join(',')}}`);
    }
    return `[${moveObjects.join(',')}]`;
}
exports.parseMoveObjects = parseMoveObjects;
function parseMove(move, args) {
    let moveArgs = [];
    if (args.concepts) {
        moveArgs = [...moveArgs, `concepts:${JSON.stringify(args.concepts)}`];
    }
    if (args.objects) {
        moveArgs = [...moveArgs, `objects:${parseMoveObjects(move, args.objects)}`];
    }
    if (args.force) {
        moveArgs = [...moveArgs, `force:${args.force}`];
    }
    return `${move}:{${moveArgs.join(',')}}`;
}
exports.parseMove = parseMove;
