export default class GraphQLNearVector {
    constructor(args) {
        this.certainty = args.certainty;
        this.distance = args.distance;
        this.vector = args.vector;
        this.targetVectors = args.targetVectors;
    }
    toString(wrap = true) {
        let args = [`vector:${JSON.stringify(this.vector)}`]; // vector must always be set
        if (this.certainty) {
            args = [...args, `certainty:${this.certainty}`];
        }
        if (this.distance) {
            args = [...args, `distance:${this.distance}`];
        }
        if (this.targetVectors && this.targetVectors.length > 0) {
            args = [...args, `targetVectors:${JSON.stringify(this.targetVectors)}`];
        }
        if (!wrap) {
            return `${args.join(',')}`;
        }
        return `{${args.join(',')}}`;
    }
}
