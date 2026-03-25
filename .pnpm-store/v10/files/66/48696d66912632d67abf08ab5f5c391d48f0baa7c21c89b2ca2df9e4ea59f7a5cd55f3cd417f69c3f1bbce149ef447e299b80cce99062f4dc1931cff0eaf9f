## chromadb

Chroma is the open-source embedding database. Chroma makes it easy to build LLM apps by making knowledge, facts, and skills pluggable for LLMs.

This package gives you a JS/TS interface to talk to a backend Chroma DB over REST.

[Learn more about Chroma](https://github.com/chroma-core/chroma)

- [💬 Community Discord](https://discord.gg/MMeYNTmh3x)
- [📖 Documentation](https://docs.trychroma.com/)
- [💡 Colab Example](https://colab.research.google.com/drive/1QEzFyqnoFxq7LUGyP1vzR4iLt9PpCDXv?usp=sharing)
- [🏠 Homepage](https://www.trychroma.com/)

## Chroma Cloud

Our hosted service, Chroma Cloud, powers serverless vector and full-text search. It's extremely fast, cost-effective, scalable and painless. Create a DB and try it out in under 30 seconds with $5 of free credits.

[Get started with Chroma Cloud](https://trychroma.com/signup)

## Getting started

First, start a Chroma server using the Chroma CLI:

```bash
chroma run
```

See more examples on our [docs](https://docs.trychroma.com/docs/overview/getting-started)

## Small example

```js
import { ChromaClient } from "chromadb";

const chroma = new ChromaClient();
const collection = await chroma.createCollection({ name: "test-from-js" });
for (let i = 0; i < 20; i++) {
  await collection.add({
    ids: ["test-id-" + i.toString()],
    embeddings: [[1, 2, 3, 4, 5]],
    documents: ["test"],
  });
}
const queryData = await collection.query({
  queryEmbeddings: [[1, 2, 3, 4, 5]],
  queryTexts: ["test"],
});
```

## Local development

[View the Development Readme](./DEVELOP.md)

## License

Apache 2.0
