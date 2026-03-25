/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import { AccountInfo } from "../../account/AccountInfo.js";
import { LoggerOptions } from "../../config/ClientConfiguration.js";
import { NativeRequest } from "../../request/NativeRequest.js";
import { NativeSignOutRequest } from "../../request/NativeSignOutRequest.js";
import { AuthenticationResult } from "../../response/AuthenticationResult.js";
export interface INativeBrokerPlugin {
    isBrokerAvailable: boolean;
    setLogger(loggerOptions: LoggerOptions): void;
    getAccountById(accountId: string, correlationId: string): Promise<AccountInfo>;
    getAllAccounts(clientId: string, correlationId: string): Promise<AccountInfo[]>;
    acquireTokenSilent(request: NativeRequest): Promise<AuthenticationResult>;
    acquireTokenInteractive(request: NativeRequest, windowHandle?: Buffer): Promise<AuthenticationResult>;
    signOut(request: NativeSignOutRequest): Promise<void>;
}
//# sourceMappingURL=INativeBrokerPlugin.d.ts.map