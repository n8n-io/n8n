# @rushstack/terminal

This library implements a system for processing human readable text that
will be output by console applications.

The design is based loosely on the `WritableStream` and `TransformStream` classes from
the system [Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Concepts),
except that instead of asynchronous byte streams, the `TerminalWritable` system synchronously transmits
human readable messages intended to be rendered on a text console or log file.

Consider a console application whose output may need to be processed in different ways
before finally being output. The conceptual block diagram might look like this:

```
         [Terminal API]
                |
                V
       [normalize newlines]
                |
                V
      +----[splitter]-------+
      |                     |
      V                     V
  [shell console]     [remove ANSI colors]
                            |
                            V
                      [write to build.log]
```

The application uses the `Terminal` API to print `stdout` and `stderr` messages, for example with standardized
formatting for errors and warnings, and ANSI escapes to make nice colors. Maybe it also includes text
received from external processes, whose newlines may be inconsistent. Ultimately we want to write the
output to the shell console and a `build.log` file, but we don't want to put ANSI colors in the build log.

For the above example, `[shell console]` and `[write to build.log]` would be modeled as subclasses of
`TerminalWritable`. The `[normalize newlines]` and `[remove ANSI colors]` steps are modeled as subclasses
of `TerminalTransform`, because they output to a "destination" object. The `[splitter]` would be
implemented using `SplitterTransform`.

The stream of messages are {@link ITerminalChunk} objects, which can represent both `stdout` and `stderr`
channels. The pipeline operates synchronously on each chunk, but by processing one chunk at a time,
it avoids storing the entire output in memory. This means that operations like `[remove ANSI colors]`
cannot be simple regular expressions -- they must be implemented as state machines (`TextRewriter` subclasses)
capable of matching substrings that span multiple chunks.

## Links

- [CHANGELOG.md](
  https://github.com/microsoft/rushstack/blob/main/libraries/terminal/CHANGELOG.md) - Find
  out what's new in the latest version
- [API Reference](https://api.rushstack.io/pages/terminal/)

`@rushstack/terminal` is part of the [Rush Stack](https://rushstack.io/) family of projects.
