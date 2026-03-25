import { Handler, MiddlewareStack } from "./middleware";
import { MetadataBearer } from "./response";
/**
 * @public
 */
export interface Command<ClientInput extends object, InputType extends ClientInput, ClientOutput extends MetadataBearer, OutputType extends ClientOutput, ResolvedConfiguration> extends CommandIO<InputType, OutputType> {
    readonly input: InputType;
    readonly middlewareStack: MiddlewareStack<InputType, OutputType>;
    /**
     * This should be OperationSchema from @smithy/types, but would
     * create problems with the client transform type adaptors.
     */
    readonly schema?: any;
    resolveMiddleware(stack: MiddlewareStack<ClientInput, ClientOutput>, configuration: ResolvedConfiguration, options: any): Handler<InputType, OutputType>;
}
/**
 * @internal
 *
 * This is a subset of the Command type used only to detect the i/o types.
 */
export interface CommandIO<InputType extends object, OutputType extends MetadataBearer> {
    readonly input: InputType;
    resolveMiddleware(stack: any, configuration: any, options: any): Handler<InputType, OutputType>;
}
/**
 * @internal
 */
export type GetOutputType<Command> = Command extends CommandIO<any, infer O> ? O : never;
