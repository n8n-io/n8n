export default class GraphQLBm25 {
    constructor(args) {
        this.properties = args.properties;
        this.query = args.query;
    }
    toString() {
        let args = [`query:${JSON.stringify(this.query)}`]; // query must always be set
        if (this.properties !== undefined) {
            args = [...args, `properties:${JSON.stringify(this.properties)}`];
        }
        return `{${args.join(',')}}`;
    }
}
