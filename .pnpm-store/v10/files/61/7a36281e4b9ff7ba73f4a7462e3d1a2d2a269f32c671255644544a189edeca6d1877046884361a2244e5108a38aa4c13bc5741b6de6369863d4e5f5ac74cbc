import Connection from '../connection/index.js';
import { DbVersionProvider } from '../utils/dbVersion.js';
import { CommandBase } from '../validation/commandBase.js';
export default class ReadyChecker extends CommandBase {
    private dbVersionProvider;
    constructor(client: Connection, dbVersionProvider: DbVersionProvider);
    validate(): void;
    do: () => Promise<boolean>;
}
