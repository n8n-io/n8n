export interface HelpOptions {
    all?: boolean;
    /**
     * Use docopts as the usage. Defaults to true.
     */
    docopts?: boolean;
    /**
     * Order in which to sort flags in help output. Defaults to `alphabetical`.
     *
     * `alphabetical`: Sort flags alphabetically. All flags with short characters will come first.
     * `none`: Do not sort flags. They will appear in the order in which they were defined on the command.
     */
    flagSortOrder?: 'alphabetical' | 'none';
    /**
     * If true, hide command aliases from the root help output. Defaults to false.
     */
    hideAliasesFromRoot?: boolean;
    /**
     * By default, the command summary is show at the top of the help and as the first line in
     * the command description. Repeating the summary in the command description improves readability
     * especially for long command help output. If there is no `command.summary`, the first line of
     * the description is treated as the summary. Some CLIs, especially with very simple commands, may
     * not want the duplication.
     */
    hideCommandSummaryInDescription?: boolean;
    maxWidth: number;
    /**
     * Only show the help for the specified sections. Defaults to all sections.
     */
    sections?: string[];
    /**
     * By default, the help output is sent to stdout. If this is true, it will be sent to stderr.
     */
    sendToStderr?: boolean;
    /**
     * By default, titles show flag values as `<value>`. Some CLI developers may prefer titles
     * to show the flag name as the value. i.e. `--myflag=myflag` instead of `--myflag=<value>`.
     * An individual flag can set this using `flag.helpValue=flag.name`.
     */
    showFlagNameInTitle?: boolean;
    /**
     * By default, option values on flags are shown in the flag's description. This is because
     * long options list ruin the formatting of help. If a CLI knows all commands will not
     * do this, it can be turned off at a help level using this property. An individual flag
     * can set this using `flag.helpValue=options.join('|')`.
     */
    showFlagOptionsInTitle?: boolean;
    stripAnsi?: boolean;
    /**
     * Use USAGE, but some may want to use USAGE as used in gnu man pages. See help recommendations at
     * http://www.gnu.org/software/help2man/#--help-recommendations
     */
    usageHeader?: string;
}
