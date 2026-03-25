import { parseMove } from './nearText.js';
export var FusionType;
(function (FusionType) {
    FusionType["rankedFusion"] = "rankedFusion";
    FusionType["relativeScoreFusion"] = "relativeScoreFusion";
})(FusionType || (FusionType = {}));
class GraphQLHybridSubSearch {
    constructor(args) {
        this.nearText = args.nearText;
        this.nearVector = args.nearVector;
    }
    toString() {
        let outer = [];
        if (this.nearText !== undefined) {
            let inner = [`concepts:${JSON.stringify(this.nearText.concepts)}`];
            if (this.nearText.certainty) {
                inner = [...inner, `certainty:${this.nearText.certainty}`];
            }
            if (this.nearText.distance) {
                inner = [...inner, `distance:${this.nearText.distance}`];
            }
            if (this.nearText.moveTo) {
                inner = [...inner, parseMove('moveTo', this.nearText.moveTo)];
            }
            if (this.nearText.moveAwayFrom) {
                inner = [...inner, parseMove('moveAwayFrom', this.nearText.moveAwayFrom)];
            }
            outer = [...outer, `nearText:{${inner.join(',')}}`];
        }
        if (this.nearVector !== undefined) {
            let inner = [`vector:${JSON.stringify(this.nearVector.vector)}`];
            if (this.nearVector.certainty) {
                inner = [...inner, `certainty:${this.nearVector.certainty}`];
            }
            if (this.nearVector.distance) {
                inner = [...inner, `distance:${this.nearVector.distance}`];
            }
            if (this.nearVector.targetVectors && this.nearVector.targetVectors.length > 0) {
                inner = [...inner, `targetVectors:${JSON.stringify(this.nearVector.targetVectors)}`];
            }
            outer = [...outer, `nearVector:{${inner.join(',')}}`];
        }
        return `{${outer.join(',')}}`;
    }
}
export default class GraphQLHybrid {
    constructor(args) {
        var _a;
        this.alpha = args.alpha;
        this.query = args.query;
        this.vector = args.vector;
        this.properties = args.properties;
        this.targetVectors = args.targetVectors;
        this.fusionType = args.fusionType;
        this.searches = (_a = args.searches) === null || _a === void 0 ? void 0 : _a.map((search) => new GraphQLHybridSubSearch(search));
        this.maxVectorDistance = args.maxVectorDistance;
    }
    toString() {
        let args = [`query:${JSON.stringify(this.query)}`]; // query must always be set
        if (this.alpha !== undefined) {
            args = [...args, `alpha:${JSON.stringify(this.alpha)}`];
        }
        if (this.vector !== undefined) {
            args = [...args, `vector:${JSON.stringify(this.vector)}`];
        }
        if (this.properties && this.properties.length > 0) {
            args = [...args, `properties:${JSON.stringify(this.properties)}`];
        }
        if (this.targetVectors && this.targetVectors.length > 0) {
            args = [...args, `targetVectors:${JSON.stringify(this.targetVectors)}`];
        }
        if (this.fusionType !== undefined) {
            args = [...args, `fusionType:${this.fusionType}`];
        }
        if (this.searches !== undefined) {
            args = [...args, `searches:[${this.searches.map((search) => search.toString()).join(',')}]`];
        }
        if (this.maxVectorDistance !== undefined) {
            args = [...args, `maxVectorDistance:${this.maxVectorDistance}`];
        }
        return `{${args.join(',')}}`;
    }
}
