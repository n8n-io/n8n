"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class GraphQLGroup {
    constructor(args) {
        this.args = args;
    }
    toString() {
        let parts = [];
        if (this.args.type) {
            // value is a graphQL enum, so doesn't need to be quoted
            parts = [...parts, `type:${this.args.type}`];
        }
        if (this.args.force) {
            parts = [...parts, `force:${this.args.force}`];
        }
        return `{${parts.join(',')}}`;
    }
}
exports.default = GraphQLGroup;
