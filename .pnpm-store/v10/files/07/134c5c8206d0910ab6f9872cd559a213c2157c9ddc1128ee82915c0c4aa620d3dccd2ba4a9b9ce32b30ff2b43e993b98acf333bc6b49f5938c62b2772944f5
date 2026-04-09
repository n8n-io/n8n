export class UnionSerde {
    from;
    to;
    keys;
    constructor(from, to) {
        this.from = from;
        this.to = to;
        this.keys = new Set(Object.keys(this.from).filter((k) => k !== "__type"));
    }
    mark(key) {
        this.keys.delete(key);
    }
    hasUnknown() {
        return this.keys.size === 1 && Object.keys(this.to).length === 0;
    }
    writeUnknown() {
        if (this.hasUnknown()) {
            const k = this.keys.values().next().value;
            const v = this.from[k];
            this.to.$unknown = [k, v];
        }
    }
}
