# @langchain/langgraph-checkpoint

This library defines the base interface for [LangGraph.js](https://github.com/langchain-ai/langgraphjs) checkpointers. Checkpointers provide persistence layer for LangGraph. They allow you to interact with and manage the graph's state. When you use a graph with a checkpointer, the checkpointer saves a _checkpoint_ of the graph state at every superstep, enabling several powerful capabilities like human-in-the-loop, "memory" between interactions and more.

## Key concepts

### Checkpoint

Checkpoint is a snapshot of the graph state at a given point in time. Checkpoint tuple refers to an object containing checkpoint and the associated config, metadata and pending writes.

### Thread

Threads enable the checkpointing of multiple different runs, making them essential for multi-tenant chat applications and other scenarios where maintaining separate states is necessary. A thread is a unique ID assigned to a series of checkpoints saved by a checkpointer. When using a checkpointer, you must specify a `thread_id` and optionally `checkpoint_id` when running the graph.

- `thread_id` is simply the ID of a thread. This is always required
- `checkpoint_id` can optionally be passed. This identifier refers to a specific checkpoint within a thread. This can be used to kick of a run of a graph from some point halfway through a thread.

You must pass these when invoking the graph as part of the configurable part of the config, e.g.

```ts
{ configurable: { thread_id: "1" } }  // valid config
{ configurable: { thread_id: "1", checkpoint_id: "0c62ca34-ac19-445d-bbb0-5b4984975b2a" } }  // also valid config
```

### Serde

`@langchain/langgraph-checkpoint` also defines protocol for serialization/deserialization (serde) and provides an default implementation that handles a range of types.

### Pending writes

When a graph node fails mid-execution at a given superstep, LangGraph stores pending checkpoint writes from any other nodes that completed successfully at that superstep, so that whenever we resume graph execution from that superstep we don't re-run the successful nodes.

## Interface

Each checkpointer should conform to `BaseCheckpointSaver` interface and must implement the following methods:

- `.put` - Store a checkpoint with its configuration and metadata.
- `.putWrites` - Store intermediate writes linked to a checkpoint (i.e. pending writes).
- `.getTuple` - Fetch a checkpoint tuple using for a given configuration (`thread_id` and `thread_ts`).
- `.list` - List checkpoints that match a given configuration and filter criteria.

## Usage

```ts
import { MemorySaver } from "@langchain/langgraph-checkpoint";

const writeConfig = {
  configurable: {
    thread_id: "1",
    checkpoint_ns: ""
  }
};
const readConfig = {
  configurable: {
    thread_id: "1"
  }
};

const checkpointer = new MemorySaver();
const checkpoint = {
  v: 1,
  ts: "2024-07-31T20:14:19.804150+00:00",
  id: "1ef4f797-8335-6428-8001-8a1503f9b875",
  channel_values: {
    my_key: "meow",
    node: "node"
  },
  channel_versions: {
    __start__: 2,
    my_key: 3,
    "start:node": 3,
    node: 3
  },
  versions_seen: {
    __input__: {},
    __start__: {
      __start__: 1
    },
    node: {
      "start:node": 2
    }
  },
  pending_sends: [],
}

// store checkpoint
await checkpointer.put(writeConfig, checkpoint, {}, {})

// load checkpoint
await checkpointer.get(readConfig)

// list checkpoints
for await (const checkpoint of checkpointer.list(readConfig)) {
  console.log(checkpoint);
}
```
