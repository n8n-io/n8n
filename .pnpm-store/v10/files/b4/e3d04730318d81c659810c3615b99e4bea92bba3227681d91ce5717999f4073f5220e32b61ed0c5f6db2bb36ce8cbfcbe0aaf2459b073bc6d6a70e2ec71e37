export default class GraphQLSort {
    constructor(args) {
        this.args = args;
    }
    toString() {
        const parts = [];
        for (const arg of this.args) {
            let part = `{path:${JSON.stringify(arg.path)}`;
            if (arg.order) {
                part = part.concat(`,order:${arg.order}}`);
            }
            else {
                part = part.concat('}');
            }
            parts.push(part);
        }
        return parts.join(',');
    }
}
