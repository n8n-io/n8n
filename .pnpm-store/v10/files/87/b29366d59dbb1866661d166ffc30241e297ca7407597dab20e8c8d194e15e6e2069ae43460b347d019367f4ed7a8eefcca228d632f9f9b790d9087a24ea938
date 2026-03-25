"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformRangeReply = exports.pushSlotRangesArguments = exports.pushSortArguments = exports.transformFunctionListItemReply = exports.RedisFunctionFlags = exports.transformCommandReply = exports.CommandCategories = exports.CommandFlags = exports.pushOptionalVerdictArgument = exports.pushVerdictArgument = exports.pushVerdictNumberArguments = exports.pushVerdictArguments = exports.pushEvalArguments = exports.evalFirstKeyIndex = exports.transformPXAT = exports.transformEXAT = exports.transformGeoMembersWithReply = exports.GeoReplyWith = exports.pushGeoRadiusStoreArguments = exports.pushGeoRadiusArguments = exports.pushGeoSearchArguments = exports.pushGeoCountArgument = exports.transformLMPopArguments = exports.transformZMPopArguments = exports.transformSortedSetWithScoresReply = exports.transformSortedSetMemberReply = exports.transformSortedSetMemberNullReply = exports.transformStreamsMessagesReply = exports.transformStreamMessagesNullReply = exports.transformStreamMessagesReply = exports.transformStreamMessageNullReply = exports.transformStreamMessageReply = exports.transformTuplesReply = exports.transformStringNumberInfinityArgument = exports.transformNumberInfinityArgument = exports.transformNumberInfinityNullArrayReply = exports.transformNumberInfinityNullReply = exports.transformNumberInfinityReply = exports.pushScanArguments = exports.transformBooleanArrayReply = exports.transformBooleanReply = void 0;
function transformBooleanReply(reply) {
    return reply === 1;
}
exports.transformBooleanReply = transformBooleanReply;
function transformBooleanArrayReply(reply) {
    return reply.map(transformBooleanReply);
}
exports.transformBooleanArrayReply = transformBooleanArrayReply;
function pushScanArguments(args, cursor, options) {
    args.push(cursor.toString());
    if (options?.MATCH) {
        args.push('MATCH', options.MATCH);
    }
    if (options?.COUNT) {
        args.push('COUNT', options.COUNT.toString());
    }
    return args;
}
exports.pushScanArguments = pushScanArguments;
function transformNumberInfinityReply(reply) {
    switch (reply.toString()) {
        case '+inf':
            return Infinity;
        case '-inf':
            return -Infinity;
        default:
            return Number(reply);
    }
}
exports.transformNumberInfinityReply = transformNumberInfinityReply;
function transformNumberInfinityNullReply(reply) {
    if (reply === null)
        return null;
    return transformNumberInfinityReply(reply);
}
exports.transformNumberInfinityNullReply = transformNumberInfinityNullReply;
function transformNumberInfinityNullArrayReply(reply) {
    return reply.map(transformNumberInfinityNullReply);
}
exports.transformNumberInfinityNullArrayReply = transformNumberInfinityNullArrayReply;
function transformNumberInfinityArgument(num) {
    switch (num) {
        case Infinity:
            return '+inf';
        case -Infinity:
            return '-inf';
        default:
            return num.toString();
    }
}
exports.transformNumberInfinityArgument = transformNumberInfinityArgument;
function transformStringNumberInfinityArgument(num) {
    if (typeof num !== 'number')
        return num;
    return transformNumberInfinityArgument(num);
}
exports.transformStringNumberInfinityArgument = transformStringNumberInfinityArgument;
function transformTuplesReply(reply) {
    const message = Object.create(null);
    for (let i = 0; i < reply.length; i += 2) {
        message[reply[i].toString()] = reply[i + 1];
    }
    return message;
}
exports.transformTuplesReply = transformTuplesReply;
function transformStreamMessageReply([id, message]) {
    return {
        id,
        message: transformTuplesReply(message)
    };
}
exports.transformStreamMessageReply = transformStreamMessageReply;
function transformStreamMessageNullReply(reply) {
    if (reply === null)
        return null;
    return transformStreamMessageReply(reply);
}
exports.transformStreamMessageNullReply = transformStreamMessageNullReply;
function transformStreamMessagesReply(reply) {
    return reply.map(transformStreamMessageReply);
}
exports.transformStreamMessagesReply = transformStreamMessagesReply;
function transformStreamMessagesNullReply(reply) {
    return reply.map(transformStreamMessageNullReply);
}
exports.transformStreamMessagesNullReply = transformStreamMessagesNullReply;
function transformStreamsMessagesReply(reply) {
    if (reply === null)
        return null;
    return reply.map(([name, rawMessages]) => ({
        name,
        messages: transformStreamMessagesReply(rawMessages)
    }));
}
exports.transformStreamsMessagesReply = transformStreamsMessagesReply;
function transformSortedSetMemberNullReply(reply) {
    if (!reply.length)
        return null;
    return transformSortedSetMemberReply(reply);
}
exports.transformSortedSetMemberNullReply = transformSortedSetMemberNullReply;
function transformSortedSetMemberReply(reply) {
    return {
        value: reply[0],
        score: transformNumberInfinityReply(reply[1])
    };
}
exports.transformSortedSetMemberReply = transformSortedSetMemberReply;
function transformSortedSetWithScoresReply(reply) {
    const members = [];
    for (let i = 0; i < reply.length; i += 2) {
        members.push({
            value: reply[i],
            score: transformNumberInfinityReply(reply[i + 1])
        });
    }
    return members;
}
exports.transformSortedSetWithScoresReply = transformSortedSetWithScoresReply;
function transformZMPopArguments(args, keys, side, options) {
    pushVerdictArgument(args, keys);
    args.push(side);
    if (options?.COUNT) {
        args.push('COUNT', options.COUNT.toString());
    }
    return args;
}
exports.transformZMPopArguments = transformZMPopArguments;
function transformLMPopArguments(args, keys, side, options) {
    pushVerdictArgument(args, keys);
    args.push(side);
    if (options?.COUNT) {
        args.push('COUNT', options.COUNT.toString());
    }
    return args;
}
exports.transformLMPopArguments = transformLMPopArguments;
function pushGeoCountArgument(args, count) {
    if (typeof count === 'number') {
        args.push('COUNT', count.toString());
    }
    else if (count) {
        args.push('COUNT', count.value.toString());
        if (count.ANY) {
            args.push('ANY');
        }
    }
    return args;
}
exports.pushGeoCountArgument = pushGeoCountArgument;
function pushGeoSearchArguments(args, key, from, by, options) {
    args.push(key);
    if (typeof from === 'string') {
        args.push('FROMMEMBER', from);
    }
    else {
        args.push('FROMLONLAT', from.longitude.toString(), from.latitude.toString());
    }
    if ('radius' in by) {
        args.push('BYRADIUS', by.radius.toString());
    }
    else {
        args.push('BYBOX', by.width.toString(), by.height.toString());
    }
    args.push(by.unit);
    if (options?.SORT) {
        args.push(options.SORT);
    }
    pushGeoCountArgument(args, options?.COUNT);
    return args;
}
exports.pushGeoSearchArguments = pushGeoSearchArguments;
function pushGeoRadiusArguments(args, key, from, radius, unit, options) {
    args.push(key);
    if (typeof from === 'string') {
        args.push(from);
    }
    else {
        args.push(from.longitude.toString(), from.latitude.toString());
    }
    args.push(radius.toString(), unit);
    if (options?.SORT) {
        args.push(options.SORT);
    }
    pushGeoCountArgument(args, options?.COUNT);
    return args;
}
exports.pushGeoRadiusArguments = pushGeoRadiusArguments;
function pushGeoRadiusStoreArguments(args, key, from, radius, unit, destination, options) {
    pushGeoRadiusArguments(args, key, from, radius, unit, options);
    if (options?.STOREDIST) {
        args.push('STOREDIST', destination);
    }
    else {
        args.push('STORE', destination);
    }
    return args;
}
exports.pushGeoRadiusStoreArguments = pushGeoRadiusStoreArguments;
var GeoReplyWith;
(function (GeoReplyWith) {
    GeoReplyWith["DISTANCE"] = "WITHDIST";
    GeoReplyWith["HASH"] = "WITHHASH";
    GeoReplyWith["COORDINATES"] = "WITHCOORD";
})(GeoReplyWith || (exports.GeoReplyWith = GeoReplyWith = {}));
function transformGeoMembersWithReply(reply, replyWith) {
    const replyWithSet = new Set(replyWith);
    let index = 0;
    const distanceIndex = replyWithSet.has(GeoReplyWith.DISTANCE) && ++index, hashIndex = replyWithSet.has(GeoReplyWith.HASH) && ++index, coordinatesIndex = replyWithSet.has(GeoReplyWith.COORDINATES) && ++index;
    return reply.map(member => {
        const transformedMember = {
            member: member[0]
        };
        if (distanceIndex) {
            transformedMember.distance = member[distanceIndex];
        }
        if (hashIndex) {
            transformedMember.hash = member[hashIndex];
        }
        if (coordinatesIndex) {
            const [longitude, latitude] = member[coordinatesIndex];
            transformedMember.coordinates = {
                longitude,
                latitude
            };
        }
        return transformedMember;
    });
}
exports.transformGeoMembersWithReply = transformGeoMembersWithReply;
function transformEXAT(EXAT) {
    return (typeof EXAT === 'number' ? EXAT : Math.floor(EXAT.getTime() / 1000)).toString();
}
exports.transformEXAT = transformEXAT;
function transformPXAT(PXAT) {
    return (typeof PXAT === 'number' ? PXAT : PXAT.getTime()).toString();
}
exports.transformPXAT = transformPXAT;
function evalFirstKeyIndex(options) {
    return options?.keys?.[0];
}
exports.evalFirstKeyIndex = evalFirstKeyIndex;
function pushEvalArguments(args, options) {
    if (options?.keys) {
        args.push(options.keys.length.toString(), ...options.keys);
    }
    else {
        args.push('0');
    }
    if (options?.arguments) {
        args.push(...options.arguments);
    }
    return args;
}
exports.pushEvalArguments = pushEvalArguments;
function pushVerdictArguments(args, value) {
    if (Array.isArray(value)) {
        // https://github.com/redis/node-redis/pull/2160
        args = args.concat(value);
    }
    else {
        args.push(value);
    }
    return args;
}
exports.pushVerdictArguments = pushVerdictArguments;
function pushVerdictNumberArguments(args, value) {
    if (Array.isArray(value)) {
        for (const item of value) {
            args.push(item.toString());
        }
    }
    else {
        args.push(value.toString());
    }
    return args;
}
exports.pushVerdictNumberArguments = pushVerdictNumberArguments;
function pushVerdictArgument(args, value) {
    if (Array.isArray(value)) {
        args.push(value.length.toString(), ...value);
    }
    else {
        args.push('1', value);
    }
    return args;
}
exports.pushVerdictArgument = pushVerdictArgument;
function pushOptionalVerdictArgument(args, name, value) {
    if (value === undefined)
        return args;
    args.push(name);
    return pushVerdictArgument(args, value);
}
exports.pushOptionalVerdictArgument = pushOptionalVerdictArgument;
var CommandFlags;
(function (CommandFlags) {
    CommandFlags["WRITE"] = "write";
    CommandFlags["READONLY"] = "readonly";
    CommandFlags["DENYOOM"] = "denyoom";
    CommandFlags["ADMIN"] = "admin";
    CommandFlags["PUBSUB"] = "pubsub";
    CommandFlags["NOSCRIPT"] = "noscript";
    CommandFlags["RANDOM"] = "random";
    CommandFlags["SORT_FOR_SCRIPT"] = "sort_for_script";
    CommandFlags["LOADING"] = "loading";
    CommandFlags["STALE"] = "stale";
    CommandFlags["SKIP_MONITOR"] = "skip_monitor";
    CommandFlags["ASKING"] = "asking";
    CommandFlags["FAST"] = "fast";
    CommandFlags["MOVABLEKEYS"] = "movablekeys"; // keys have no pre-determined position. You must discover keys yourself.
})(CommandFlags || (exports.CommandFlags = CommandFlags = {}));
var CommandCategories;
(function (CommandCategories) {
    CommandCategories["KEYSPACE"] = "@keyspace";
    CommandCategories["READ"] = "@read";
    CommandCategories["WRITE"] = "@write";
    CommandCategories["SET"] = "@set";
    CommandCategories["SORTEDSET"] = "@sortedset";
    CommandCategories["LIST"] = "@list";
    CommandCategories["HASH"] = "@hash";
    CommandCategories["STRING"] = "@string";
    CommandCategories["BITMAP"] = "@bitmap";
    CommandCategories["HYPERLOGLOG"] = "@hyperloglog";
    CommandCategories["GEO"] = "@geo";
    CommandCategories["STREAM"] = "@stream";
    CommandCategories["PUBSUB"] = "@pubsub";
    CommandCategories["ADMIN"] = "@admin";
    CommandCategories["FAST"] = "@fast";
    CommandCategories["SLOW"] = "@slow";
    CommandCategories["BLOCKING"] = "@blocking";
    CommandCategories["DANGEROUS"] = "@dangerous";
    CommandCategories["CONNECTION"] = "@connection";
    CommandCategories["TRANSACTION"] = "@transaction";
    CommandCategories["SCRIPTING"] = "@scripting";
})(CommandCategories || (exports.CommandCategories = CommandCategories = {}));
function transformCommandReply([name, arity, flags, firstKeyIndex, lastKeyIndex, step, categories]) {
    return {
        name,
        arity,
        flags: new Set(flags),
        firstKeyIndex,
        lastKeyIndex,
        step,
        categories: new Set(categories)
    };
}
exports.transformCommandReply = transformCommandReply;
var RedisFunctionFlags;
(function (RedisFunctionFlags) {
    RedisFunctionFlags["NO_WRITES"] = "no-writes";
    RedisFunctionFlags["ALLOW_OOM"] = "allow-oom";
    RedisFunctionFlags["ALLOW_STALE"] = "allow-stale";
    RedisFunctionFlags["NO_CLUSTER"] = "no-cluster";
})(RedisFunctionFlags || (exports.RedisFunctionFlags = RedisFunctionFlags = {}));
function transformFunctionListItemReply(reply) {
    return {
        libraryName: reply[1],
        engine: reply[3],
        functions: reply[5].map(fn => ({
            name: fn[1],
            description: fn[3],
            flags: fn[5]
        }))
    };
}
exports.transformFunctionListItemReply = transformFunctionListItemReply;
function pushSortArguments(args, options) {
    if (options?.BY) {
        args.push('BY', options.BY);
    }
    if (options?.LIMIT) {
        args.push('LIMIT', options.LIMIT.offset.toString(), options.LIMIT.count.toString());
    }
    if (options?.GET) {
        for (const pattern of (typeof options.GET === 'string' ? [options.GET] : options.GET)) {
            args.push('GET', pattern);
        }
    }
    if (options?.DIRECTION) {
        args.push(options.DIRECTION);
    }
    if (options?.ALPHA) {
        args.push('ALPHA');
    }
    return args;
}
exports.pushSortArguments = pushSortArguments;
function pushSlotRangeArguments(args, range) {
    args.push(range.start.toString(), range.end.toString());
}
function pushSlotRangesArguments(args, ranges) {
    if (Array.isArray(ranges)) {
        for (const range of ranges) {
            pushSlotRangeArguments(args, range);
        }
    }
    else {
        pushSlotRangeArguments(args, ranges);
    }
    return args;
}
exports.pushSlotRangesArguments = pushSlotRangesArguments;
function transformRangeReply([start, end]) {
    return {
        start,
        end
    };
}
exports.transformRangeReply = transformRangeReply;
