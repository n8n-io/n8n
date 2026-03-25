"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.ClientKillFilters = void 0;
var ClientKillFilters;
(function (ClientKillFilters) {
    ClientKillFilters["ADDRESS"] = "ADDR";
    ClientKillFilters["LOCAL_ADDRESS"] = "LADDR";
    ClientKillFilters["ID"] = "ID";
    ClientKillFilters["TYPE"] = "TYPE";
    ClientKillFilters["USER"] = "USER";
    ClientKillFilters["SKIP_ME"] = "SKIPME";
})(ClientKillFilters || (exports.ClientKillFilters = ClientKillFilters = {}));
function transformArguments(filters) {
    const args = ['CLIENT', 'KILL'];
    if (Array.isArray(filters)) {
        for (const filter of filters) {
            pushFilter(args, filter);
        }
    }
    else {
        pushFilter(args, filters);
    }
    return args;
}
exports.transformArguments = transformArguments;
function pushFilter(args, filter) {
    if (filter === ClientKillFilters.SKIP_ME) {
        args.push('SKIPME');
        return;
    }
    args.push(filter.filter);
    switch (filter.filter) {
        case ClientKillFilters.ADDRESS:
            args.push(filter.address);
            break;
        case ClientKillFilters.LOCAL_ADDRESS:
            args.push(filter.localAddress);
            break;
        case ClientKillFilters.ID:
            args.push(typeof filter.id === 'number' ?
                filter.id.toString() :
                filter.id);
            break;
        case ClientKillFilters.TYPE:
            args.push(filter.type);
            break;
        case ClientKillFilters.USER:
            args.push(filter.username);
            break;
        case ClientKillFilters.SKIP_ME:
            args.push(filter.skipMe ? 'yes' : 'no');
            break;
    }
}
