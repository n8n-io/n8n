import { createServer, IdentityManager, Model } from "miragejs";

const identityManager = new IdentityManager();

identityManager.get?.(); // $ExpectType number | undefined
identityManager.set("id"); // $ExpectType void
identityManager.inc?.(); // $ExpectType number | undefined
identityManager.fetch(); // $ExpectType string
identityManager.reset(); // $ExpectType void

createServer({
  identityManagers: {
    application: IdentityManager,
  },
});

createServer({
  models: {
    pet: Model.extend({}),
  },
  identityManagers: {
    pet: IdentityManager,
    foo: IdentityManager, // $ExpectError
  },
});
