import { inspect } from 'node:util';
import { parseArgs } from './parse-args.js';
// it's a tiny API, just cast it inline, it's fine
//@ts-ignore
import cliui from '@isaacs/cliui';
import { basename } from 'node:path';
const width = Math.min((process && process.stdout && process.stdout.columns) || 80, 80);
// indentation spaces from heading level
const indent = (n) => (n - 1) * 2;
const toEnvKey = (pref, key) => {
    return [pref, key.replace(/[^a-zA-Z0-9]+/g, ' ')]
        .join(' ')
        .trim()
        .toUpperCase()
        .replace(/ /g, '_');
};
const toEnvVal = (value, delim = '\n') => {
    const str = typeof value === 'string' ? value
        : typeof value === 'boolean' ?
            value ? '1'
                : '0'
            : typeof value === 'number' ? String(value)
                : Array.isArray(value) ?
                    value.map((v) => toEnvVal(v)).join(delim)
                    : /* c8 ignore start */ undefined;
    if (typeof str !== 'string') {
        throw new Error(`could not serialize value to environment: ${JSON.stringify(value)}`);
    }
    /* c8 ignore stop */
    return str;
};
const fromEnvVal = (env, type, multiple, delim = '\n') => (multiple ?
    env ? env.split(delim).map(v => fromEnvVal(v, type, false))
        : []
    : type === 'string' ? env
        : type === 'boolean' ? env === '1'
            : +env.trim());
export const isConfigType = (t) => typeof t === 'string' &&
    (t === 'string' || t === 'number' || t === 'boolean');
const undefOrType = (v, t) => v === undefined || typeof v === t;
const undefOrTypeArray = (v, t) => v === undefined || (Array.isArray(v) && v.every(x => typeof x === t));
const isValidOption = (v, vo) => Array.isArray(v) ? v.every(x => isValidOption(x, vo)) : vo.includes(v);
// print the value type, for error message reporting
const valueType = (v) => typeof v === 'string' ? 'string'
    : typeof v === 'boolean' ? 'boolean'
        : typeof v === 'number' ? 'number'
            : Array.isArray(v) ?
                joinTypes([...new Set(v.map(v => valueType(v)))]) + '[]'
                : `${v.type}${v.multiple ? '[]' : ''}`;
const joinTypes = (types) => types.length === 1 && typeof types[0] === 'string' ?
    types[0]
    : `(${types.join('|')})`;
const isValidValue = (v, type, multi) => {
    if (multi) {
        if (!Array.isArray(v))
            return false;
        return !v.some((v) => !isValidValue(v, type, false));
    }
    if (Array.isArray(v))
        return false;
    return typeof v === type;
};
export const isConfigOption = (o, type, multi) => !!o &&
    typeof o === 'object' &&
    isConfigType(o.type) &&
    o.type === type &&
    undefOrType(o.short, 'string') &&
    undefOrType(o.description, 'string') &&
    undefOrType(o.hint, 'string') &&
    undefOrType(o.validate, 'function') &&
    (o.type === 'boolean' ?
        o.validOptions === undefined
        : undefOrTypeArray(o.validOptions, o.type)) &&
    (o.default === undefined || isValidValue(o.default, type, multi)) &&
    !!o.multiple === multi;
