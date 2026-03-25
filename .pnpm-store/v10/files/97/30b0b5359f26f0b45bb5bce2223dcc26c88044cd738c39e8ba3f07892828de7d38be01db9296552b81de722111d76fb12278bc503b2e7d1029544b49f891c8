"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Help = exports.HelpBase = exports.standardizeIDFromArgv = exports.normalizeArgv = exports.getHelpFlagAdditions = exports.HelpFormatter = exports.CommandHelp = void 0;
exports.loadHelpClass = loadHelpClass;
const ansis_1 = __importDefault(require("ansis"));
const ts_path_1 = require("../config/ts-path");
const error_1 = require("../errors/error");
const module_loader_1 = require("../module-loader");
const symbols_1 = require("../symbols");
const cache_default_value_1 = require("../util/cache-default-value");
const ids_1 = require("../util/ids");
const util_1 = require("../util/util");
const ux_1 = require("../ux");
const theme_1 = require("../ux/theme");
const command_1 = require("./command");
const formatter_1 = require("./formatter");
const root_1 = __importDefault(require("./root"));
const util_2 = require("./util");
var command_2 = require("./command");
Object.defineProperty(exports, "CommandHelp", { enumerable: true, get: function () { return command_2.CommandHelp; } });
var formatter_2 = require("./formatter");
Object.defineProperty(exports, "HelpFormatter", { enumerable: true, get: function () { return formatter_2.HelpFormatter; } });
var util_3 = require("./util");
Object.defineProperty(exports, "getHelpFlagAdditions", { enumerable: true, get: function () { return util_3.getHelpFlagAdditions; } });
Object.defineProperty(exports, "normalizeArgv", { enumerable: true, get: function () { return util_3.normalizeArgv; } });
Object.defineProperty(exports, "standardizeIDFromArgv", { enumerable: true, get: function () { return util_3.standardizeIDFromArgv; } });
function getHelpSubject(args, config) {
    // for each help flag that starts with '--' create a new flag with same name sans '--'
    const mergedHelpFlags = (0, util_2.getHelpFlagAdditions)(config);
    for (const arg of args) {
        if (arg === '--')
            return;
        if (mergedHelpFlags.includes(arg) || arg === 'help')
            continue;
        if (arg.startsWith('-'))
            return;
        return arg;
    }
}
class HelpBase extends formatter_1.HelpFormatter {
    constructor(config, opts = {}) {
        super(config, opts);
        if (!config.topicSeparator)
            config.topicSeparator = ':'; // back-support @oclif/config
    }
}
exports.HelpBase = HelpBase;
class Help extends HelpBase {
    CommandHelpClass = command_1.CommandHelp;
    constructor(config, opts = {}) {
        super(config, opts);
    }
    /*
     * _topics is to work around Interfaces.topics mistakenly including commands that do
     * not have children, as well as topics. A topic has children, either commands or other topics. When
     * this is fixed upstream config.topics should return *only* topics with children,
     * and this can be removed.
     */
    get _topics() {
        return this.config.topics.filter((topic) => {
            // it is assumed a topic has a child if it has children
            const hasChild = this.config.topics.some((subTopic) => subTopic.name.includes(`${topic.name}:`));
            return hasChild;
        });
    }
    get sortedCommands() {
        let { commands } = this.config;
        commands = commands.filter((c) => this.opts.all || !c.hidden);
        commands = (0, util_1.sortBy)(commands, (c) => c.id);
        commands = (0, util_1.uniqBy)(commands, (c) => c.id);
        return commands;
    }
    get sortedTopics() {
        let topics = this._topics;
        topics = topics.filter((t) => this.opts.all || !t.hidden);
        topics = (0, util_1.sortBy)(topics, (t) => t.name);
        topics = (0, util_1.uniqBy)(topics, (t) => t.name);
        return topics;
    }
    command(command) {
        return this.formatCommand(command);
    }
    description(c) {
        const description = this.render(c.description || '');
        if (c.summary) {
            return description;
        }
        return description.split('\n').slice(1).join('\n');
    }
    formatCommand(command) {
        if (this.config.topicSeparator !== ':') {
            command.id = command.id.replaceAll(':', this.config.topicSeparator);
            command.aliases = command.aliases && command.aliases.map((a) => a.replaceAll(':', this.config.topicSeparator));
        }
        const help = this.getCommandHelpClass(command);
        return help.generate();
    }
    formatCommands(commands) {
        if (commands.length === 0)
            return '';
        const body = this.renderList(commands
            .filter((c) => (this.opts.hideAliasesFromRoot ? !c.aliases?.includes(c.id) : true))
            .map((c) => {
            if (this.config.topicSeparator !== ':')
                c.id = c.id.replaceAll(':', this.config.topicSeparator);
            const summary = this.summary(c);
            return [
                (0, theme_1.colorize)(this.config?.theme?.command, c.id),
                summary && (0, theme_1.colorize)(this.config?.theme?.sectionDescription, ansis_1.default.strip(summary)),
            ];
        }), {
            indentation: 2,
            spacer: '\n',
            stripAnsi: this.opts.stripAnsi,
        });
        return this.section('COMMANDS', body);
    }
    formatRoot() {
        const help = new root_1.default(this.config, this.opts);
        return help.root();
    }
    formatTopic(topic) {
        let description = this.render(topic.description || '');
        const summary = description.split('\n')[0];
        description = description.split('\n').slice(1).join('\n');
        let topicID = `${topic.name}:COMMAND`;
        if (this.config.topicSeparator !== ':')
            topicID = topicID.replaceAll(':', this.config.topicSeparator);
        let output = (0, util_1.compact)([
            (0, theme_1.colorize)(this.config?.theme?.commandSummary, summary),
            this.section(this.opts.usageHeader || 'USAGE', `${(0, theme_1.colorize)(this.config?.theme?.dollarSign, '$')} ${(0, theme_1.colorize)(this.config?.theme?.bin, this.config.bin)} ${topicID}`),
            description &&
                this.section('DESCRIPTION', this.wrap((0, theme_1.colorize)(this.config?.theme?.sectionDescription, description))),
        ]).join('\n\n');
        if (this.opts.stripAnsi)
            output = ansis_1.default.strip(output);
        return output + '\n';
    }
    formatTopics(topics) {
        if (topics.length === 0)
            return '';
        const body = this.renderList(topics.map((c) => {
            if (this.config.topicSeparator !== ':')
                c.name = c.name.replaceAll(':', this.config.topicSeparator);
            return [
                (0, theme_1.colorize)(this.config?.theme?.topic, c.name),
                c.description && this.render((0, theme_1.colorize)(this.config?.theme?.sectionDescription, c.description.split('\n')[0])),
            ];
        }), {
            indentation: 2,
            spacer: '\n',
            stripAnsi: this.opts.stripAnsi,
        });
        return this.section('TOPICS', body);
    }
    getCommandHelpClass(command) {
        return new this.CommandHelpClass(command, this.config, this.opts);
    }
    log(...args) {
        return this.opts.sendToStderr ? ux_1.ux.stderr(args) : ux_1.ux.stdout(args);
    }
    async showCommandHelp(command) {
        const name = command.id;
        const depth = name.split(':').length;
        const subTopics = this.sortedTopics.filter((t) => t.name.startsWith(name + ':') && t.name.split(':').length === depth + 1);
        const subCommands = this.sortedCommands.filter((c) => c.id.startsWith(name + ':') && c.id.split(':').length === depth + 1);
        const plugin = this.config.plugins.get(command.pluginName);
        const state = this.config.pjson?.oclif?.state || plugin?.pjson?.oclif?.state || command.state;
        if (state) {
            this.log(state === 'deprecated'
                ? `${(0, util_2.formatCommandDeprecationWarning)((0, ids_1.toConfiguredId)(name, this.config), command.deprecationOptions)}\n`
                : `This command is in ${state}.\n`);
        }
        if (command.deprecateAliases && command.aliases.includes(name)) {
            const actualCmd = this.config.commands.find((c) => c.aliases.includes(name));
            const actualCmdName = actualCmd ? (0, ids_1.toConfiguredId)(actualCmd.id, this.config) : '';
            const opts = { ...command.deprecationOptions, ...(actualCmd ? { to: actualCmdName } : {}) };
            this.log(`${(0, util_2.formatCommandDeprecationWarning)((0, ids_1.toConfiguredId)(name, this.config), opts)}\n`);
        }
        const summary = this.summary(command);
        if (summary) {
            this.log(summary + '\n');
        }
        this.log(this.formatCommand(command));
        this.log('');
        if (subTopics.length > 0) {
            this.log(this.formatTopics(subTopics));
            this.log('');
        }
        if (subCommands.length > 0) {
            const aliases = [];
            const uniqueSubCommands = subCommands.filter((p) => {
                aliases.push(...p.aliases);
                return !aliases.includes(p.id);
            });
            this.log(this.formatCommands(uniqueSubCommands));
            this.log('');
        }
    }
    async showHelp(argv) {
        const originalArgv = argv.slice(1);
        argv = argv.filter((arg) => !(0, util_2.getHelpFlagAdditions)(this.config).includes(arg));
        if (this.config.topicSeparator !== ':')
            argv = (0, util_2.standardizeIDFromArgv)(argv, this.config);
        const subject = getHelpSubject(argv, this.config);
        if (!subject) {
            if (this.config.isSingleCommandCLI) {
                const rootCmd = this.config.findCommand(symbols_1.SINGLE_COMMAND_CLI_SYMBOL);
                if (rootCmd) {
                    // set the command id to an empty string to prevent the
                    // SINGLE_COMMAND_CLI_SYMBOL from being displayed in the help output
                    rootCmd.id = '';
                    await this.showCommandHelp(rootCmd);
                    return;
                }
            }
            await this.showRootHelp();
            return;
        }
        const command = this.config.findCommand(subject);
        if (command) {
            if (command.id === symbols_1.SINGLE_COMMAND_CLI_SYMBOL) {
                // If the command is the root command of a single command CLI,
                // then set the command id to an empty string to prevent the
                // the SINGLE_COMMAND_CLI_SYMBOL from being displayed in the help output.
                command.id = '';
            }
            if (command.hasDynamicHelp && command.pluginType !== 'jit') {
                const loaded = await command.load();
                for (const [name, flag] of Object.entries(loaded.flags ?? {})) {
                    // As of v3 each flag that needs to be re-evaluated has the `hasDynamicHelp` property.
                    // However, we cannot assume that the absence of this property means that the flag
                    // doesn't need to be re-evaluated since any command from a v2 or older plugin will
                    // not have the `hasDynamicHelp` property on it.
                    // In the future we could improve performance by skipping any flag that doesn't
                    // have `hasDynamicHelp === true`
                    if (flag.type === 'boolean')
                        continue;
                    // eslint-disable-next-line no-await-in-loop
                    command.flags[name].default = await (0, cache_default_value_1.cacheDefaultValue)(flag, false);
                }
                await this.showCommandHelp(command);
            }
            else {
                await this.showCommandHelp(command);
            }
            return;
        }
        const topic = this.config.findTopic(subject);
        if (topic) {
            await this.showTopicHelp(topic);
            return;
        }
        if (this.config.flexibleTaxonomy) {
            const matches = this.config.findMatches(subject, originalArgv);
            if (matches.length > 0) {
                const result = await this.config.runHook('command_incomplete', {
                    argv: originalArgv.filter((o) => !subject.split(':').includes(o)),
                    id: subject,
                    matches,
                });
                if (result.successes.length > 0)
                    return;
            }
        }
        (0, error_1.error)(`Command ${subject} not found.`);
    }
    async showRootHelp() {
        let rootTopics = this.sortedTopics;
        let rootCommands = this.sortedCommands;
        const state = this.config.pjson?.oclif?.state;
        if (state) {
            this.log(state === 'deprecated' ? `${this.config.bin} is deprecated` : `${this.config.bin} is in ${state}.\n`);
        }
        this.log(this.formatRoot());
        this.log('');
        if (!this.opts.all) {
            rootTopics = rootTopics.filter((t) => !t.name.includes(':'));
            rootCommands = rootCommands.filter((c) => !c.id.includes(':'));
        }
        if (rootTopics.length > 0) {
            this.log(this.formatTopics(rootTopics));
            this.log('');
        }
        if (rootCommands.length > 0) {
            rootCommands = rootCommands.filter((c) => c.id);
            this.log(this.formatCommands(rootCommands));
            this.log('');
        }
    }
    async showTopicHelp(topic) {
        const { name } = topic;
        const depth = name.split(':').length;
        const subTopics = this.sortedTopics.filter((t) => t.name.startsWith(name + ':') && t.name.split(':').length === depth + 1);
        const commands = this.sortedCommands.filter((c) => c.id.startsWith(name + ':') && c.id.split(':').length === depth + 1);
        const state = this.config.pjson?.oclif?.state;
        if (state)
            this.log(`This topic is in ${state}.\n`);
        this.log(this.formatTopic(topic));
        if (subTopics.length > 0) {
            this.log(this.formatTopics(subTopics));
            this.log('');
        }
        if (commands.length > 0) {
            this.log(this.formatCommands(commands));
            this.log('');
        }
    }
    summary(c) {
        if (this.opts.sections && !this.opts.sections.map((s) => s.toLowerCase()).includes('summary'))
            return;
        if (c.summary)
            return (0, theme_1.colorize)(this.config?.theme?.commandSummary, this.render(c.summary.split('\n')[0]));
        return c.description && (0, theme_1.colorize)(this.config?.theme?.commandSummary, this.render(c.description).split('\n')[0]);
    }
}
exports.Help = Help;
function extractClass(exported) {
    return exported && exported.default ? exported.default : exported;
}
function determineLocation(helpClass) {
    if (typeof helpClass === 'string')
        return { identifier: 'default', target: helpClass };
    if (!helpClass.identifier)
        return { ...helpClass, identifier: 'default' };
    return helpClass;
}
async function loadHelpClass(config) {
    if (config.pjson.oclif?.helpClass) {
        const { identifier, target } = determineLocation(config.pjson.oclif?.helpClass);
        try {
            const path = (await (0, ts_path_1.tsPath)(config.root, target)) ?? target;
            const module = await (0, module_loader_1.load)(config, path);
            const helpClass = module[identifier] ?? (identifier === 'default' ? extractClass(module) : undefined);
            return extractClass(helpClass);
        }
        catch (error) {
            throw new Error(`Unable to load configured help class "${target}", failed with message:\n${error.message}`);
        }
    }
    return Help;
}
