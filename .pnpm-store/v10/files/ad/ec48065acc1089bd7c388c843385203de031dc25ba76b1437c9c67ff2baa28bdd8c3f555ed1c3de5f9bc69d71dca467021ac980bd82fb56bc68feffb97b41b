// Minimum TypeScript Version: 4.2
import {
  Response,
  Server,
  JSONAPISerializer,
  createServer,
  Model,
  belongsTo,
  hasMany,
  Factory,
} from "miragejs";

export default function config(this: Server): void {
  this.namespace = "foo";
  this.urlPrefix = "/api";
  this.timing = 123;
  this.logging = true;

  this.get("/foo"); // $ExpectType void
  this.put("/foo"); // $ExpectType void
  this.post("/foo"); // $ExpectType void
  this.patch("/foo"); // $ExpectType void
  this.options("/foo"); // $ExpectType void
  this.del("/foo"); // $ExpectType void

  this.get("/foo", () => ({}));
  this.get("/foo", () => 0);
  this.get("/foo", () => "foo");
  this.get("/foo", () => true);
  this.get("/foo", () => null);
  this.get("/foo", () => ["foo"]);
  this.get("/foo", () => ["foo", 0]);
  this.get<number>("/foo", () => 0);
  this.get<[number, string]>("/foo", () => [0, "foo"]);

  this.get<number>("/foo", () => false); // $ExpectError
  this.get<[number, string]>("/foo", () => ["foo", 0]); // $ExpectError

  this.resource("foo"); // $ExpectType void

  this.passthrough("/_coverage/upload"); // $ExpectType void
  this.passthrough("/_coverage/upload_a", "/_coverage/upload_b"); // $ExpectType void
  this.passthrough(["/_coverage/upload"]); // $ExpectError
  this.passthrough((request) => request.queryParams.skipMirage); // $ExpectType void
  this.passthrough("/_coverage/upload", ["get"]); // $ExpectType void
  // prettier-ignore
  this.passthrough("/_coverage/upload", (request) => request.queryParams.skipMirage); // $ExpectType void
  // prettier-ignore
  this.passthrough("/_coverage/upload", (request) => request.queryParams.skipMirage, ["post"]); // $ExpectType void

  this.loadFixtures(); // $ExpectType void
  this.seeds(this); // $ExpectType void
  this.routes(); // $ExpectType void

  this.shutdown(); // $ExpectType void

  this.get("/test/:segment", (schema, request) => {
    schema.db; // $ExpectType Db

    request.params; // $ExpectType Record<string, string>
    request.queryParams; // $ExpectType Record<string, string | string[] | null | undefined>
    request.requestBody; // $ExpectType string
    request.requestHeaders; // $ExpectType Record<string, string>
    request.url; // $ExpectType string

    return new Response(200, { "Content-Type": "application/json" }, "{}");
  });

  this.get("/test/:segment", (schema) => Promise.resolve(schema.create("foo"))); // $ExpectType void
}

// In `new Server`, models and factories are untyped, and you can
// therefore use any model names you want when interacting with the
// schema; the return values just won't necessarily have a lot of
// type information.
new Server({
  serializers: {
    application: JSONAPISerializer,
  },
  fixtures: {
    countries: [
      { id: 1, name: "China" },
      { id: 2, name: "India" },
      { id: 3, name: "United States" },
    ],
  },
  routes() {
    this.namespace = "api";

    this.schema.all("asfd");

    this.get("/todos", () => {
      return {
        todos: [{ id: "1", text: "Migrate to TypeScript", isDone: false }],
      };
    });
  },

  baseConfig() {
    this.pretender.handledRequest = (verb, path, request) => {};
    this.get("/contacts", () => {
      return ["Interstellar", "Inception", "Dunkirk"];
    });
  },

  testConfig() {
    this.namespace = "/test-api";
    this.get("/movies");
    this.post("/movies");
  },
});

// In contrast to `new Server`, `createServer` is able to infer
// type info from the models and factories you pass it
createServer({
  models: {
    pet: Model.extend({
      owner: belongsTo("person"),
    }),
    person: Model.extend({
      children: hasMany("person"),
      friends: hasMany<"person" | "pet">({ polymorphic: true }),
    }),
  },

  factories: {
    pet: Factory.extend({
      name: (n: number) => `Pet ${n}`,
    }),
    person: Factory.extend({
      name: (n: number) => `Pet ${n}`,
    }),
  },

  routes() {
    this.get("people/:id", (schema, request) => {
      let person = this.schema.find("person", request.params.id);

      person?.name; // $ExpectType string | undefined

      let friend = person?.friends.models[0];

      friend?.name; // $ExpectType string | undefined
      friend?.children; // $ExpectError

      if (friend && "friends" in friend) {
        friend.children.modelName; // $ExpectType string
      }

      return person ?? new Response(404);
    });

    this.get("bad", () => {
      return this.schema.all("typo"); // $ExpectError
    });
  },
});
