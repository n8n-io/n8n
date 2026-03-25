"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const alias = (connection) => {
    return {
        create: (args) => connection.postReturn(`/aliases/`, Object.assign(Object.assign({}, args), { class: args.collection })),
        listAll: (opts) => connection
            .get(`/aliases${(opts === null || opts === void 0 ? void 0 : opts.collection) !== undefined ? '/?class=' + opts.collection : ''}`)
            .then((aliases) => aliases.aliases !== undefined
            ? aliases.aliases.map((alias) => ({ alias: alias.alias, collection: alias.class }))
            : []),
        get: (alias) => connection
            .get(`/aliases/${alias}`)
            .then((alias) => ({ alias: alias.alias, collection: alias.class })),
        update: (args) => connection.put(`/aliases/${args.alias}`, { class: args.newTargetCollection }),
        delete: (alias) => connection.delete(`/aliases/${alias}`, null),
    };
};
exports.default = alias;
