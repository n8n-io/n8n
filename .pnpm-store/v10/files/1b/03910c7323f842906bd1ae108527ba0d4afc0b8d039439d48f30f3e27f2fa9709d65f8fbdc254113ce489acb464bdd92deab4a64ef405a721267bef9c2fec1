import DbCollection from "miragejs/db-collection";
import { Server } from "miragejs/server";
import { Registry } from "miragejs";
import { ModelDefinition } from "miragejs/-types";

const server: Server = new Server();

server.db.loadData({
  movies: [
    { title: "Interstellar" },
    { title: "Inception" },
    { title: "Dunkirk" },
  ],
});

const myDb = server.db; // $ExpectType Db

interface Movie {
  title: string;
}

myDb.createCollection("movies", [{ title: "Interstellar" }]); // $ExpectType void
myDb.dump(); // $ExpectType void
myDb.emptyData(); // $ExpectType void
myDb.loadData({}); // $ExpectType void

const dbCollection = new DbCollection("movies", [{ title: "Dunkirk" }]);

myDb.users.find(1); // $ExpectType any
myDb.users.find([1, 2]); // $ExpectType any
myDb.users.findBy({ name: "Link" }); // $ExpectType any
myDb.users.where({ name: "Link" }); // $ExpectType any
myDb.users.insert({}); // $ExpectType any
myDb.users.insert([]); // $ExpectType any
myDb.users.firstOrCreate({ name: "Link" }); // $ExpectType any
myDb.users.remove(); // $ExpectType void
myDb.users.remove(1); // $ExpectType void
myDb.users.remove({ name: "Zelda" }); // $ExpectType void
myDb.users.update({ name: "Ganon" }); // $ExpectType any
myDb.users.update(1, { name: "Young Link" }); // $ExpectType any
myDb.users.update({ name: "Link" }, { name: "Epona" }); // $ExpectType any

type TestModels = {
  movie: ModelDefinition<Movie>;
};

type TestRegistry = Registry<TestModels, {}>;

const testServer = new Server<TestRegistry>();

// There's a problem with dtslint that we can't specify different results for different
// versions of typescript.  The result here will be either `ModelInstance<{ title: string; }> | null`
// or `Instantiate<TestRegistry, "movie"> | null`, depending on TS version.
testServer.schema.findBy("movie", (instance) => instance.title.length > 0);
