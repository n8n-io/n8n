export const indexSettings = `{
  "settings": {
    "index": {
      "number_of_shards": 3,
      "number_of_replicas": 2
    }
  }
}`;

export const mappings = `{
  "mappings": {
    "properties": {
      "field1": { "type": "text" }
    }
  }
}`;

export const aliases = `{
  "aliases": {
    "alias_1": {},
    "alias_2": {
      "filter": {
        "term": { "user.id": "kimchy" }
      },
      "routing": "shard-1"
    }
  }
}`;

export const query = `{
  "query": {
    "term": {
      "user.id": "john"
    }
  }
}`;

export const document = `{
  "timestamp": "2099-05-06T16:21:15.000Z",
  "event": {
    "original": "192.0.2.42 - - [06/May/2099:16:21:15 +0000] \"GET /images/bg.jpg HTTP/1.0\" 200 24736"
  }
}`;
