import { Factory, Model, Registry } from "miragejs";
import Schema from "miragejs/orm/schema";

const FooModel = Model.extend({
  attr: "text",
});

const FooFactory = Factory.extend({
  attr: "text",
});

declare const schema: Schema<
  Registry<{ foo: typeof FooModel }, { foo: typeof FooFactory }>
>;

schema.create("foo").attr; // $ExpectType string
schema.create("foo", { attr: "ok" }).attr; // $ExpectType string
schema.create("foo", { attr: 123 }); // $ExpectError
schema.create("foo", { x: true }); // $ExpectError
schema.create("cow"); // $ExpectError

schema.find("foo", "123")?.attr; // $ExpectType string | undefined
schema.find("foo", ["123"]).models[0].attr; // $ExpectType string
schema.find("cow", "123"); // $ExpectError

schema.findOrCreateBy("foo", { attr: "hi" }).attr; // $ExpectType string
schema.findOrCreateBy("foo", { bar: true }); // $ExpectError
schema.findOrCreateBy("cow", { attr: "bar" }); // $ExpectError

schema.where("foo", { attr: "bar" }).models[0].attr; // $ExpectType string
schema.where("foo", { bar: true }); // $ExpectError
schema.where("foo", (foo) => foo.attr === "ok").models[0].attr; // $ExpectType string
schema.where("foo", (foo) => foo.x === "ok"); // $ExpectError
schema.where("cow", { attr: "bar" }); // $ExpectError

schema.all("foo").models[0].attr; // $ExpectType string
schema.all("cow"); // $ExpectError

schema.none("foo").models[0].attr; // $ExpectType string
schema.none("cow"); // $ExpectError

schema.first("foo")?.attr; // $ExpectType string | undefined
schema.first("cow"); // $ExpectError