function num(o = {}) {
    const { default: def, validate: val, validOptions, ...rest } = o;
    if (def !== undefined && !isValidValue(def, 'number', false)) {
        throw new TypeError('invalid default value', {
            cause: {
                found: def,
                wanted: 'number',
            },
        });
    }
    if (!undefOrTypeArray(validOptions, 'number')) {
        throw new TypeError('invalid validOptions', {
            cause: {
                found: validOptions,
                wanted: 'number[]',
            },
        });
    }
    const validate = val ?
        val
        : undefined;
    return {
        ...rest,
        default: def,
        validate,
        validOptions,
        type: 'number',
        multiple: false,
    };
}
function numList(o = {}) {
    const { default: def, validate: val, validOptions, ...rest } = o;
    if (def !== undefined && !isValidValue(def, 'number', true)) {
        throw new TypeError('invalid default value', {
            cause: {
                found: def,
                wanted: 'number[]',
            },
        });
    }
    if (!undefOrTypeArray(validOptions, 'number')) {
        throw new TypeError('invalid validOptions', {
            cause: {
                found: validOptions,
                wanted: 'number[]',
            },
        });
    }
    const validate = val ?
        val
        : undefined;
    return {
        ...rest,
        default: def,
        validate,
        validOptions,
        type: 'number',
        multiple: true,
    };
}
function opt(o = {}) {
    const { default: def, validate: val, validOptions, ...rest } = o;
    if (def !== undefined && !isValidValue(def, 'string', false)) {
        throw new TypeError('invalid default value', {
            cause: {
                found: def,
                wanted: 'string',
            },
        });
    }
    if (!undefOrTypeArray(validOptions, 'string')) {
        throw new TypeError('invalid validOptions', {
            cause: {
                found: validOptions,
                wanted: 'string[]',
            },
        });
    }
    const validate = val ?
        val
        : undefined;
    return {
        ...rest,
        default: def,
        validate,
        validOptions,
        type: 'string',
        multiple: false,
    };
}
function optList(o = {}) {
    const { default: def, validate: val, validOptions, ...rest } = o;
    if (def !== undefined && !isValidValue(def, 'string', true)) {
        throw new TypeError('invalid default value', {
            cause: {
                found: def,
                wanted: 'string[]',
            },
        });
    }
    if (!undefOrTypeArray(validOptions, 'string')) {
        throw new TypeError('invalid validOptions', {
            cause: {
                found: validOptions,
                wanted: 'string[]',
            },
        });
    }
    const validate = val ?
        val
        : undefined;
    return {
        ...rest,
        default: def,
        validate,
        validOptions,
        type: 'string',
        multiple: true,
    };
}
function flag(o = {}) {
    const { hint, default: def, validate: val, ...rest } = o;
    delete rest.validOptions;
    if (def !== undefined && !isValidValue(def, 'boolean', false)) {
        throw new TypeError('invalid default value');
    }
    const validate = val ?
        val
        : undefined;
    if (hint !== undefined) {
        throw new TypeError('cannot provide hint for flag');
    }
    return {
        ...rest,
        default: def,
        validate,
        type: 'boolean',
        multiple: false,
    };
}
function flagList(o = {}) {
    const { hint, default: def, validate: val, ...rest } = o;
    delete rest.validOptions;
    if (def !== undefined && !isValidValue(def, 'boolean', true)) {
        throw new TypeError('invalid default value');
    }
    const validate = val ?
        val
        : undefined;
    if (hint !== undefined) {
        throw new TypeError('cannot provide hint for flag list');
    }
    return {
        ...rest,
        default: def,
        validate,
        type: 'boolean',
        multiple: true,
    };
}
const toParseArgsOptionsConfig = (options) => {
    const c = {};
    for (const longOption in options) {
        const config = options[longOption];
        /* c8 ignore start */
        if (!config) {
            throw new Error('config must be an object: ' + longOption);
        }
        /* c8 ignore start */
        if (isConfigOption(config, 'number', true)) {
            c[longOption] = {
                type: 'string',
                multiple: true,
                default: config.default?.map(c => String(c)),
            };
        }
        else if (isConfigOption(config, 'number', false)) {
            c[longOption] = {
                type: 'string',
                multiple: false,
                default: config.default === undefined ?
                    undefined
                    : String(config.default),
            };
        }
        else {
            const conf = config;
            c[longOption] = {
                type: conf.type,
                multiple: !!conf.multiple,
                default: conf.default,
            };
        }
        const clo = c[longOption];
        if (typeof config.short === 'string') {
            clo.short = config.short;
        }
        if (config.type === 'boolean' &&
            !longOption.startsWith('no-') &&
            !options[`no-${longOption}`]) {
            c[`no-${longOption}`] = {
                type: 'boolean',
                multiple: config.multiple,
            };
        }
    }
    return c;
};
const isHeading = (r) => r.type === 'heading';
const isDescription = (r) => r.type === 'description';
/**
 * Class returned by the {@link jack} function and all configuration
 * definition methods.  This is what gets chained together.
 */
