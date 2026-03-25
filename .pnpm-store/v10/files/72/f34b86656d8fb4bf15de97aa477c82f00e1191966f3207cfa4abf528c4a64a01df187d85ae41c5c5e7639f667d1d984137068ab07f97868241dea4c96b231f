"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ansis_1 = __importDefault(require("ansis"));
const util_1 = require("../util/util");
const theme_1 = require("../ux/theme");
const formatter_1 = require("./formatter");
class RootHelp extends formatter_1.HelpFormatter {
    config;
    opts;
    constructor(config, opts) {
        super(config, opts);
        this.config = config;
        this.opts = opts;
    }
    description() {
        let description = this.config.pjson.oclif.description || this.config.pjson.description || '';
        description = this.render(description);
        description = description.split('\n').slice(1).join('\n');
        if (!description)
            return;
        return this.section('DESCRIPTION', this.wrap((0, theme_1.colorize)(this.config?.theme?.sectionDescription, description)));
    }
    root() {
        let description = this.config.pjson.oclif.description || this.config.pjson.description || '';
        description = this.render(description);
        description = description.split('\n')[0];
        let output = (0, util_1.compact)([
            (0, theme_1.colorize)(this.config?.theme?.commandSummary, description),
            this.version(),
            this.usage(),
            this.description(),
        ]).join('\n\n');
        if (this.opts.stripAnsi)
            output = ansis_1.default.strip(output);
        return output;
    }
    usage() {
        return this.section(this.opts.usageHeader || 'USAGE', this.wrap(`${(0, theme_1.colorize)(this.config?.theme?.dollarSign, '$')} ${(0, theme_1.colorize)(this.config?.theme?.bin, this.config.bin)} ${(0, theme_1.colorize)(this.config?.theme?.sectionDescription, '[COMMAND]')}`));
    }
    version() {
        return this.section('VERSION', this.wrap((0, theme_1.colorize)(this.config?.theme?.version, this.config.userAgent)));
    }
}
exports.default = RootHelp;
