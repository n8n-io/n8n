export class Schema {
    name;
    namespace;
    traits;
    static assign(instance, values) {
        const schema = Object.assign(instance, values);
        return schema;
    }
    static [Symbol.hasInstance](lhs) {
        const isPrototype = this.prototype.isPrototypeOf(lhs);
        if (!isPrototype && typeof lhs === "object" && lhs !== null) {
            const list = lhs;
            return list.symbol === this.symbol;
        }
        return isPrototype;
    }
    getName() {
        return this.namespace + "#" + this.name;
    }
}
