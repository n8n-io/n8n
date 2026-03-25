# @ts-graphviz/core

> It is part of the ts-graphviz library, which is split into modular packages to improve maintainability, flexibility, and ease of use.

This package contains the core implementation of models and functions provided to users for the ts-graphviz library.

## Features

- Graph, Node, and Edge model implementations
- High-level APIs for creating and manipulating DOT language elements
- Extensible design for custom implementations

## Usage

Import the necessary classes and functions from the @ts-graphviz/core package:

```ts
import { Graph, Node, Edge } from '@ts-graphviz/core';
```

Use the imported items in your project to create and manipulate DOT language elements:

```ts
const graph = new Graph('G');
const nodeA = new Node('A', { label: 'Node A' });
const nodeB = new Node('B', { label: 'Node B' });
const edge = new Edge([nodeA, nodeB], { label: 'A -> B' });

graph.addNode(nodeA);
graph.addNode(nodeB);
graph.addEdge(edge);

console.log(graph.toDot());
```

For more examples and usage details, please refer to the ts-graphviz documentation.


## Contributing

Contributions to the ts-graphviz project are welcome.

Please refer to the main ts-graphviz repository for guidelines on how to contribute.

## License

This package is released under the MIT License.
