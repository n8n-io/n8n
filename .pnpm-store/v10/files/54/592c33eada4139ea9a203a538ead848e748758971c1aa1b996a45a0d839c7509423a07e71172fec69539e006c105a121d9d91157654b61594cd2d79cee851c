import { ArgInput } from './parser';
/**
 * Infer the args that are returned by Command.parse. This is useful for when you want to assign the args as a class property.
 *
 * @example
 * export type StatusArgs = Interfaces.InferredArgs<typeof Status.args>
 *
 * export default class Status {
 *   static args = {
 *     force: Args.boolean({char: 'f', description: 'a flag'}),
 *   }
 *
 *   public args!: StatusArgs
 *
 *   public async run(): Promise<StatusArgs> {
 *     const result = await this.parse(Status)
 *     this.args = result.args
 *     return result.args
 *   }
 * }
 */
export type InferredArgs<T> = T extends ArgInput<infer F> ? F : unknown;
