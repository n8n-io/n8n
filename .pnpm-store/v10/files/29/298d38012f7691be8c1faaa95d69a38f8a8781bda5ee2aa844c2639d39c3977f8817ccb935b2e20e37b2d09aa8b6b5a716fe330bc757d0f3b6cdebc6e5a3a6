"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandHelp = void 0;
const ansis_1 = __importDefault(require("ansis"));
const ensure_arg_object_1 = require("../util/ensure-arg-object");
const ids_1 = require("../util/ids");
const util_1 = require("../util/util");
const theme_1 = require("../ux/theme");
const docopts_1 = require("./docopts");
const formatter_1 = require("./formatter");
// Don't use os.EOL because we need to ensure that a string
// written on any platform, that may use \r\n or \n, will be
// split on any platform, not just the os specific EOL at runtime.
const POSSIBLE_LINE_FEED = /\r\n|\n/;
/**
 * Determines the sort order of flags. Will default to alphabetical if not set or set to an invalid value.
 */
function determineSortOrder(flagSortOrder) {
    if (flagSortOrder === 'alphabetical')
        return 'alphabetical';
    if (flagSortOrder === 'none')
        return 'none';
    return 'alphabetical';
}
class CommandHelp extends formatter_1.HelpFormatter {
    command;
    config;
    opts;
    constructor(command, config, opts) {
        super(config, opts);
        this.command = command;
        this.config = config;
        this.opts = opts;
    }
    aliases(aliases) {
        if (!aliases || aliases.length === 0)
            return;
        const body = aliases
            .map((a) => [
            (0, theme_1.colorize)(this.config?.theme?.dollarSign, '$'),
            (0, theme_1.colorize)(this.config?.theme?.bin, this.config.bin),
            (0, theme_1.colorize)(this.config?.theme?.alias, a),
        ].join(' '))
            .join('\n');
        return body;
    }
    arg(arg) {
        const name = arg.name.toUpperCase();
        if (arg.required)
            return `${name}`;
        return `[${name}]`;
    }
    args(args) {
        if (args.filter((a) => a.description).length === 0)
            return;
        return args.map((a) => {
            // Add ellipsis to indicate that the argument takes multiple values if strict is false
            const name = this.command.strict === false ? `${a.name.toUpperCase()}...` : a.name.toUpperCase();
            let description = a.description || '';
            if (a.default)
                description = `${(0, theme_1.colorize)(this.config?.theme?.flagDefaultValue, `[default: ${a.default}]`)} ${description}`;
            if (a.options)
                description = `${(0, theme_1.colorize)(this.config?.theme?.flagOptions, `(${a.options.join('|')})`)} ${description}`;
            return [
                (0, theme_1.colorize)(this.config?.theme?.flag, name),
                description ? (0, theme_1.colorize)(this.config?.theme?.sectionDescription, description) : undefined,
            ];
        });
    }
    defaultUsage() {
        // Docopts by default
        if (this.opts.docopts === undefined || this.opts.docopts) {
            return docopts_1.DocOpts.generate(this.command);
        }
        return (0, util_1.compact)([
            this.command.id,
            Object.values(this.command.args ?? {})
                ?.filter((a) => !a.hidden)
                .map((a) => this.arg(a))
                .join(' '),
        ]).join(' ');
    }
    description() {
        const cmd = this.command;
        let description;
        if (this.opts.hideCommandSummaryInDescription) {
            description = (cmd.description || '').split(POSSIBLE_LINE_FEED).slice(1);
        }
        else if (cmd.description) {
            const summary = cmd.summary ? `${cmd.summary}\n` : null;
            description = summary
                ? [...summary.split(POSSIBLE_LINE_FEED), ...(cmd.description || '').split(POSSIBLE_LINE_FEED)]
                : (cmd.description || '').split(POSSIBLE_LINE_FEED);
        }
        if (description) {
            return this.wrap(description.join('\n'));
        }
    }
    examples(examples) {
        if (!examples || examples.length === 0)
            return;
        const body = (0, util_1.castArray)(examples)
            .map((a) => {
            let description;
            let commands;
            if (typeof a === 'string') {
                const lines = a.split(POSSIBLE_LINE_FEED).filter(Boolean);
                // If the example is <description>\n<command> then format correctly
                if (lines.length >= 2 && !this.isCommand(lines[0]) && lines.slice(1).every((i) => this.isCommand(i))) {
                    description = lines[0];
                    commands = lines.slice(1);
                }
                else {
                    return lines.map((line) => this.formatIfCommand(line)).join('\n');
                }
            }
            else {
                description = a.description;
                commands = [a.command];
            }
            const multilineSeparator = this.config.platform === 'win32' ? (this.config.shell.includes('powershell') ? '`' : '^') : '\\';
            // The command will be indented in the section, which is also indented
            const finalIndentedSpacing = this.indentSpacing * 2;
            const multilineCommands = commands
                .map((c) => 
            // First indent keeping room for escaped newlines
            this.indent(this.wrap(this.formatIfCommand(c), finalIndentedSpacing + 4))
                // Then add the escaped newline
                .split(POSSIBLE_LINE_FEED)
                .join(` ${multilineSeparator}\n  `))
                .join('\n');
            return `${this.wrap(description, finalIndentedSpacing)}\n\n${multilineCommands}`;
        })
            .join('\n\n');
        return body;
    }
    flagHelpLabel(flag, showOptions = false) {
        let label = flag.helpLabel;
        if (!label) {
            const labels = [];
            labels.push(flag.char ? `-${flag.char[0]}` : '  ');
            if (flag.name) {
                if (flag.type === 'boolean' && flag.allowNo) {
                    labels.push(`--[no-]${flag.name.trim()}`);
                }
                else {
                    labels.push(`--${flag.name.trim()}`);
                }
            }
            label = labels.join(flag.char ? (0, theme_1.colorize)(this.config?.theme?.flagSeparator, ', ') : '  ');
        }
        if (flag.type === 'option') {
            let value = docopts_1.DocOpts.formatUsageType(flag, this.opts.showFlagNameInTitle ?? false, this.opts.showFlagOptionsInTitle ?? showOptions);
            if (!value.includes('|'))
                value = (0, theme_1.colorize)('underline', value);
            label += `=${value}`;
        }
        return (0, theme_1.colorize)(this.config.theme?.flag, label);
    }
    flags(flags) {
        if (flags.length === 0)
            return;
        const noChar = flags.reduce((previous, current) => previous && current.char === undefined, true);
        // eslint-disable-next-line complexity
        return flags.map((flag) => {
            let left = this.flagHelpLabel(flag);
            if (noChar)
                left = left.replace('    ', '');
            let right = flag.summary || flag.description || '';
            const canBeCached = !(this.opts.respectNoCacheDefault === true && flag.noCacheDefault === true);
            if (flag.type === 'option' && flag.default && canBeCached) {
                right = `${(0, theme_1.colorize)(this.config?.theme?.flagDefaultValue, `[default: ${flag.default}]`)} ${right}`;
            }
            if (flag.required)
                right = `${(0, theme_1.colorize)(this.config?.theme?.flagRequired, '(required)')} ${right}`;
            if (flag.type === 'option' && flag.options && !flag.helpValue && !this.opts.showFlagOptionsInTitle) {
                right += (0, theme_1.colorize)(this.config?.theme?.flagOptions, `\n<options: ${flag.options.join('|')}>`);
            }
            return [left, (0, theme_1.colorize)(this.config?.theme?.sectionDescription, right.trim())];
        });
    }
    flagsDescriptions(flags) {
        const flagsWithExtendedDescriptions = flags.filter((flag) => flag.summary && flag.description);
        if (flagsWithExtendedDescriptions.length === 0)
            return;
        const body = flagsWithExtendedDescriptions
            .map((flag) => {
            // Guaranteed to be set because of the filter above, but make ts happy
            const summary = flag.summary || '';
            let flagHelp = this.flagHelpLabel(flag, true);
            if (!flag.char)
                flagHelp = flagHelp.replace('    ', '');
            flagHelp +=
                flagHelp.length + summary.length + 2 < this.opts.maxWidth
                    ? '  ' + summary
                    : '\n\n' + this.indent(this.wrap(summary, this.indentSpacing * 2));
            return `${flagHelp}\n\n${this.indent(this.wrap(flag.description || '', this.indentSpacing * 2))}`;
        })
            .join('\n\n');
        return body;
    }
    generate() {
        const cmd = this.command;
        const unsortedFlags = Object.entries(cmd.flags || {})
            .filter(([, v]) => !v.hidden)
            .map(([k, v]) => {
            v.name = k;
            return v;
        });
        const flags = determineSortOrder(this.opts.flagSortOrder) === 'alphabetical'
            ? (0, util_1.sortBy)(unsortedFlags, (f) => [!f.char, f.char, f.name])
            : unsortedFlags;
        const args = Object.values((0, ensure_arg_object_1.ensureArgObject)(cmd.args)).filter((a) => !a.hidden);
        const output = (0, util_1.compact)(this.sections().map(({ generate, header }) => {
            const body = generate({ args, cmd, flags }, header);
            // Generate can return a list of sections
            if (Array.isArray(body)) {
                return body
                    .map((helpSection) => helpSection && helpSection.body && this.section(helpSection.header, helpSection.body))
                    .join('\n\n');
            }
            return body && this.section(header, body);
        })).join('\n\n');
        return output;
    }
    groupFlags(flags) {
        const mainFlags = [];
        const flagGroups = {};
        for (const flag of flags) {
            const group = flag.helpGroup;
            if (group) {
                if (!flagGroups[group])
                    flagGroups[group] = [];
                flagGroups[group].push(flag);
            }
            else {
                mainFlags.push(flag);
            }
        }
        return { flagGroups, mainFlags };
    }
    sections() {
        const sections = [
            {
                generate: () => this.usage(),
                header: this.opts.usageHeader || 'USAGE',
            },
            {
                generate: ({ args }, header) => [{ body: this.args(args), header }],
                header: 'ARGUMENTS',
            },
            {
                generate: ({ flags }, header) => {
                    const { flagGroups, mainFlags } = this.groupFlags(flags);
                    const flagSections = [];
                    const mainFlagBody = this.flags(mainFlags);
                    if (mainFlagBody)
                        flagSections.push({ body: mainFlagBody, header });
                    for (const [name, flags] of Object.entries(flagGroups)) {
                        const body = this.flags(flags);
                        if (body)
                            flagSections.push({ body, header: `${name.toUpperCase()} ${header}` });
                    }
                    return (0, util_1.compact)(flagSections);
                },
                header: 'FLAGS',
            },
            {
                generate: () => this.description(),
                header: 'DESCRIPTION',
            },
            {
                generate: ({ cmd }) => this.aliases(cmd.aliases),
                header: 'ALIASES',
            },
            {
                generate: ({ cmd }) => {
                    const examples = cmd.examples || cmd.example;
                    return this.examples(examples);
                },
                header: 'EXAMPLES',
            },
            {
                generate: ({ flags }) => this.flagsDescriptions(flags),
                header: 'FLAG DESCRIPTIONS',
            },
        ];
        const allowedSections = this.opts.sections?.map((s) => s.toLowerCase());
        return sections.filter(({ header }) => !allowedSections || allowedSections.includes(header.toLowerCase()));
    }
    usage() {
        const { id, usage } = this.command;
        const standardId = (0, ids_1.toStandardizedId)(id, this.config);
        const configuredId = (0, ids_1.toConfiguredId)(id, this.config);
        const body = (usage ? (0, util_1.castArray)(usage) : [this.defaultUsage()])
            .map((u) => {
            const allowedSpacing = this.opts.maxWidth - this.indentSpacing;
            const dollarSign = (0, theme_1.colorize)(this.config?.theme?.dollarSign, '$');
            const bin = (0, theme_1.colorize)(this.config?.theme?.bin, this.config.bin);
            const command = (0, theme_1.colorize)(this.config?.theme?.command, '<%= command.id %>');
            const commandDescription = (0, theme_1.colorize)(this.config?.theme?.sectionDescription, u
                .replace('<%= command.id %>', '')
                .replace(new RegExp(`^${standardId}`), '')
                .replace(new RegExp(`^${configuredId}`), '')
                .trim());
            const line = `${dollarSign} ${bin} ${command} ${commandDescription}`.trim();
            if (line.length > allowedSpacing) {
                const splitIndex = line.slice(0, Math.max(0, allowedSpacing)).lastIndexOf(' ');
                return (line.slice(0, Math.max(0, splitIndex)) +
                    '\n' +
                    this.indent(this.wrap(line.slice(Math.max(0, splitIndex)), this.indentSpacing * 2)));
            }
            return this.wrap(line);
        })
            .join('\n');
        return body;
    }
    formatIfCommand(example) {
        example = this.render(example);
        const dollarSign = (0, theme_1.colorize)(this.config?.theme?.dollarSign, '$');
        if (example.startsWith(this.config.bin))
            return `${dollarSign} ${example}`;
        if (example.startsWith(`$ ${this.config.bin}`))
            return `${dollarSign}${example.replace(`$`, '')}`;
        return example;
    }
    isCommand(example) {
        return ansis_1.default
            .strip(this.formatIfCommand(example))
            .startsWith(`${(0, theme_1.colorize)(this.config?.theme?.dollarSign, '$')} ${this.config.bin}`);
    }
}
exports.CommandHelp = CommandHelp;
exports.default = CommandHelp;
