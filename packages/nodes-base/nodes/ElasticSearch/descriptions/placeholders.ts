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
