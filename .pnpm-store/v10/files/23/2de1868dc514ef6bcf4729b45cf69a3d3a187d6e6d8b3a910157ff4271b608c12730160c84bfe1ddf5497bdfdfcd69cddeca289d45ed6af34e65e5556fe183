import { SDK_METADATA } from "../lib/config";
import { BeforeRequestContext, BeforeRequestHook, Awaitable } from "./types";

export class CustomUserAgentHook implements BeforeRequestHook {
  beforeRequest(_: BeforeRequestContext, request: Request): Awaitable<Request> {
    const version = SDK_METADATA.sdkVersion;
    const ua = `mistral-client-typescript/${version}`;

    request.headers.set("user-agent", ua);

    // In Chrome, the line above may silently fail. If the header was not set
    // we fallback to setting an alternate header.
    // Chromium bug: https://issues.chromium.org/issues/40450316
    if (!request.headers.get("user-agent")) {
      request.headers.set("x-mistral-user-agent", ua);
    }

    return request;
  }
}
