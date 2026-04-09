<h1 align="center">simple-wcswidth</h1>
<h3 align="center"> 🖥️ 💬 Simplified JS/TS implementation of wcwidth/wcswidth written by Markus Kuhn in C</h3>

[![codecov](https://codecov.io/gh/console-table-printer/simple-wcswidth/graph/badge.svg?token=X4QPKTCB6A)](https://codecov.io/gh/console-table-printer/simple-wcswidth)
[![npm version](https://badge.fury.io/js/simple-wcswidth.svg)](https://badge.fury.io/js/simple-wcswidth)
[![install size](https://packagephobia.now.sh/badge?p=simple-wcswidth@latest)](https://packagephobia.now.sh/result?p=simple-wcswidth)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)


# Why another wcswidth?

1. 💙 Types included
2. 🤏 Installation Size kept as min possible
3. 🐒 No Unnecessary dependency added
4. 🤖 Tested Automatically and Regularly on different versions of node, including current LTS and stable

# Example Usage

```js
const { wcswidth, wcwidth } = require('simple-wcswidth');

console.log(wcswidth('Yes 重要')); // 8
console.log(wcswidth('请你')); // 4
console.log(wcswidth('Hi')); // 2

console.log(wcwidth('请'.charCodeAt(0))); // 2
```

# What is simplified here?

In the original [C code](https://www.cl.cam.ac.uk/~mgk25/ucs/wcwidth.c) there were 2 versions of `wcswidth()` I have included here only for first one, which is applicable for general use.

About the second one(WHICH I DIDNT INCLUDE HERE), useful for users of CJK legacy encodings who want to migrate to UCS without changing the traditional terminal character-width behaviour. It is not otherwise recommended for general use.

# Info Taken from Markus Kuhn's [C code](https://www.cl.cam.ac.uk/~mgk25/ucs/wcwidth.c)

This is an implementation of [wcwidth()](http://www.opengroup.org/onlinepubs/007904975/functions/wcwidth.html) and [wcswidth()](http://www.opengroup.org/onlinepubs/007904975/functions/wcswidth.html) (defined in
IEEE Std 1002.1-2001) for Unicode.

In fixed-width output devices, Latin characters all occupy a single
"cell" position of equal width, whereas ideographic CJK characters
occupy two such cells. Interoperability between terminal-line
applications and (teletype-style) character terminals using the
UTF-8 encoding requires agreement on which character should advance
the cursor by how many cell positions. No established formal
standards exist at present on which Unicode character shall occupy
how many cell positions on character terminals. These routines are
a first attempt of defining such behavior based on simple rules
applied to data provided by the Unicode Consortium.

For some graphical characters, the Unicode standard explicitly
defines a character-cell width via the definition of the East Asian
FullWidth (F), Wide (W), Half-width (H), and Narrow (Na) classes.
In all these cases, there is no ambiguity about which width a
terminal shall use. For characters in the East Asian Ambiguous (A)
class, the width choice depends purely on a preference of backward
compatibility with either historic CJK or Western practice.
Choosing single-width for these characters is easy to justify as
the appropriate long-term solution, as the CJK practice of
displaying these characters as double-width comes from historic
implementation simplicity (8-bit encoded characters were displayed
single-width and 16-bit ones double-width, even for Greek,
Cyrillic, etc.) and not any typographic considerations.

Much less clear is the choice of width for the Not East Asian
(Neutral) class. Existing practice does not dictate a width for any
of these characters. It would nevertheless make sense
typographically to allocate two character cells to characters such
as for instance EM SPACE or VOLUME INTEGRAL, which cannot be
represented adequately with a single-width glyph. The following
routines at present merely assign a single-cell width to all
neutral characters, in the interest of simplicity. This is not
entirely satisfactory and should be reconsidered before
establishing a formal standard in this area. At the moment, the
decision which Not East Asian (Neutral) characters should be
represented by double-width glyphs cannot yet be answered by
applying a simple rule from the Unicode database content. Setting
up a proper standard for the behavior of UTF-8 character terminals
will require a careful analysis not only of each Unicode character,
but also of each presentation form, something the author of these
routines has avoided to do so far.

http://www.unicode.org/unicode/reports/tr11/

# LICENSE

MIT

The original Code written in C was very permissive. You can find it here [Code](http://www.cl.cam.ac.uk/~mgk25/ucs/wcwidth.c)
