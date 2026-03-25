# code-block-writer

[![npm version](https://badge.fury.io/js/code-block-writer.svg)](https://badge.fury.io/js/code-block-writer)
[![CI](https://github.com/dsherret/code-block-writer/workflows/CI/badge.svg)](https://github.com/dsherret/code-block-writer/actions?query=workflow%3ACI)
[![JSR](https://jsr.io/badges/@david/code-block-writer)](https://jsr.io/@david/code-block-writer)
[![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)

Code writer for JavaScript and TypeScript code.

With Deno:

```ts
deno add jsr:@david/code-block-writer
```

Or with Node:

```
npm install --save code-block-writer
```

## Example

<!-- dprint-ignore -->

```typescript
// import CodeBlockWriter from "code-block-writer"; // for npm
import CodeBlockWriter from "@david/code-block-writer";

const writer = new CodeBlockWriter({
  // optional options
  newLine: "\r\n",         // default: "\n"
  indentNumberOfSpaces: 2, // default: 4
  useTabs: false,          // default: false
  useSingleQuote: true     // default: false
});

writer.write("class MyClass extends OtherClass").block(() => {
  writer.writeLine(`@MyDecorator(1, 2)`);
  writer.write(`myMethod(myParam: any)`).block(() => {
    writer.write("return this.post(").quote("myArgument").write(");");
  });
});

console.log(writer.toString());
```

Outputs (using "\r\n" for newlines):

<!-- dprint-ignore -->

```js
class MyClass extends OtherClass {
  @MyDecorator(1, 2)
  myMethod(myParam: any) {
    return this.post('myArgument');
  }
}
```

## Methods

- `block(block?: () => void)` - Indents all the code written within and surrounds it in braces.
- `inlineBlock(block?: () => void)` - Same as block, but doesn't add a space before the first brace and doesn't add a newline at the end.
- `getLength()` - Get the current number of characters.
- `writeLine(text: string)` - Writes some text and adds a newline.
- `newLine()` - Writes a newline.
- `newLineIfLastNot()` - Writes a newline if what was written last wasn't a newline.
- `blankLine()` - Writes a blank line. Does not allow consecutive blank lines.
- `blankLineIfLastNot()` - Writes a blank line if what was written last wasn't a blank line.
- `quote()` - Writes a quote character.
- `quote(text: string)` - Writes text surrounded in quotes.
- `indent(times?: number)` - Indents the current line. Optionally indents multiple times when providing a number.
- `indent(block?: () => void)` - Indents a block of code.
- `space(times?: number)` - Writes a space. Optionally writes multiple spaces when providing a number.
- `spaceIfLastNot()` - Writes a space if the last was not a space.
- `tab(times?: number)` - Writes a tab. Optionally writes multiple tabs when providing a number.
- `tabIfLastNot()` - Writes a tab if the last was not a tab.
- `write(text: string)` - Writes some text.
- `conditionalNewLine(condition: boolean)` - Writes a newline if the condition is matched.
- `conditionalBlankLine(condition: boolean)` - Writes a blank line if the condition is matched.
- `conditionalWrite(condition: boolean, text: string)` - Writes if the condition is matched.
- `conditionalWrite(condition: boolean, textFunc: () => string)` - Writes if the condition is matched.
- `conditionalWriteLine(condition: boolean, text: string)` - Writes some text and adds a newline if the condition is matched.
- `conditionalWriteLine(condition: boolean, textFunc: () => string)` - Writes some text and adds a newline if the condition is matched.
- `setIndentationLevel(indentationLevel: number)` - Sets the current indentation level.
- `setIndentationLevel(whitespaceText: string)` - Sets the current indentation level based on the provided whitespace text.
- `withIndentationLevel(indentationLevel: number, action: () => void)` - Sets the indentation level within the provided action.
- `withIndentationLevel(whitespaceText: string, action: () => void)` - Sets the indentation level based on the provided whitespace text within the action.
- `getIndentationLevel()` - Gets the current indentation level.
- `queueIndentationLevel(indentationLevel: number)` - Queues an indentation level to be used once a new line is written.
- `queueIndentationLevel(whitespaceText: string)` - Queues an indentation level to be used once a new line is written based on the provided whitespace text.
- `hangingIndent(action: () => void)` - Writes the code within the action with hanging indentation.
- `hangingIndentUnlessBlock(action: () => void)` - Writes the code within the action with hanging indentation unless a block is written going from the first line to the second.
- `closeComment()` - Writes text to exit a comment if in a comment.
- `unsafeInsert(pos: number, text: string)` - Inserts text into the writer. This will not update the writer's state. Read more in its jsdoc.
- `isInComment()` - Gets if the writer is currently in a comment.
- `isAtStartOfFirstLineOfBlock()` - Gets if the writer is currently at the start of the first line of the text, block, or indentation block.
- `isOnFirstLineOfBlock()` - Gets if the writer is currently on the first line of the text, block, or indentation block.
- `isInString()` - Gets if the writer is currently in a string.
- `isLastNewLine()` - Gets if the writer last wrote a newline.
- `isLastBlankLine()` - Gets if the writer last wrote a blank line.
- `isLastSpace()` - Gets if the writer last wrote a space.
- `isLastTab()` - Gets if the writer last wrote a tab.
- `getLastChar()` - Gets the last character written.
- `endsWith(text: string)` - Gets if the writer ends with the provided text.
- `iterateLastChars<T>(action: (char: string, index: number) => T | undefined): T | undefined` - Iterates over the writer's characters in reverse order, stopping once a non-null or undefined value is returned and returns that value.
- `iterateLastCharCodes<T>(action: (charCode: number, index: number) => T | undefined): T | undefined` - A slightly faster version of `iterateLastChars` that doesn't allocate a string per character.
- `getOptions()` - Gets the writer options.
- `toString()` - Gets the string.

## Other Features

- Does not indent within strings.
- Escapes newlines within double and single quotes created with `.quote(text)`.

## C# Version

See [CodeBlockWriterSharp](https://github.com/dsherret/CodeBlockWriterSharp).
