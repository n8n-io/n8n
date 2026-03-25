"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheCommand = cacheCommand;
const aggregate_flags_1 = require("./aggregate-flags");
const cache_default_value_1 = require("./cache-default-value");
const ensure_arg_object_1 = require("./ensure-arg-object");
const util_1 = require("./util");
// In order to collect static properties up the inheritance chain, we need to recursively
// access the prototypes until there's nothing left. This allows us to combine baseFlags
// and flags as well as add in the json flag if enableJsonFlag is enabled.
function mergePrototype(result, cmd) {
    const proto = Object.getPrototypeOf(cmd);
    const filteredProto = (0, util_1.pickBy)(proto, (v) => v !== undefined);
    return Object.keys(proto).length > 0 ? mergePrototype({ ...filteredProto, ...result }, proto) : result;
}
async function cacheFlags(cmdFlags, respectNoCacheDefault) {
    const promises = Object.entries(cmdFlags).map(async ([name, flag]) => [
        name,
        {
            aliases: flag.aliases,
            char: flag.char,
            charAliases: flag.charAliases,
            dependsOn: flag.dependsOn,
            deprecateAliases: flag.deprecateAliases,
            deprecated: flag.deprecated,
            description: flag.description,
            env: flag.env,
            exclusive: flag.exclusive,
            helpGroup: flag.helpGroup,
            helpLabel: flag.helpLabel,
            hidden: flag.hidden,
            name,
            noCacheDefault: flag.noCacheDefault,
            relationships: flag.relationships,
            required: flag.required,
            summary: flag.summary,
            ...(flag.type === 'boolean'
                ? {
                    allowNo: flag.allowNo,
                    type: flag.type,
                }
                : {
                    default: await (0, cache_default_value_1.cacheDefaultValue)(flag, respectNoCacheDefault),
                    delimiter: flag.delimiter,
                    hasDynamicHelp: typeof flag.defaultHelp === 'function',
                    helpValue: flag.helpValue,
                    multiple: flag.multiple,
                    options: flag.options,
                    type: flag.type,
                }),
        },
    ]);
    return Object.fromEntries(await Promise.all(promises));
}
async function cacheArgs(cmdArgs, respectNoCacheDefault) {
    const promises = Object.entries(cmdArgs).map(async ([name, arg]) => [
        name,
        {
            default: await (0, cache_default_value_1.cacheDefaultValue)(arg, respectNoCacheDefault),
            description: arg.description,
            hidden: arg.hidden,
            name,
            noCacheDefault: arg.noCacheDefault,
            options: arg.options,
            required: arg.required,
        },
    ]);
    return Object.fromEntries(await Promise.all(promises));
}
async function cacheCommand(uncachedCmd, plugin, respectNoCacheDefault = false) {
    const cmd = mergePrototype(uncachedCmd, uncachedCmd);
    // @ts-expect-error because v2 commands have flags stored in _flags
    const uncachedFlags = cmd.flags ?? cmd._flags;
    // @ts-expect-error because v2 commands have base flags stored in _baseFlags
    const uncachedBaseFlags = cmd.baseFlags ?? cmd._baseFlags;
    const [flags, args] = await Promise.all([
        cacheFlags((0, aggregate_flags_1.aggregateFlags)(uncachedFlags, uncachedBaseFlags, cmd.enableJsonFlag), respectNoCacheDefault),
        cacheArgs((0, ensure_arg_object_1.ensureArgObject)(cmd.args), respectNoCacheDefault),
    ]);
    const stdProperties = {
        // Replace all spaces in aliases with colons to standardize them.
        aliases: (cmd.aliases ?? []).map((a) => a.replaceAll(' ', ':')),
        args,
        deprecateAliases: cmd.deprecateAliases,
        deprecationOptions: cmd.deprecationOptions,
        description: cmd.description,
        // Support both `examples` and `example` for backwards compatibility.
        examples: cmd.examples ?? cmd.example,
        flags,
        hasDynamicHelp: Object.values(flags).some((f) => f.hasDynamicHelp),
        hidden: cmd.hidden,
        hiddenAliases: cmd.hiddenAliases ?? [],
        id: cmd.id,
        pluginAlias: plugin && plugin.alias,
        pluginName: plugin && plugin.name,
        pluginType: plugin && plugin.type,
        state: cmd.state,
        strict: cmd.strict,
        summary: cmd.summary,
        usage: cmd.usage,
    };
    // do not include these properties in manifest
    const ignoreCommandProperties = [
        'plugin',
        '_flags',
        '_enableJsonFlag',
        '_globalFlags',
        '_baseFlags',
        'baseFlags',
        '_--',
        '_base',
    ];
    // Add in any additional properties that are not standard command properties.
    const stdKeysAndIgnored = new Set([...ignoreCommandProperties, ...Object.keys(stdProperties)]);
    const keysToAdd = Object.keys(cmd).filter((property) => !stdKeysAndIgnored.has(property));
    const additionalProperties = Object.fromEntries(keysToAdd.map((key) => [key, cmd[key]]));
    return { ...stdProperties, ...additionalProperties };
}
