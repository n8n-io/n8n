import { Command } from '../command';
import * as Interfaces from '../interfaces';
import { HelpFormatter, HelpSectionRenderer } from './formatter';
export declare class CommandHelp extends HelpFormatter {
    command: Command.Loadable;
    config: Interfaces.Config;
    opts: Interfaces.HelpOptions;
    constructor(command: Command.Loadable, config: Interfaces.Config, opts: Interfaces.HelpOptions);
    protected aliases(aliases: string[] | undefined): string | undefined;
    protected arg(arg: Command.Arg.Any): string;
    protected args(args: Command.Arg.Any[]): [string, string | undefined][] | undefined;
    protected defaultUsage(): string;
    protected description(): string | undefined;
    protected examples(examples: Command.Example[] | string | undefined): string | undefined;
    protected flagHelpLabel(flag: Command.Flag.Any, showOptions?: boolean): string;
    protected flags(flags: Array<Command.Flag.Any>): [string, string | undefined][] | undefined;
    protected flagsDescriptions(flags: Array<Command.Flag.Any>): string | undefined;
    generate(): string;
    protected groupFlags(flags: Array<Command.Flag.Any>): {
        flagGroups: {
            [name: string]: Array<Command.Flag.Any>;
        };
        mainFlags: Array<Command.Flag.Any>;
    };
    protected sections(): Array<{
        generate: HelpSectionRenderer;
        header: string;
    }>;
    protected usage(): string;
    private formatIfCommand;
    private isCommand;
}
export default CommandHelp;
