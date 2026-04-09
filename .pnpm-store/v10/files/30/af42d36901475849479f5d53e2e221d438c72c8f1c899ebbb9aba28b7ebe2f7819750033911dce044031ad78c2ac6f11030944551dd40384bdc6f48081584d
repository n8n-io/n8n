import { l as HttpRequestEventMap, r as Interceptor } from "./Interceptor-DJ2akVWI.cjs";
import { t as BatchInterceptor } from "./BatchInterceptor-D_YqR8qU.cjs";
import { t as ClientRequestInterceptor } from "./index-BMbJ8FXL.cjs";
import { XMLHttpRequestInterceptor } from "./interceptors/XMLHttpRequest/index.cjs";
import { FetchInterceptor } from "./interceptors/fetch/index.cjs";
import { ChildProcess } from "child_process";

//#region src/RemoteHttpInterceptor.d.ts
interface SerializedRequest {
  id: string;
  url: string;
  method: string;
  headers: Array<[string, string]>;
  credentials: RequestCredentials;
  body: string;
}
interface SerializedResponse {
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  body: string;
}
declare class RemoteHttpInterceptor extends BatchInterceptor<[ClientRequestInterceptor, XMLHttpRequestInterceptor, FetchInterceptor]> {
  constructor();
  protected setup(): void;
}
declare function requestReviver(key: string, value: any): any;
interface RemoveResolverOptions {
  process: ChildProcess;
}
declare class RemoteHttpResolver extends Interceptor<HttpRequestEventMap> {
  static symbol: symbol;
  private process;
  constructor(options: RemoveResolverOptions);
  protected setup(): void;
}
//#endregion
export { RemoteHttpInterceptor, RemoteHttpResolver, RemoveResolverOptions, SerializedRequest, SerializedResponse, requestReviver };
//# sourceMappingURL=RemoteHttpInterceptor.d.cts.map