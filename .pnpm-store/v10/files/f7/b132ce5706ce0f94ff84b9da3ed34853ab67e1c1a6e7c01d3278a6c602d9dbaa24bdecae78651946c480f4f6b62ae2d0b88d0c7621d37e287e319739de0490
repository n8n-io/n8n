# @ts-graphviz/adapter

> It is part of the ts-graphviz library, which is split into modular packages to improve maintainability, flexibility, and ease of use.

Provides an interface to run Graphviz dot commands.

[Graphviz](https://graphviz.gitlab.io/) must be installed so that the dot command can be executed.

Execute the dot command to output a DOT language string to a stream or file.

![Adapter State Machine](./media/adapter-state-machine.svg)

## Usage

This module provides the following functions.

- The `toStream` function converts **DOT** to **Stream**.
    ```ts
    import { toStream } from '@ts-graphviz/adapter';

    const dot = `
      digraph example {
        node1 [
          label = "My Node",
        ]
      }
    `;

    const stream = await toStream(dot, { format: 'svg' });
    // Node.js
    stream.pipe(process.stdout);
    // Deno
    await stream.pipeTo(Deno.stdout.writable);
    ```
- Writes **DOT** to a file at the specified path `toFile` function
    ```ts
    import { toFile } from '@ts-graphviz/adapter';

    const dot = `
      digraph example {
        node1 [
          label = "My Node",
        ]
      }
    `;

    await toFile(dot, './result.svg', { format: 'svg' });
    ```

> **Note** Designed to work with Node.js and Deno, Stream is runtime native.

For more examples and usage details, please refer to the ts-graphviz documentation.

## Contributing

Contributions to the ts-graphviz project are welcome.

Please refer to the main ts-graphviz repository for guidelines on how to contribute.

## License

This package is released under the MIT License.
