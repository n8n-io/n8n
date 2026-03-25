# figures

> Unicode symbols with fallbacks for older terminals

[![](screenshot.png)](index.js)

[*and more...*](index.js)

Terminals such as Windows Console Host (and CMD) only support a [limited character set](http://en.wikipedia.org/wiki/Code_page_437).

## Install

```sh
npm install figures
```

## Usage

```js
import figures, {mainSymbols, fallbackSymbols, replaceSymbols} from 'figures';

console.log(figures.tick);
// On terminals with Unicode symbols:  ✔
// On other terminals:                 √

console.log(mainSymbols.tick);
// On all terminals:  ✔

console.log(fallbackSymbols.tick);
// On all terminals:  √

console.log(replaceSymbols('✔ check'));
// On terminals with Unicode symbols:  ✔ check
// On other terminals:                 √ check
```

## API

### figures (default export)

Type: `object`

Symbols to use on any terminal.

### mainSymbols

Symbols to use when the terminal supports Unicode symbols.

### fallbackSymbols

Symbols to use when the terminal does not support Unicode symbols.

### replaceSymbols(string, options?)

Returns the input with replaced fallback symbols if the terminal has poor Unicode support.

All the below [figures](#figures) are attached to the default export as shown in the example above.

#### string

Type: `string`

String where the Unicode symbols will be replaced with fallback symbols depending on the terminal.

#### options

Type: `object`

##### useFallback

Type: `boolean`\
Default: `true` if the terminal has poor Unicode support

Whether to replace symbols with fallbacks.

This can be set to `true` to always use fallback symbols, whether the terminal has poor Unicode support or not.

```js
import {replaceSymbols} from 'figures';

console.log(replaceSymbols('✔ check', {useFallback: true}));
// On terminals with Unicode symbols:  √ check
// On other terminals:                 √ check
```

## Figures

`Fallback` characters are only shown when they differ from the `Main` ones.

| Name                                        | Main | Fallback |
| ------------------------------------------- | :--: | :------: |
| tick                                        | `✔`  |   `√`   |
| info                                        | `ℹ`  |   `i`   |
| warning                                     | `⚠`  |   `‼`   |
| cross                                       | `✘`  |   `×`   |
| square                                      | `█`  |         |
| squareSmall                                 | `◻`  |   `□`   |
| squareSmallFilled                           | `◼`  |   `■`   |
| squareDarkShade                             | `▓`  |         |
| squareMediumShade                           | `▒`  |         |
| squareLightShade                            | `░`  |         |
| squareTop                                   | `▀`  |         |
| squareBottom                                | `▄`  |         |
| squareLeft                                  | `▌`  |         |
| squareRight                                 | `▐`  |         |
| squareCenter                                | `■`  |         |
| circle                                      | `◯`  |  `( )`  |
| circleFilled                                | `◉`  |  `(*)`  |
| circleDotted                                | `◌`  |  `( )`  |
| circleDouble                                | `◎`  |  `( )`  |
| circleCircle                                | `ⓞ`  |  `(○)`  |
| circleCross                                 | `ⓧ`  |  `(×)`  |
| circlePipe                                  | `Ⓘ`  |  `(│)`  |
| circleQuestionMark                          | `?⃝ ` |  `(?)`  |
| radioOn                                     | `◉`  |  `(*)`  |
| radioOff                                    | `◯`  |  `( )`  |
| checkboxOn                                  | `☒`  |  `[×]`  |
| checkboxOff                                 | `☐`  |  `[ ]`  |
| checkboxCircleOn                            | `ⓧ`  |  `(×)`  |
| checkboxCircleOff                           | `Ⓘ`  |  `( )`  |
| questionMarkPrefix                          | `?⃝ ` |   `？`  |
| bullet                                      | `●`  |         |
| dot                                         | `․`  |         |
| ellipsis                                    | `…`  |         |
| pointer                                     | `❯`  |   `>`   |
| pointerSmall                                | `›`  |   `›`   |
| triangleUp                                  | `▲`  |         |
| triangleUpSmall                             | `▴`  |         |
| triangleUpOutline                           | `△`  |   `∆`   |
| triangleDown                                | `▼`  |         |
| triangleDownSmall                           | `▾`  |         |
| triangleLeft                                | `◀`  |   `◄`   |
| triangleLeftSmall                           | `◂`  |         |
| triangleRight                               | `▶`  |   `►`   |
| triangleRightSmall                          | `▸`  |         |
| lozenge                                     | `◆`  |   `♦`   |
| lozengeOutline                              | `◇`  |   `◊`   |
| home                                        | `⌂`  |         |
| hamburger                                   | `☰`  |   `≡`   |
| smiley                                      | `㋡` |   `☺`   |
| mustache                                    | `෴`  |  `┌─┐`  |
| heart                                       | `♥`  |         |
| star                                        | `★`  |   `✶`   |
| play                                        | `▶`  |   `►`   |
| musicNote                                   | `♪`  |         |
| musicNoteBeamed                             | `♫`  |         |
| nodejs                                      | `⬢`  |   `♦`   |
| arrowUp                                     | `↑`  |         |
| arrowDown                                   | `↓`  |         |
| arrowLeft                                   | `←`  |         |
| arrowRight                                  | `→`  |         |
| arrowLeftRight                              | `↔`  |         |
| arrowUpDown                                 | `↕`  |         |
| almostEqual                                 | `≈`  |         |
| notEqual                                    | `≠`  |         |
| lessOrEqual                                 | `≤`  |         |
| greaterOrEqual                              | `≥`  |         |
| identical                                   | `≡`  |         |
| infinity                                    | `∞`  |         |
| subscriptZero                               | `₀`  |         |
| subscriptOne                                | `₁`  |         |
| subscriptTwo                                | `₂`  |         |
| subscriptThree                              | `₃`  |         |
| subscriptFour                               | `₄`  |         |
| subscriptFive                               | `₅`  |         |
| subscriptSix                                | `₆`  |         |
| subscriptSeven                              | `₇`  |         |
| subscriptEight                              | `₈`  |         |
| subscriptNine                               | `₉`  |         |
| oneHalf                                     | `½`  |         |
| oneThird                                    | `⅓`  |         |
| oneQuarter                                  | `¼`  |         |
| oneFifth                                    | `⅕`  |         |
| oneSixth                                    | `⅙`  |         |
| oneSeventh                                  | `⅐`  |  `1/7`  |
| oneEighth                                   | `⅛`  |         |
| oneNinth                                    | `⅑`  |  `1/9`  |
| oneTenth                                    | `⅒`  |  `1/10` |
| twoThirds                                   | `⅔`  |         |
| twoFifths                                   | `⅖`  |         |
| threeQuarters                               | `¾`  |         |
| threeFifths                                 | `⅗`  |         |
| threeEighths                                | `⅜`  |         |
| fourFifths                                  | `⅘`  |         |
| fiveSixths                                  | `⅚`  |         |
| fiveEighths                                 | `⅝`  |         |
| sevenEighths                                | `⅞`  |         |
| line                                        | `─`  |         |
| lineBold                                    | `━`  |         |
| lineDouble                                  | `═`  |         |
| lineDashed0                                 | `┄`  |         |
| lineDashed1                                 | `┅`  |         |
| lineDashed2                                 | `┈`  |         |
| lineDashed3                                 | `┉`  |         |
| lineDashed4                                 | `╌`  |         |
| lineDashed5                                 | `╍`  |         |
| lineDashed6                                 | `╴`  |         |
| lineDashed7                                 | `╶`  |         |
| lineDashed8                                 | `╸`  |         |
| lineDashed9                                 | `╺`  |         |
| lineDashed10                                | `╼`  |         |
| lineDashed11                                | `╾`  |         |
| lineDashed12                                | `−`  |         |
| lineDashed13                                | `–`  |         |
| lineDashed14                                | `‐`  |         |
| lineDashed15                                | `⁃`  |         |
| lineVertical                                | `│`  |         |
| lineVerticalBold                            | `┃`  |         |
| lineVerticalDouble                          | `║`  |         |
| lineVerticalDashed0                         | `┆`  |         |
| lineVerticalDashed1                         | `┇`  |         |
| lineVerticalDashed2                         | `┊`  |         |
| lineVerticalDashed3                         | `┋`  |         |
| lineVerticalDashed4                         | `╎`  |         |
| lineVerticalDashed5                         | `╏`  |         |
| lineVerticalDashed6                         | `╵`  |         |
| lineVerticalDashed7                         | `╷`  |         |
| lineVerticalDashed8                         | `╹`  |         |
| lineVerticalDashed9                         | `╻`  |         |
| lineVerticalDashed10                        | `╽`  |         |
| lineVerticalDashed11                        | `╿`  |         |
| lineDownLeft                                | `┐`  |         |
| lineDownLeftArc                             | `╮`  |         |
| lineDownBoldLeftBold                        | `┓`  |         |
| lineDownBoldLeft                            | `┒`  |         |
| lineDownLeftBold                            | `┑`  |         |
| lineDownDoubleLeftDouble                    | `╗`  |         |
| lineDownDoubleLeft                          | `╖`  |         |
| lineDownLeftDouble                          | `╕`  |         |
| lineDownRight                               | `┌`  |         |
| lineDownRightArc                            | `╭`  |         |
| lineDownBoldRightBold                       | `┏`  |         |
| lineDownBoldRight                           | `┎`  |         |
| lineDownRightBold                           | `┍`  |         |
| lineDownDoubleRightDouble                   | `╔`  |         |
| lineDownDoubleRight                         | `╓`  |         |
| lineDownRightDouble                         | `╒`  |         |
| lineUpLeft                                  | `┘`  |         |
| lineUpLeftArc                               | `╯`  |         |
| lineUpBoldLeftBold                          | `┛`  |         |
| lineUpBoldLeft                              | `┚`  |         |
| lineUpLeftBold                              | `┙`  |         |
| lineUpDoubleLeftDouble                      | `╝`  |         |
| lineUpDoubleLeft                            | `╜`  |         |
| lineUpLeftDouble                            | `╛`  |         |
| lineUpRight                                 | `└`  |         |
| lineUpRightArc                              | `╰`  |         |
| lineUpBoldRightBold                         | `┗`  |         |
| lineUpBoldRight                             | `┖`  |         |
| lineUpRightBold                             | `┕`  |         |
| lineUpDoubleRightDouble                     | `╚`  |         |
| lineUpDoubleRight                           | `╙`  |         |
| lineUpRightDouble                           | `╘`  |         |
| lineUpDownLeft                              | `┤`  |         |
| lineUpBoldDownBoldLeftBold                  | `┫`  |         |
| lineUpBoldDownBoldLeft                      | `┨`  |         |
| lineUpDownLeftBold                          | `┥`  |         |
| lineUpBoldDownLeftBold                      | `┩`  |         |
| lineUpDownBoldLeftBold                      | `┪`  |         |
| lineUpDownBoldLeft                          | `┧`  |         |
| lineUpBoldDownLeft                          | `┦`  |         |
| lineUpDoubleDownDoubleLeftDouble            | `╣`  |         |
| lineUpDoubleDownDoubleLeft                  | `╢`  |         |
| lineUpDownLeftDouble                        | `╡`  |         |
| lineUpDownRight                             | `├`  |         |
| lineUpBoldDownBoldRightBold                 | `┣`  |         |
| lineUpBoldDownBoldRight                     | `┠`  |         |
| lineUpDownRightBold                         | `┝`  |         |
| lineUpBoldDownRightBold                     | `┡`  |         |
| lineUpDownBoldRightBold                     | `┢`  |         |
| lineUpDownBoldRight                         | `┟`  |         |
| lineUpBoldDownRight                         | `┞`  |         |
| lineUpDoubleDownDoubleRightDouble           | `╠`  |         |
| lineUpDoubleDownDoubleRight                 | `╟`  |         |
| lineUpDownRightDouble                       | `╞`  |         |
| lineDownLeftRight                           | `┬`  |         |
| lineDownBoldLeftBoldRightBold               | `┳`  |         |
| lineDownLeftBoldRightBold                   | `┯`  |         |
| lineDownBoldLeftRight                       | `┰`  |         |
| lineDownBoldLeftBoldRight                   | `┱`  |         |
| lineDownBoldLeftRightBold                   | `┲`  |         |
| lineDownLeftRightBold                       | `┮`  |         |
| lineDownLeftBoldRight                       | `┭`  |         |
| lineDownDoubleLeftDoubleRightDouble         | `╦`  |         |
| lineDownDoubleLeftRight                     | `╥`  |         |
| lineDownLeftDoubleRightDouble               | `╤`  |         |
| lineUpLeftRight                             | `┴`  |         |
| lineUpBoldLeftBoldRightBold                 | `┻`  |         |
| lineUpLeftBoldRightBold                     | `┷`  |         |
| lineUpBoldLeftRight                         | `┸`  |         |
| lineUpBoldLeftBoldRight                     | `┹`  |         |
| lineUpBoldLeftRightBold                     | `┺`  |         |
| lineUpLeftRightBold                         | `┶`  |         |
| lineUpLeftBoldRight                         | `┵`  |         |
| lineUpDoubleLeftDoubleRightDouble           | `╩`  |         |
| lineUpDoubleLeftRight                       | `╨`  |         |
| lineUpLeftDoubleRightDouble                 | `╧`  |         |
| lineUpDownLeftRight                         | `┼`  |         |
| lineUpBoldDownBoldLeftBoldRightBold         | `╋`  |         |
| lineUpDownBoldLeftBoldRightBold             | `╈`  |         |
| lineUpBoldDownLeftBoldRightBold             | `╇`  |         |
| lineUpBoldDownBoldLeftRightBold             | `╊`  |         |
| lineUpBoldDownBoldLeftBoldRight             | `╉`  |         |
| lineUpBoldDownLeftRight                     | `╀`  |         |
| lineUpDownBoldLeftRight                     | `╁`  |         |
| lineUpDownLeftBoldRight                     | `┽`  |         |
| lineUpDownLeftRightBold                     | `┾`  |         |
| lineUpBoldDownBoldLeftRight                 | `╂`  |         |
| lineUpDownLeftBoldRightBold                 | `┿`  |         |
| lineUpBoldDownLeftBoldRight                 | `╃`  |         |
| lineUpBoldDownLeftRightBold                 | `╄`  |         |
| lineUpDownBoldLeftBoldRight                 | `╅`  |         |
| lineUpDownBoldLeftRightBold                 | `╆`  |         |
| lineUpDoubleDownDoubleLeftDoubleRightDouble | `╬`  |         |
| lineUpDoubleDownDoubleLeftRight             | `╫`  |         |
| lineUpDownLeftDoubleRightDouble             | `╪`  |         |
| lineCross                                   | `╳`  |         |
| lineBackslash                               | `╲`  |         |
| lineSlash                                   | `╱`  |         |

## Other characters

If you cannot find the character you're looking for in the table above, please look at this full list of [cross-platform terminal characters](https://github.com/ehmicky/cross-platform-terminal-characters).

## Unsupported terminals

The following terminals are not officially supported:

- xterm
- Linux Terminal (kernel)
- cmder

They can display most but not all of the symbols listed above.

## Related

- [log-symbols](https://github.com/sindresorhus/log-symbols) - Colored symbols for various log levels
