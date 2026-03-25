import { Command } from '../command';
/**
 * DocOpts - See http://docopt.org/.
 *
 * flag.exclusive: groups elements when one of the mutually exclusive cases is a required flag: (--apple | --orange)
 * flag.exclusive: groups elements when none of the mutually exclusive cases is required (optional flags): [--apple | --orange]
 * flag.dependsOn: specifies that if one element is present, then another one is required: (--apple --orange)
 *
 * @example
 *  {
 *      name: 'classnames',
 *      required: true,
 *      exclusive: ['suitenames']
 *      ...
 *  },{
 *      name: 'suitenames',
 *      type: 'array'
 *      required: true
 *      ...
 *  }
 *
 *  Results in:
 *      Usage: <%= command.id %> (-n <string> | -s <array>)
 *
 * @example
 *  {
 *      name: 'classnames',
 *      ...
 *      excludes: ['suitenames']
 *  },{
 *      name: 'suitenames',
 *      ...
 *  }
 *
 *  Results in:
 *      Usage: <%= command.id %> [-n <string> | -s <string>]
 *
 * @example
 *  {
 *      name: 'classnames',
 *      ...
 *      dependsOn: ['suitenames']
 *  },{
 *      name: 'suitenames',
 *      type: 'flag'
 *      ...
 *  }
 *
 *  Results in:
 *      Usage: <%= command.id %> (-n <string> -s)
 *
 * TODO:
 *  - Support nesting, eg:
 *      Usage: my_program (--either-this <and-that> | <or-this>)
 *      Usage: my_program [(<one-argument> <another-argument>)]
 *
 */
export declare class DocOpts {
    private cmd;
    private flagList;
    private flagMap;
    constructor(cmd: Command.Loadable);
    static formatUsageType(flag: Command.Flag.Any, showFlagName: boolean, showOptions: boolean): string;
    static generate(cmd: Command.Loadable): string;
    toString(): string;
    private combineElementsToFlag;
    private generateElements;
    private groupFlagElements;
}
