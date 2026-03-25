/**
 * Code samples from the official documentation: "Overview" page
 */
import { belongsTo, Factory, hasMany, Model, Response, Server } from "miragejs";

new Server({
  routes() {
    this.namespace = "api";

    // Responding to a POST request
    this.post("/movies", (schema, request) => {
      const attrs = JSON.parse(request.requestBody);
      attrs.id = Math.floor(Math.random() * 100);

      return { movie: attrs };
    });

    // Using the `timing` option to slow down the response
    this.get(
      "/movies",
      () => {
        return {
          movies: [
            { id: 1, name: "Inception", year: 2010 },
            { id: 2, name: "Interstellar", year: 2014 },
            { id: 3, name: "Dunkirk", year: 2017 },
          ],
        };
      },
      { timing: 4000 }
    );

    // Using the `Response` class to return a 500
    this.delete("/movies/1", () => {
      const headers = {};
      const data = { errors: ["Server did not respond"] };

      return new Response(500, headers, data);
    });
  },
});

new Server({
  models: {
    movie: Model,
  },

  routes() {
    this.namespace = "api";

    this.get("/movies", () => {
      return {
        movies: [
          { id: 1, name: "Inception", year: 2010 },
          { id: 2, name: "Interstellar", year: 2014 },
          { id: 3, name: "Dunkirk", year: 2017 },
        ],
      };
    });
  },

  seeds(server) {
    server.createList("movie", 10);
  },
});

new Server({
  models: {
    movie: Model,
  },

  routes() {
    this.namespace = "api";

    this.get("/movies");
    this.get("/movies/:id");
    this.post("/movies");
    this.patch("/movies/:id");
    this.del("/movies/:id");
  },

  factories: {
    movie: Factory.extend({
      title(i: number) {
        return `Movie ${i}`; // Movie 1, Movie 2, etc.
      },

      year() {
        const min = 1950;
        const max = 2019;

        return Math.floor(Math.random() * (max - min + 1)) + min;
      },

      rating: "PG-13",
    }),
  },
});

new Server({
  models: {
    movie: Model.extend({
      castMembers: hasMany(),
    }),
    castMember: Model.extend({
      movie: belongsTo(),
    }),
  },
  routes() {
    this.get("/movies/:id/cast-members", (schema, request) => {
      const movie = schema.db.movies.find(request.params.id);

      return movie.castMembers;
    });
  },
});
