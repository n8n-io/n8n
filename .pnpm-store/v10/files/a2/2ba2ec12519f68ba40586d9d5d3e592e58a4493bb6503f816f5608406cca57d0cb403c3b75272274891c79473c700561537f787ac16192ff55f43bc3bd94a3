// Deno compatibility patch for @hey-api/client-fetch
// This must be imported before any @hey-api/client-fetch code

if (typeof (globalThis as any).Deno !== "undefined") {
  // Store the original Request constructor
  const OriginalRequest = globalThis.Request;

  // Create a patched Request constructor that strips Deno-incompatible properties
  const PatchedRequest = function (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) {
    if (init && typeof init === "object") {
      const cleanInit = { ...init };
      if ("client" in cleanInit) {
        delete (cleanInit as any).client;
      }
      return new OriginalRequest(input, cleanInit);
    }
    return new OriginalRequest(input, init);
  } as any;

  // Copy over static properties and prototype
  Object.setPrototypeOf(PatchedRequest, OriginalRequest);
  Object.defineProperty(PatchedRequest, "prototype", {
    value: OriginalRequest.prototype,
    writable: false,
  });

  // Replace the global Request constructor
  globalThis.Request = PatchedRequest;
}
