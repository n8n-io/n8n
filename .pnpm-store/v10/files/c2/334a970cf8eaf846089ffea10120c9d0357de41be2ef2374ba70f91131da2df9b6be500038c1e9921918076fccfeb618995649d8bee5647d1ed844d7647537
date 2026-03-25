import { FlagInput } from './parser';
/**
 * Infer the flags that are returned by Command.parse. This is useful for when you want to assign the flags as a class property.
 *
 * @example
 * export type StatusFlags = Interfaces.InferredFlags<typeof Status.flags && typeof Status.baseFlags>
 *
 * export abstract class BaseCommand extends Command {
 *   static enableJsonFlag = true
 *
 *   static flags = {
 *     config: Flags.string({
 *       description: 'specify config file',
 *     }),
 *   }
 * }
 *
 * export default class Status extends BaseCommand {
 *   static flags = {
 *     force: Flags.boolean({char: 'f', description: 'a flag'}),
 *   }
 *
 *   public flags!: StatusFlags
 *
 *   public async run(): Promise<StatusFlags> {
 *     const result = await this.parse(Status)
 *     this.flags = result.flags
 *     return result.flags
 *   }
 * }
 */
export type InferredFlags<T> = T extends FlagInput<infer F> ? F & {
    json: boolean | undefined;
} : unknown;
