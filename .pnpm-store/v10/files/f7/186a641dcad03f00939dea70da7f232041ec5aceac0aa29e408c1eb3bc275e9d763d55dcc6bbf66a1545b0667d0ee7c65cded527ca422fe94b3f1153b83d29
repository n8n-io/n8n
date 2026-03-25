import { Command } from '../command';
import * as Interfaces from '../interfaces';
import { CommandHelp } from './command';
import { HelpFormatter } from './formatter';
export { CommandHelp } from './command';
export { HelpFormatter, type HelpSection, type HelpSectionKeyValueTable, type HelpSectionRenderer } from './formatter';
export { getHelpFlagAdditions, normalizeArgv, standardizeIDFromArgv } from './util';
export declare abstract class HelpBase extends HelpFormatter {
    constructor(config: Interfaces.Config, opts?: Partial<Interfaces.HelpOptions>);
    /**
     * Show help for an individual command
     * @param command
     * @param topics
     */
    abstract showCommandHelp(command: Command.Loadable, topics: Interfaces.Topic[]): Promise<void>;
    /**
     * Show help, used in multi-command CLIs
     * @param args passed into your command, useful for determining which type of help to display
     */
    abstract showHelp(argv: string[]): Promise<void>;
}
export declare class Help extends HelpBase {
    protected CommandHelpClass: typeof CommandHelp;
    constructor(config: Interfaces.Config, opts?: Partial<Interfaces.HelpOptions>);
    protected get sortedCommands(): Command.Loadable[];
    protected get sortedTopics(): Interfaces.Topic[];
    protected command(command: Command.Loadable): string;
    protected description(c: Command.Loadable): string;
    protected formatCommand(command: Command.Loadable): string;
    protected formatCommands(commands: Array<Command.Loadable>): string;
    protected formatRoot(): string;
    protected formatTopic(topic: Interfaces.Topic): string;
    protected formatTopics(topics: Interfaces.Topic[]): string;
    protected getCommandHelpClass(command: Command.Loadable): CommandHelp;
    protected log(...args: string[]): void;
    showCommandHelp(command: Command.Loadable): Promise<void>;
    showHelp(argv: string[]): Promise<void>;
    protected showRootHelp(): Promise<void>;
    protected showTopicHelp(topic: Interfaces.Topic): Promise<void>;
    protected summary(c: Command.Loadable): string | undefined;
    private get _topics();
}
interface HelpBaseDerived {
    new (config: Interfaces.Config, opts?: Partial<Interfaces.HelpOptions>): HelpBase;
}
export declare function loadHelpClass(config: Interfaces.Config): Promise<HelpBaseDerived>;
