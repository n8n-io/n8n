import Connection from '../connection/index.js';
export interface ICommandBase {
    /**
     * The client's connection
     */
    client: Connection;
    /**
     * An array of validation errors
     */
    errors: string[];
    /**
     * Execute the command
     */
    do: () => Promise<any>;
    /**
     * Optional method to build the payload of an actual call
     */
    payload?: () => any;
    /**
     * validate that all the required parameters were feed to the builder
     */
    validate: () => void;
}
export declare abstract class CommandBase implements ICommandBase {
    private _errors;
    readonly client: Connection;
    protected constructor(client: Connection);
    get errors(): string[];
    addError(error: string): void;
    addErrors(errors: string[]): void;
    abstract do(): Promise<any>;
    abstract validate(): void;
}
