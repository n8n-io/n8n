export class S3ExpressIdentityCacheEntry {
    _identity;
    isRefreshing;
    accessed;
    constructor(_identity, isRefreshing = false, accessed = Date.now()) {
        this._identity = _identity;
        this.isRefreshing = isRefreshing;
        this.accessed = accessed;
    }
    get identity() {
        this.accessed = Date.now();
        return this._identity;
    }
}
