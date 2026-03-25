// src/adapter/service-worker/handler.ts
var handle = (app, opts = {
  // To use `fetch` on a Service Worker correctly, bind it to `globalThis`.
  fetch: globalThis.fetch.bind(globalThis)
}) => {
  return (evt) => {
    evt.respondWith(
      (async () => {
        const res = await app.fetch(evt.request, {}, evt);
        if (opts.fetch && res.status === 404) {
          return await opts.fetch(evt.request);
        }
        return res;
      })()
    );
  };
};
export {
  handle
};
