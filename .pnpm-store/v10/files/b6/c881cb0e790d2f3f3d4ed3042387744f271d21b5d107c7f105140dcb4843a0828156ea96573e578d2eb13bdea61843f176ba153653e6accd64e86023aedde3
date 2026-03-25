import { Collection } from "miragejs";

type ModelType = { name: string };

const collection = new Collection<ModelType>();

collection.add({ name: "Bob" }); // $ExpectType Collection<ModelType>
collection.add({ err: "err" }); // $ExpectError

collection.destroy(); // $ExpectType Collection<ModelType>

collection.filter((item) => item.name === "Bob"); // $ExpectType Collection<ModelType>
collection.filter((item) => item.err === "Err"); // $ExpectError

collection.includes({ name: "Bob" }); // $ExpectType boolean
collection.includes({ err: "err" }); // $ExpectError

collection.mergeCollection(new Collection<ModelType>()); // $ExpectType Collection<ModelType>
collection.mergeCollection(new Collection<{ err: string }>()); // $ExpectError

collection.reload(); // $ExpectType Collection<ModelType>

collection.remove({ name: "Bob" }); // $ExpectType Collection<ModelType>
collection.remove({ err: "Err" }); // $ExpectError

collection.save(); // $ExpectType Collection<ModelType>

collection.slice(0, 1); // $ExpectType Collection<ModelType>

// $ExpectType Collection<ModelType>
collection.sort((a, b) => {
  return a.name.localeCompare(b.name);
});
collection.sort((a, b) => {
  return a.err.localeCompare(b.err); // $ExpectError
});

collection.update("name", "John"); // $ExpectType Collection<ModelType>
collection.update("name", new Date()); // $ExpectError
collection.update("err", "err"); // $ExpectError
