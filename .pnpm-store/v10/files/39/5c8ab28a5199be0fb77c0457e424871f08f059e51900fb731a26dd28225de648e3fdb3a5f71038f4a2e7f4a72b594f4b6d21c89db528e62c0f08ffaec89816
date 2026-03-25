"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const util_1 = require("../util/util");
const errors_1 = require("./errors");
async function validate(parse) {
    let cachedResolvedFlags;
    function validateArgs() {
        if (parse.output.nonExistentFlags?.length > 0) {
            throw new errors_1.NonExistentFlagsError({
                flags: parse.output.nonExistentFlags,
                parse,
            });
        }
        const maxArgs = Object.keys(parse.input.args).length;
        if (parse.input.strict && parse.output.argv.length > maxArgs) {
            const extras = parse.output.argv.slice(maxArgs);
            throw new errors_1.UnexpectedArgsError({
                args: extras,
                parse,
            });
        }
        const missingRequiredArgs = [];
        let hasOptional = false;
        for (const [name, arg] of Object.entries(parse.input.args)) {
            if (!arg.required) {
                hasOptional = true;
            }
            else if (hasOptional) {
                // (required arg) check whether an optional has occurred before
                // optionals should follow required, not before
                throw new errors_1.InvalidArgsSpecError({
                    args: parse.input.args,
                    parse,
                });
            }
            // Only add if it's required and undefined. Allow falsy values like empty strings and 0.
            if (arg.required && parse.output.args[name] === undefined) {
                missingRequiredArgs.push(arg);
            }
        }
        if (missingRequiredArgs.length > 0) {
            const flagsWithMultiple = Object.entries(parse.input.flags)
                .filter(([_, flagDef]) => flagDef.type === 'option' && Boolean(flagDef.multiple))
                .map(([name]) => name);
            throw new errors_1.RequiredArgsError({
                args: missingRequiredArgs,
                flagsWithMultiple,
                parse,
            });
        }
    }
    async function validateFlags() {
        const promises = Object.entries(parse.input.flags).flatMap(([name, flag]) => {
            if (parse.output.flags[name] !== undefined) {
                return [
                    ...(flag.relationships ? validateRelationships(name, flag) : []),
                    ...(flag.dependsOn ? [validateDependsOn(name, flag.dependsOn)] : []),
                    ...(flag.exclusive ? [validateExclusive(name, flag.exclusive)] : []),
                    ...(flag.exactlyOne ? [validateExactlyOne(name, flag.exactlyOne)] : []),
                ];
            }
            if (flag.required) {
                return [{ name, reason: `Missing required flag ${name}`, status: 'failed', validationFn: 'required' }];
            }
            if (flag.exactlyOne && flag.exactlyOne.length > 0) {
                return [validateExactlyOneAcrossFlags(flag)];
            }
            if (flag.atLeastOne && flag.atLeastOne.length > 0) {
                return [validateAtLeastOneAcrossFlags(flag)];
            }
            return [];
        });
        const results = await Promise.all(promises);
        const failed = results.filter((r) => r.status === 'failed');
        if (failed.length > 0)
            throw new errors_1.FailedFlagValidationError({
                failed,
                parse,
            });
    }
    async function resolveFlags(flags) {
        if (cachedResolvedFlags)
            return cachedResolvedFlags;
        const promises = flags.map(async (flag) => {
            if (typeof flag === 'string') {
                return [flag, parse.output.flags[flag]];
            }
            const result = await flag.when(parse.output.flags);
            return result ? [flag.name, parse.output.flags[flag.name]] : null;
        });
        const resolved = await Promise.all(promises);
        cachedResolvedFlags = Object.fromEntries(resolved.filter((r) => r !== null));
        return cachedResolvedFlags;
    }
    const getPresentFlags = (flags) => Object.keys(flags).filter((key) => key !== undefined);
    function validateExactlyOneAcrossFlags(flag) {
        const base = { name: flag.name, validationFn: 'validateExactlyOneAcrossFlags' };
        const intersection = Object.entries(parse.input.flags)
            .map((entry) => entry[0]) // array of flag names
            .filter((flagName) => parse.output.flags[flagName] !== undefined) // with values
            .filter((flagName) => flag.exactlyOne && flag.exactlyOne.includes(flagName)); // and in the exactlyOne list
        if (intersection.length === 0) {
            // the command's exactlyOne may or may not include itself, so we'll use Set to add + de-dupe
            const deduped = (0, util_1.uniq)(flag.exactlyOne?.map((flag) => `--${flag}`) ?? []).join(', ');
            const reason = `Exactly one of the following must be provided: ${deduped}`;
            return { ...base, reason, status: 'failed' };
        }
        return { ...base, status: 'success' };
    }
    function validateAtLeastOneAcrossFlags(flag) {
        const base = { name: flag.name, validationFn: 'validateAtLeastOneAcrossFlags' };
        const intersection = Object.entries(parse.input.flags)
            .map((entry) => entry[0]) // array of flag names
            .filter((flagName) => parse.output.flags[flagName] !== undefined) // with values
            .filter((flagName) => flag.atLeastOne && flag.atLeastOne.includes(flagName)); // and in the atLeastOne list
        if (intersection.length === 0) {
            // the command's atLeastOne may or may not include itself, so we'll use Set to add + de-dupe
            const deduped = (0, util_1.uniq)(flag.atLeastOne?.map((flag) => `--${flag}`) ?? []).join(', ');
            const reason = `At least one of the following must be provided: ${deduped}`;
            return { ...base, reason, status: 'failed' };
        }
        return { ...base, status: 'success' };
    }
    async function validateExclusive(name, flags) {
        const base = { name, validationFn: 'validateExclusive' };
        const resolved = await resolveFlags(flags);
        const keys = getPresentFlags(resolved);
        for (const flag of keys) {
            // do not enforce exclusivity for flags that were defaulted
            if (parse.output.metadata.flags && parse.output.metadata.flags[flag]?.setFromDefault)
                continue;
            if (parse.output.metadata.flags && parse.output.metadata.flags[name]?.setFromDefault)
                continue;
            if (parse.output.flags[flag] !== undefined) {
                const flagValue = parse.output.metadata.flags?.[flag]?.defaultHelp ?? parse.output.flags[flag];
                return {
                    ...base,
                    reason: `--${flag}=${flagValue} cannot also be provided when using --${name}`,
                    status: 'failed',
                };
            }
        }
        return { ...base, status: 'success' };
    }
    async function validateExactlyOne(name, flags) {
        const base = { name, validationFn: 'validateExactlyOne' };
        const resolved = await resolveFlags(flags);
        const keys = getPresentFlags(resolved);
        for (const flag of keys) {
            if (flag !== name && parse.output.flags[flag] !== undefined) {
                return { ...base, reason: `--${flag} cannot also be provided when using --${name}`, status: 'failed' };
            }
        }
        return { ...base, status: 'success' };
    }
    async function validateDependsOn(name, flags) {
        const base = { name, validationFn: 'validateDependsOn' };
        const resolved = await resolveFlags(flags);
        const foundAll = Object.values(resolved).every((val) => val !== undefined);
        if (!foundAll) {
            const formattedFlags = Object.keys(resolved)
                .map((f) => `--${f}`)
                .join(', ');
            return {
                ...base,
                reason: `All of the following must be provided when using --${name}: ${formattedFlags}`,
                status: 'failed',
            };
        }
        return { ...base, status: 'success' };
    }
    async function validateSome(name, flags) {
        const base = { name, validationFn: 'validateSome' };
        const resolved = await resolveFlags(flags);
        const foundAtLeastOne = Object.values(resolved).some(Boolean);
        if (!foundAtLeastOne) {
            const formattedFlags = Object.keys(resolved)
                .map((f) => `--${f}`)
                .join(', ');
            return {
                ...base,
                reason: `One of the following must be provided when using --${name}: ${formattedFlags}`,
                status: 'failed',
            };
        }
        return { ...base, status: 'success' };
    }
    function validateRelationships(name, flag) {
        return (flag.relationships ?? []).map((relationship) => {
            switch (relationship.type) {
                case 'all': {
                    return validateDependsOn(name, relationship.flags);
                }
                case 'none': {
                    return validateExclusive(name, relationship.flags);
                }
                case 'some': {
                    return validateSome(name, relationship.flags);
                }
                default: {
                    throw new Error(`Unknown relationship type: ${relationship.type}`);
                }
            }
        });
    }
    validateArgs();
    return validateFlags();
}