export class Jack {
    #configSet;
    #shorts;
    #options;
    #fields = [];
    #env;
    #envPrefix;
    #allowPositionals;
    #usage;
    #usageMarkdown;
    constructor(options = {}) {
        this.#options = options;
        this.#allowPositionals = options.allowPositionals !== false;
        this.#env =
            this.#options.env === undefined ? process.env : this.#options.env;
        this.#envPrefix = options.envPrefix;
        // We need to fib a little, because it's always the same object, but it
        // starts out as having an empty config set.  Then each method that adds
        // fields returns `this as Jack<C & { ...newConfigs }>`
        this.#configSet = Object.create(null);
        this.#shorts = Object.create(null);
    }
    /**
     * Set the default value (which will still be overridden by env or cli)
     * as if from a parsed config file. The optional `source` param, if
     * provided, will be included in error messages if a value is invalid or
     * unknown.
     */
    setConfigValues(values, source = '') {
        try {
            this.validate(values);
        }
        catch (er) {
            const e = er;
            if (source && e && typeof e === 'object') {
                if (e.cause && typeof e.cause === 'object') {
                    Object.assign(e.cause, { path: source });
                }
                else {
                    e.cause = { path: source };
                }
            }
            throw e;
        }
        for (const [field, value] of Object.entries(values)) {
            const my = this.#configSet[field];
            // already validated, just for TS's benefit
            /* c8 ignore start */
            if (!my) {
                throw new Error('unexpected field in config set: ' + field, {
                    cause: { found: field },
                });
            }
            /* c8 ignore stop */
            my.default = value;
        }
        return this;
    }
    /**
     * Parse a string of arguments, and return the resulting
     * `{ values, positionals }` object.
     *
     * If an {@link JackOptions#envPrefix} is set, then it will read default
     * values from the environment, and write the resulting values back
     * to the environment as well.
     *
     * Environment values always take precedence over any other value, except
     * an explicit CLI setting.
     */
    parse(args = process.argv) {
        this.loadEnvDefaults();
        const p = this.parseRaw(args);
        this.applyDefaults(p);
        this.writeEnv(p);
        return p;
    }
    loadEnvDefaults() {
        if (this.#envPrefix) {
            for (const [field, my] of Object.entries(this.#configSet)) {
                const ek = toEnvKey(this.#envPrefix, field);
                const env = this.#env[ek];
                if (env !== undefined) {
                    my.default = fromEnvVal(env, my.type, !!my.multiple, my.delim);
                }
            }
        }
    }
    applyDefaults(p) {
        for (const [field, c] of Object.entries(this.#configSet)) {
            if (c.default !== undefined && !(field in p.values)) {
                //@ts-ignore
                p.values[field] = c.default;
            }
        }
    }
    /**
     * Only parse the command line arguments passed in.
     * Does not strip off the `node script.js` bits, so it must be just the
     * arguments you wish to have parsed.
     * Does not read from or write to the environment, or set defaults.
     */
    parseRaw(args) {
        if (args === process.argv) {
            args = args.slice(process._eval !== undefined ? 1 : 2);
        }
        const options = toParseArgsOptionsConfig(this.#configSet);
        const result = parseArgs({
            args,
            options,
            // always strict, but using our own logic
            strict: false,
            allowPositionals: this.#allowPositionals,
            tokens: true,
        });
        const p = {
            values: {},
            positionals: [],
        };
        for (const token of result.tokens) {
            if (token.kind === 'positional') {
                p.positionals.push(token.value);
                if (this.#options.stopAtPositional ||
                    this.#options.stopAtPositionalTest?.(token.value)) {
                    p.positionals.push(...args.slice(token.index + 1));
                    break;
                }
            }
            else if (token.kind === 'option') {
                let value = undefined;
                if (token.name.startsWith('no-')) {
                    const my = this.#configSet[token.name];
                    const pname = token.name.substring('no-'.length);
                    const pos = this.#configSet[pname];
                    if (pos &&
                        pos.type === 'boolean' &&
                        (!my ||
                            (my.type === 'boolean' && !!my.multiple === !!pos.multiple))) {
                        value = false;
                        token.name = pname;
                    }
                }
                const my = this.#configSet[token.name];
                if (!my) {
                    throw new Error(`Unknown option '${token.rawName}'. ` +
                        `To specify a positional argument starting with a '-', ` +
                        `place it at the end of the command after '--', as in ` +
                        `'-- ${token.rawName}'`, {
                        cause: {
                            found: token.rawName + (token.value ? `=${token.value}` : ''),
                        },
                    });
                }
                if (value === undefined) {
                    if (token.value === undefined) {
                        if (my.type !== 'boolean') {
                            throw new Error(`No value provided for ${token.rawName}, expected ${my.type}`, {
                                cause: {
                                    name: token.rawName,
                                    wanted: valueType(my),
                                },
                            });
                        }
                        value = true;
                    }
                    else {
                        if (my.type === 'boolean') {
                            throw new Error(`Flag ${token.rawName} does not take a value, received '${token.value}'`, { cause: { found: token } });
                        }
                        if (my.type === 'string') {
                            value = token.value;
                        }
                        else {
                            value = +token.value;
                            if (value !== value) {
                                throw new Error(`Invalid value '${token.value}' provided for ` +
                                    `'${token.rawName}' option, expected number`, {
                                    cause: {
                                        name: token.rawName,
                                        found: token.value,
                                        wanted: 'number',
                                    },
                                });
                            }
                        }
                    }
                }
                if (my.multiple) {
                    const pv = p.values;
                    const tn = pv[token.name] ?? [];
                    pv[token.name] = tn;
                    tn.push(value);
                }
                else {
                    const pv = p.values;
                    pv[token.name] = value;
                }
            }
        }
        for (const [field, value] of Object.entries(p.values)) {
            const valid = this.#configSet[field]?.validate;
            const validOptions = this.#configSet[field]?.validOptions;
            let cause;
            if (validOptions && !isValidOption(value, validOptions)) {
                cause = { name: field, found: value, validOptions: validOptions };
            }
            if (valid && !valid(value)) {
                cause = cause || { name: field, found: value };
            }
            if (cause) {
                throw new Error(`Invalid value provided for --${field}: ${JSON.stringify(value)}`, { cause });
            }
        }
        return p;
    }
    /**
     * do not set fields as 'no-foo' if 'foo' exists and both are bools
     * just set foo.
     */
    #noNoFields(f, val, s = f) {
        if (!f.startsWith('no-') || typeof val !== 'boolean')
            return;
        const yes = f.substring('no-'.length);
        // recurse so we get the core config key we care about.
        this.#noNoFields(yes, val, s);
        if (this.#configSet[yes]?.type === 'boolean') {
            throw new Error(`do not set '${s}', instead set '${yes}' as desired.`, { cause: { found: s, wanted: yes } });
        }
    }
    /**
     * Validate that any arbitrary object is a valid configuration `values`
     * object.  Useful when loading config files or other sources.
     */
    validate(o) {
        if (!o || typeof o !== 'object') {
            throw new Error('Invalid config: not an object', {
                cause: { found: o },
            });
        }
        const opts = o;
        for (const field in o) {
            const value = opts[field];
            /* c8 ignore next - for TS */
            if (value === undefined)
                continue;
            this.#noNoFields(field, value);
            const config = this.#configSet[field];
            if (!config) {
                throw new Error(`Unknown config option: ${field}`, {
                    cause: { found: field },
                });
            }
            if (!isValidValue(value, config.type, !!config.multiple)) {
                throw new Error(`Invalid value ${valueType(value)} for ${field}, expected ${valueType(config)}`, {
                    cause: {
                        name: field,
                        found: value,
                        wanted: valueType(config),
                    },
                });
            }
            let cause;
            if (config.validOptions &&
                !isValidOption(value, config.validOptions)) {
                cause = {
                    name: field,
                    found: value,
                    validOptions: config.validOptions,
                };
            }
            if (config.validate && !config.validate(value)) {
                cause = cause || { name: field, found: value };
            }
            if (cause) {
                throw new Error(`Invalid config value for ${field}: ${value}`, {
                    cause,
                });
            }
        }
    }
    writeEnv(p) {
        if (!this.#env || !this.#envPrefix)
            return;
        for (const [field, value] of Object.entries(p.values)) {
            const my = this.#configSet[field];
            this.#env[toEnvKey(this.#envPrefix, field)] = toEnvVal(value, my?.delim);
        }
    }
    /**
     * Add a heading to the usage output banner
     */
    heading(text, level, { pre = false } = {}) {
        if (level === undefined) {
            level = this.#fields.some(r => isHeading(r)) ? 2 : 1;
        }
        this.#fields.push({ type: 'heading', text, level, pre });
        return this;
    }
    /**
     * Add a long-form description to the usage output at this position.
     */
    description(text, { pre } = {}) {
        this.#fields.push({ type: 'description', text, pre });
        return this;
    }
    /**
     * Add one or more number fields.
     */
    num(fields) {
        return this.#addFields(fields, num);
    }
    /**
     * Add one or more multiple number fields.
     */
    numList(fields) {
        return this.#addFields(fields, numList);
    }
    /**
     * Add one or more string option fields.
     */
    opt(fields) {
        return this.#addFields(fields, opt);
    }
    /**
     * Add one or more multiple string option fields.
     */
    optList(fields) {
        return this.#addFields(fields, optList);
    }
    /**
     * Add one or more flag fields.
     */
    flag(fields) {
        return this.#addFields(fields, flag);
    }
    /**
     * Add one or more multiple flag fields.
     */
    flagList(fields) {
        return this.#addFields(fields, flagList);
    }
    /**
     * Generic field definition method. Similar to flag/flagList/number/etc,
     * but you must specify the `type` (and optionally `multiple` and `delim`)
     * fields on each one, or Jack won't know how to define them.
     */
    addFields(fields) {
        const next = this;
        for (const [name, field] of Object.entries(fields)) {
            this.#validateName(name, field);
            next.#fields.push({
                type: 'config',
                name,
                value: field,
            });
        }
        Object.assign(next.#configSet, fields);
        return next;
    }
    #addFields(fields, fn) {
        const next = this;
        Object.assign(next.#configSet, Object.fromEntries(Object.entries(fields).map(([name, field]) => {
            this.#validateName(name, field);
            const option = fn(field);
            next.#fields.push({
                type: 'config',
                name,
                value: option,
            });
            return [name, option];
        })));
        return next;
    }
    #validateName(name, field) {
        if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(name)) {
            throw new TypeError(`Invalid option name: ${name}, ` +
                `must be '-' delimited ASCII alphanumeric`);
        }
        if (this.#configSet[name]) {
            throw new TypeError(`Cannot redefine option ${field}`);
        }
        if (this.#shorts[name]) {
            throw new TypeError(`Cannot redefine option ${name}, already ` +
                `in use for ${this.#shorts[name]}`);
        }
        if (field.short) {
            if (!/^[a-zA-Z0-9]$/.test(field.short)) {
                throw new TypeError(`Invalid ${name} short option: ${field.short}, ` +
                    'must be 1 ASCII alphanumeric character');
            }
            if (this.#shorts[field.short]) {
                throw new TypeError(`Invalid ${name} short option: ${field.short}, ` +
                    `already in use for ${this.#shorts[field.short]}`);
            }
            this.#shorts[field.short] = name;
            this.#shorts[name] = name;
        }
    }
    /**
     * Return the usage banner for the given configuration
     */
    usage() {
        if (this.#usage)
            return this.#usage;
        let headingLevel = 1;
        const ui = cliui({ width });
        const first = this.#fields[0];
        let start = first?.type === 'heading' ? 1 : 0;
        if (first?.type === 'heading') {
            ui.div({
                padding: [0, 0, 0, 0],
                text: normalize(first.text),
            });
        }
        ui.div({ padding: [0, 0, 0, 0], text: 'Usage:' });
        if (this.#options.usage) {
            ui.div({
                text: this.#options.usage,
                padding: [0, 0, 0, 2],
            });
        }
        else {
            const cmd = basename(String(process.argv[1]));
            const shortFlags = [];
            const shorts = [];
            const flags = [];
            const opts = [];
            for (const [field, config] of Object.entries(this.#configSet)) {
                if (config.short) {
                    if (config.type === 'boolean')
                        shortFlags.push(config.short);
                    else
                        shorts.push([config.short, config.hint || field]);
                }
                else {
                    if (config.type === 'boolean')
                        flags.push(field);
                    else
                        opts.push([field, config.hint || field]);
                }
            }
            const sf = shortFlags.length ? ' -' + shortFlags.join('') : '';
            const so = shorts.map(([k, v]) => ` --${k}=<${v}>`).join('');
            const lf = flags.map(k => ` --${k}`).join('');
            const lo = opts.map(([k, v]) => ` --${k}=<${v}>`).join('');
            const usage = `${cmd}${sf}${so}${lf}${lo}`.trim();
            ui.div({
                text: usage,
                padding: [0, 0, 0, 2],
            });
        }
        ui.div({ padding: [0, 0, 0, 0], text: '' });
        const maybeDesc = this.#fields[start];
        if (maybeDesc && isDescription(maybeDesc)) {
            const print = normalize(maybeDesc.text, maybeDesc.pre);
            start++;
            ui.div({ padding: [0, 0, 0, 0], text: print });
            ui.div({ padding: [0, 0, 0, 0], text: '' });
        }
        const { rows, maxWidth } = this.#usageRows(start);
        // every heading/description after the first gets indented by 2
        // extra spaces.
        for (const row of rows) {
            if (row.left) {
                // If the row is too long, don't wrap it
                // Bump the right-hand side down a line to make room
                const configIndent = indent(Math.max(headingLevel, 2));
                if (row.left.length > maxWidth - 3) {
                    ui.div({ text: row.left, padding: [0, 0, 0, configIndent] });
                    ui.div({ text: row.text, padding: [0, 0, 0, maxWidth] });
                }
                else {
                    ui.div({
                        text: row.left,
                        padding: [0, 1, 0, configIndent],
                        width: maxWidth,
                    }, { padding: [0, 0, 0, 0], text: row.text });
                }
                if (row.skipLine) {
                    ui.div({ padding: [0, 0, 0, 0], text: '' });
                }
            }
            else {
                if (isHeading(row)) {
                    const { level } = row;
                    headingLevel = level;
                    // only h1 and h2 have bottom padding
                    // h3-h6 do not
                    const b = level <= 2 ? 1 : 0;
                    ui.div({ ...row, padding: [0, 0, b, indent(level)] });
                }
                else {
                    ui.div({ ...row, padding: [0, 0, 1, indent(headingLevel + 1)] });
                }
            }
        }
        return (this.#usage = ui.toString());
    }
    /**
     * Return the usage banner markdown for the given configuration
     */
    usageMarkdown() {
        if (this.#usageMarkdown)
            return this.#usageMarkdown;
        const out = [];
        let headingLevel = 1;
        const first = this.#fields[0];
        let start = first?.type === 'heading' ? 1 : 0;
        if (first?.type === 'heading') {
            out.push(`# ${normalizeOneLine(first.text)}`);
        }
        out.push('Usage:');
        if (this.#options.usage) {
            out.push(normalizeMarkdown(this.#options.usage, true));
        }
        else {
            const cmd = basename(String(process.argv[1]));
            const shortFlags = [];
            const shorts = [];
            const flags = [];
            const opts = [];
            for (const [field, config] of Object.entries(this.#configSet)) {
                if (config.short) {
                    if (config.type === 'boolean')
                        shortFlags.push(config.short);
                    else
                        shorts.push([config.short, config.hint || field]);
                }
                else {
                    if (config.type === 'boolean')
                        flags.push(field);
                    else
                        opts.push([field, config.hint || field]);
                }
            }
            const sf = shortFlags.length ? ' -' + shortFlags.join('') : '';
            const so = shorts.map(([k, v]) => ` --${k}=<${v}>`).join('');
            const lf = flags.map(k => ` --${k}`).join('');
            const lo = opts.map(([k, v]) => ` --${k}=<${v}>`).join('');
            const usage = `${cmd}${sf}${so}${lf}${lo}`.trim();
            out.push(normalizeMarkdown(usage, true));
        }
        const maybeDesc = this.#fields[start];
        if (maybeDesc && isDescription(maybeDesc)) {
            out.push(normalizeMarkdown(maybeDesc.text, maybeDesc.pre));
            start++;
        }
        const { rows } = this.#usageRows(start);
        // heading level in markdown is number of # ahead of text
        for (const row of rows) {
            if (row.left) {
                out.push('#'.repeat(headingLevel + 1) +
                    ' ' +
                    normalizeOneLine(row.left, true));
                if (row.text)
                    out.push(normalizeMarkdown(row.text));
            }
            else if (isHeading(row)) {
                const { level } = row;
                headingLevel = level;
                out.push(`${'#'.repeat(headingLevel)} ${normalizeOneLine(row.text, row.pre)}`);
            }
            else {
                out.push(normalizeMarkdown(row.text, !!row.pre));
            }
        }
        return (this.#usageMarkdown = out.join('\n\n') + '\n');
    }
    #usageRows(start) {
        // turn each config type into a row, and figure out the width of the
        // left hand indentation for the option descriptions.
        let maxMax = Math.max(12, Math.min(26, Math.floor(width / 3)));
        let maxWidth = 8;
        let prev = undefined;
        const rows = [];
        for (const field of this.#fields.slice(start)) {
            if (field.type !== 'config') {
                if (prev?.type === 'config')
                    prev.skipLine = true;
                prev = undefined;
                field.text = normalize(field.text, !!field.pre);
                rows.push(field);
                continue;
            }
            const { value } = field;
            const desc = value.description || '';
            const mult = value.multiple ? 'Can be set multiple times' : '';
            const opts = value.validOptions?.length ?
                `Valid options:${value.validOptions.map(v => ` ${JSON.stringify(v)}`)}`
                : '';
            const dmDelim = desc.includes('\n') ? '\n\n' : '\n';
            const extra = [opts, mult].join(dmDelim).trim();
            const text = (normalize(desc) + dmDelim + extra).trim();
            const hint = value.hint ||
                (value.type === 'number' ? 'n'
                    : value.type === 'string' ? field.name
                        : undefined);
            const short = !value.short ? ''
                : value.type === 'boolean' ? `-${value.short} `
                    : `-${value.short}<${hint}> `;
            const left = value.type === 'boolean' ?
                `${short}--${field.name}`
                : `${short}--${field.name}=<${hint}>`;
            const row = { text, left, type: 'config' };
            if (text.length > width - maxMax) {
                row.skipLine = true;
            }
            if (prev && left.length > maxMax)
                prev.skipLine = true;
            prev = row;
            const len = left.length + 4;
            if (len > maxWidth && len < maxMax) {
                maxWidth = len;
            }
            rows.push(row);
        }
        return { rows, maxWidth };
    }
    /**
     * Return the configuration options as a plain object
     */
    toJSON() {
        return Object.fromEntries(Object.entries(this.#configSet).map(([field, def]) => [
            field,
            {
                type: def.type,
                ...(def.multiple ? { multiple: true } : {}),
                ...(def.delim ? { delim: def.delim } : {}),
                ...(def.short ? { short: def.short } : {}),
                ...(def.description ?
                    { description: normalize(def.description) }
                    : {}),
                ...(def.validate ? { validate: def.validate } : {}),
                ...(def.validOptions ? { validOptions: def.validOptions } : {}),
                ...(def.default !== undefined ? { default: def.default } : {}),
                ...(def.hint ? { hint: def.hint } : {}),
            },
        ]));
    }
    /**
     * Custom printer for `util.inspect`
     */
    [inspect.custom](_, options) {
        return `Jack ${inspect(this.toJSON(), options)}`;
    }
}
// Unwrap and un-indent, so we can wrap description
// strings however makes them look nice in the code.
const normalize = (s, pre = false) => {
    if (pre)
        // prepend a ZWSP to each line so cliui doesn't strip it.
        return s
            .split('\n')
            .map(l => `\u200b${l}`)
            .join('\n');
    return s
        .split(/^\s*```\s*$/gm)
        .map((s, i) => {
        if (i % 2 === 1) {
            if (!s.trim()) {
                return `\`\`\`\n\`\`\`\n`;
            }
            // outdent the ``` blocks, but preserve whitespace otherwise.
            const split = s.split('\n');
            // throw out the \n at the start and end
            split.pop();
            split.shift();
            const si = split.reduce((shortest, l) => {
                /* c8 ignore next */
                const ind = l.match(/^\s*/)?.[0] ?? '';
                if (ind.length)
                    return Math.min(ind.length, shortest);
                else
                    return shortest;
            }, Infinity);
            /* c8 ignore next */
            const i = isFinite(si) ? si : 0;
            return ('\n```\n' +
                split.map(s => `\u200b${s.substring(i)}`).join('\n') +
                '\n```\n');
        }
        return (s
            // remove single line breaks, except for lists
            .replace(/([^\n])\n[ \t]*([^\n])/g, (_, $1, $2) => !/^[-*]/.test($2) ? `${$1} ${$2}` : `${$1}\n${$2}`)
            // normalize mid-line whitespace
            .replace(/([^\n])[ \t]+([^\n])/g, '$1 $2')
            // two line breaks are enough
            .replace(/\n{3,}/g, '\n\n')
            // remove any spaces at the start of a line
            .replace(/\n[ \t]+/g, '\n')
            .trim());
    })
        .join('\n');
};
// normalize for markdown printing, remove leading spaces on lines
const normalizeMarkdown = (s, pre = false) => {
    const n = normalize(s, pre).replace(/\\/g, '\\\\');
    return pre ?
        `\`\`\`\n${n.replace(/\u200b/g, '')}\n\`\`\``
        : n.replace(/\n +/g, '\n').trim();
};
const normalizeOneLine = (s, pre = false) => {
    const n = normalize(s, pre)
        .replace(/[\s\u200b]+/g, ' ')
        .trim();
    return pre ? `\`${n}\`` : n;
};
/**
 * Main entry point. Create and return a {@link Jack} object.
 */
export const jack = (options = {}) => new Jack(options);
//# sourceMappingURL=index.js.map