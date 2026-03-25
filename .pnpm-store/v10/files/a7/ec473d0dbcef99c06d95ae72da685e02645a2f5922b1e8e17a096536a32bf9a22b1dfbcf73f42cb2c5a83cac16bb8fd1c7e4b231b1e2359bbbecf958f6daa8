function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
const testSymbol = Symbol("test");
export class Mocker {
    constructor() {
        this.pick = (...args) => {
            return args[getRandomInt(args.length)];
        };
    }
    get string() {
        return Math.random().toString(36).substring(7);
    }
    get number() {
        return Math.random() * 100;
    }
    get bigint() {
        return BigInt(Math.floor(Math.random() * 10000));
    }
    get boolean() {
        return Math.random() < 0.5;
    }
    get date() {
        return new Date(Math.floor(Date.now() * Math.random()));
    }
    get symbol() {
        return testSymbol;
    }
    get null() {
        return null;
    }
    get undefined() {
        return undefined;
    }
    get stringOptional() {
        return this.pick(this.string, this.undefined);
    }
    get stringNullable() {
        return this.pick(this.string, this.null);
    }
    get numberOptional() {
        return this.pick(this.number, this.undefined);
    }
    get numberNullable() {
        return this.pick(this.number, this.null);
    }
    get booleanOptional() {
        return this.pick(this.boolean, this.undefined);
    }
    get booleanNullable() {
        return this.pick(this.boolean, this.null);
    }
}
