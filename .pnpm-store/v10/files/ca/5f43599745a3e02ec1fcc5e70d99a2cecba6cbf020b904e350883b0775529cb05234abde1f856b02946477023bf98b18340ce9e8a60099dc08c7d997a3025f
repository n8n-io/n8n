var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
const cluster = (connection) => {
    return {
        nodes: (opts) => {
            const params = new URLSearchParams();
            let path = '/nodes';
            if (opts === null || opts === void 0 ? void 0 : opts.collection) {
                path = path.concat(`/${opts.collection}`);
            }
            params.append('output', (opts === null || opts === void 0 ? void 0 : opts.output) ? opts.output : 'minimal');
            return connection
                .get(`${path}?${params.toString()}`)
                .then((res) => res.nodes);
        },
        queryShardingState: (collection, opts) => {
            const params = new URLSearchParams();
            params.append('collection', collection);
            if (opts === null || opts === void 0 ? void 0 : opts.shard) {
                params.append('shard', opts.shard);
            }
            return connection
                .get(`/replication/sharding-state?${params.toString()}`)
                .then((res) => res);
        },
        replicate: (args) => connection
            .postReturn(`/replication/replicate`, ((_a) => {
            var { replicationType } = _a, rest = __rest(_a, ["replicationType"]);
            return (Object.assign({ type: replicationType }, rest));
        })(args))
            .then((res) => res.id),
        replications: {
            cancel: (id) => connection.postEmpty(`/replication/replicate/${id}/cancel`, {}),
            delete: (id) => connection.delete(`/replication/replicate/${id}`, {}, false),
            deleteAll: () => connection.delete(`/replication/replicate`, {}, false),
            get: (id, opts) => connection
                .get(`/replication/replicate/${id}?includeHistory=${(opts === null || opts === void 0 ? void 0 : opts.includeHistory) ? opts === null || opts === void 0 ? void 0 : opts.includeHistory : 'false'}`)
                .then((res) => (res ? res : null)),
            query: (opts) => {
                const { collection, shard, targetNode, includeHistory } = opts || {};
                const params = new URLSearchParams();
                if (collection) {
                    params.append('collection', collection);
                }
                if (shard) {
                    params.append('shard', shard);
                }
                if (targetNode) {
                    params.append('targetNode', targetNode);
                }
                if (includeHistory) {
                    params.append('includeHistory', includeHistory.toString());
                }
                return connection.get(`/replication/replicate?${params.toString()}`);
            },
        },
    };
};
export default cluster;
