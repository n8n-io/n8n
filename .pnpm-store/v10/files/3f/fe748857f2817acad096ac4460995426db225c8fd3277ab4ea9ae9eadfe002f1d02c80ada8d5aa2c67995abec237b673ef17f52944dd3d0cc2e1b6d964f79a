import {
  Serializer,
  ActiveModelSerializer,
  JSONAPISerializer,
  RestSerializer,
  Server,
  Model,
  hasMany,
} from "miragejs";

new Server({
  serializers: {
    application: RestSerializer,
    user: RestSerializer.extend({
      // user-specific customizations
    }),
  },
});

new Server({
  serializers: {
    application: JSONAPISerializer,
  },
});

new Server({
  serializers: {
    application: ActiveModelSerializer,
  },
});

new Server({
  serializers: {
    application: Serializer,
  },
});

new Server({
  models: {
    author: Model.extend({
      blogPosts: hasMany(),
    }),
  },
  serializers: {
    author: Serializer.extend({
      include: ["blogPosts"],
    }),
  },
});

Serializer.extend({
  attrs: ["id", "title"],
});

JSONAPISerializer.extend({
  alwaysIncludeLinkageData: true,
});

const ApplicationSerializer = Serializer.extend();

JSONAPISerializer.extend({
  alwaysIncludeLinkageData: true,
});

export default Serializer.extend({
  keyForAttribute(attr) {
    return "key";
  },
});
