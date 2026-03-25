"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class GraphQLGroupBy {
    constructor(args) {
        this.args = args;
    }
    toString() {
        let parts = [];
        if (this.args.path) {
            parts = [...parts, `path:${JSON.stringify(this.args.path)}`];
        }
        if (this.args.groups) {
            parts = [...parts, `groups:${this.args.groups}`];
        }
        if (this.args.objectsPerGroup) {
            parts = [...parts, `objectsPerGroup:${this.args.objectsPerGroup}`];
        }
        return `{${parts.join(',')}}`;
    }
}
exports.default = GraphQLGroupBy;
