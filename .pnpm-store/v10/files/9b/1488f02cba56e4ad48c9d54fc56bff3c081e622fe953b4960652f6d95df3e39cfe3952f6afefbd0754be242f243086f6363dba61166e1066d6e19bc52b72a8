import { AuthResult } from "./AuthResult.js";
import { AccountContext } from "./BridgeAccountContext.js";
import { BridgeCapabilities } from "./BridgeCapabilities.js";
import { TokenRequest } from "./TokenRequest.js";
export interface IBridgeProxy {
    getTokenInteractive(request: TokenRequest): Promise<AuthResult>;
    getTokenSilent(request: TokenRequest): Promise<AuthResult>;
    getHostCapabilities(): BridgeCapabilities | null;
    getAccountContext(): AccountContext | null;
}
//# sourceMappingURL=IBridgeProxy.d.ts.map