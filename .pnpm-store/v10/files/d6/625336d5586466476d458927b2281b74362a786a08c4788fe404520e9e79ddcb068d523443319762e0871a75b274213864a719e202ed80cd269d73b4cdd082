Difflib.js
==========

A JavaScript module which provides classes and functions for comparing sequences. It can be used for example, for comparing files, and can produce difference information in various formats, including context and unified diffs. Ported from Python's [difflib](http://docs.python.org/library/difflib.html) module.

Installation
------------

#### Browser

To use it in the browser, you may download the [minified js file](https://github.com/qiao/difflib.js/raw/master/dist/difflib-browser.js) and include it in your webpage.

```html
<script type="text/javascript" src="./difflib-browser.js"></script>
```

#### Node.js

For Node.js, you can install it using Node Package Manager (npm):

```bash
npm install difflib
```

Then, in your script:

```js
var difflib = require('difflib');
```

Quick Examples
--------------

1. contextDiff

    ```js
    >>> s1 = ['bacon\n', 'eggs\n', 'ham\n', 'guido\n']
    >>> s2 = ['python\n', 'eggy\n', 'hamster\n', 'guido\n']
    >>> difflib.contextDiff(s1, s2, {fromfile:'before.py', tofile:'after.py'})
    [ '*** before.py\n',
      '--- after.py\n',
      '***************\n',
      '*** 1,4 ****\n',
      '! bacon\n',
      '! eggs\n',
      '! ham\n',
      '  guido\n',
      '--- 1,4 ----\n',
      '! python\n',
      '! eggy\n',
      '! hamster\n',
      '  guido\n' ]
    ```

2. unifiedDiff

    ```js
    >>> difflib.unifiedDiff('one two three four'.split(' '),
    ...                     'zero one tree four'.split(' '), {
    ...                       fromfile: 'Original'
    ...                       tofile: 'Current',
    ...                       fromfiledate: '2005-01-26 23:30:50',
    ...                       tofiledate: '2010-04-02 10:20:52',
    ...                       lineterm: ''
    ...                     })
    [ '--- Original\t2005-01-26 23:30:50',
      '+++ Current\t2010-04-02 10:20:52',
      '@@ -1,4 +1,4 @@',
      '+zero',
      ' one',
      '-two',
      '-three',
      '+tree',
      ' four' ]
    ```


3. ndiff

    ```js
    >>> a = ['one\n', 'two\n', 'three\n']
    >>> b = ['ore\n', 'tree\n', 'emu\n']
    >>> difflib.ndiff(a, b)
    [ '- one\n',
      '?  ^\n',
      '+ ore\n',
      '?  ^\n',
      '- two\n',
      '- three\n',
      '?  -\n',
      '+ tree\n',
      '+ emu\n' ]
    ```

4. ratio

    ```js
    >>> s = new difflib.SequenceMatcher(null, 'abcd', 'bcde');
    >>> s.ratio();
    0.75
    >>> s.quickRatio();
    0.75
    >>> s.realQuickRatio();
    1.0
    ```

5. getOpcodes

    ```js
    >>> s = new difflib.SequenceMatcher(null, 'qabxcd', 'abycdf');
    >>> s.getOpcodes();
    [ [ 'delete'  , 0 , 1 , 0 , 0 ] ,
      [ 'equal'   , 1 , 3 , 0 , 2 ] ,
      [ 'replace' , 3 , 4 , 2 , 3 ] ,
      [ 'equal'   , 4 , 6 , 3 , 5 ] ,
      [ 'insert'  , 6 , 6 , 5 , 6 ] ]
    ```

6. getCloseMatches

    ```js
    >>> difflib.getCloseMatches('appel', ['ape', 'apple', 'peach', 'puppy'])
    ['apple', 'ape']
    ```

Documentation
-------------

* [SequenceMatcher](#SequenceMatcher)

    * [setSeqs](#setSeqs)
    * [setSeq1](#setSeq1)
    * [setSeq2](#setSeq2)
    * [findLongestMatch](#findLongestMatch)
    * [getMatchingBlocks](#getMatchingBlocks)
    * [getOpcodes](#getOpcodes)
    * [getGroupedOpcodes](#getGroupedOpcodes)
    * [ratio](#ratio)
    * [quickRatio](#quickRatio)
    * [realQuickRatio](#realQuickRatio)

* [Differ](#Differ)

    * [compare](#compare)

* [contextDiff](#contextDiff)
* [getCloseMatches](#getCloseMatches)
* [ndiff](#ndiff)
* [restore](#restore)
* [unifiedDiff](#unifiedDiff)
* [IS_LINE_JUNK](#IS_LINE_JUNK)
* [IS_CHARACTER_JUNK](#IS_CHARACTER_JUNK)


<a name="SequenceMatcher" />
### *class* difflib.**SequenceMatcher**([isjunk[, a[, b[, autojunk=true]]]])

This is a flexible class for comparing pairs of sequences of any type.

Optional argument *isjunk* must be **null** (the default) or a one-argument function
that takes a sequence element and returns true if and only if the element is
"junk" and should be ignored. 

Passing **null** for *isjunk* is equivalent to passing

```js
function(x) { return false; }; 
```

in other words, no elements are ignored. 

For example, pass:

```js
function(x) { return x == ' ' || x == '\t'; }
```

if you're comparing lines as sequences of characters, 
and don’t want to synch up on blanks or hard tabs.

The optional arguments *a* and *b* are sequences to be compared;
both default to empty strings.

The optional argument *autojunk* can be used to disable the 
automatic junk heuristic, which automatically treats certain sequence items as junk.


<a name="setSeqs" />
#### setSeqs(a, b)

Set the two sequences to be compared.

SequenceMatcher computes and caches detailed information about the second
sequence, so if you want to compare one sequence against many sequences,
use [setSeq2()](#setSeq2) to set the commonly used sequence once and call 
[setSeq1()](#setSeq1) repeatedly, once for each of the other sequences.

<a name="setSeq1" />
#### setSeq1(a)

Set the first sequence to be compared. The second sequence to be compared is not changed.

<a name="setSeq2" />
#### setSeq2(a)

Set the second sequence to be compared. The first sequence to be compared is not changed.

<a name="findLongestMatch" />
#### findLongestMatch(alo, ahi, blo, bhi)

Find longest matching block in `a[alo:ahi]` and `b[blo:bhi]`.

If *isjunk* was omitted or null, *findLongestMatch()* returns `[i, j, k]` such that 
`a[i:i+k]` is equal to `b[j:j+k]`, where `alo <= i <= i+k <= ahi` and 
`blo <= j <= j+k <= bhi`. 
For all `[i', j', k']` meeting those conditions, the additional conditions `k >= k'`, 
`i <= i'`, and if `i == i'`, `j <= j'` are also met. 
In other words, of all maximal matching blocks, return one that starts earliest in *a*,
and of all those maximal matching blocks that start earliest in *a*, 
return the one that starts earliest in *b*.

```js
>>> s = new difflib.SequenceMatcher(null, " abcd", "abcd abcd");
>>> s.findLongestMatch(0, 5, 0, 9);
[0, 4, 5]
```

If *isjunk* was provided, first the longest matching block is determined
as above, but with the additional restriction that no junk element appears
in the block. 
Then that block is extended as far as possible by matching (only) junk 
elements on both sides. So the resulting block never matches on junk 
except as identical junk happens to be adjacent to an interesting match.

Here's the same example as before, but considering blanks to be junk. 
That prevents `' abcd'` from matching the `' abcd'` at the tail end of 
the second sequence directly. 
Instead only the `'abcd'` can match, and matches the leftmost `'abcd'` 
in the second sequence:

```js
>>> s = new difflib.SequenceMatcher(function(x) {return x == ' ';}, " abcd", "abcd abcd")
>>> s.findLongestMatch(0, 5, 0, 9)
[1, 0, 4]
```

If no blocks match, this returns `[alo, blo, 0]`.


<a name="getMatchingBlocks" />
#### getMatchingBlocks()

Return list of triples describing matching subsequences. 
Each triple is of the form `[i, j, n]`, and means that `a[i:i+n] == b[j:j+n]`. 
The triples are monotonically increasing in *i* and *j*.

The last triple is a dummy, and has the value `[a.length, b.length, 0]`.
It is the only triple with `n == 0`. If `[i, j, n]` and `[i', j', n']` 
are adjacent triples in the list, and the second is not the last triple 
in the list, then `i+n != i'` or `j+n != j'`; 
in other words, adjacent triples always describe non-adjacent equal blocks.

```js
>>> s = new difflib.SequenceMatcher(null, "abxcd", "abcd")
>>> s.getMatchingBlocks()
[ [0, 0, 2], [3, 2, 2], [5, 4, 0] ]
```

<a name="getOpcodes" />
#### getOpcodes()

Return list of 5-tuples describing how to turn a into b. 
Each tuple is of the form `[tag, i1, i2, j1, j2]`. 
The first tuple has `i1 == j1 == 0`, and remaining tuples 
have *i1* equal to the *i2* from the preceding tuple, 
and, likewise, *j1* equal to the previous *j2*.

The tag values are strings, with these meanings:

    Value       Meaning

    'replace'   a[i1:i2] should be replaced by b[j1:j2].
    'delete'    a[i1:i2] should be deleted. Note that j1 == j2 in this case.
    'insert'    b[j1:j2] should be inserted at a[i1:i1]. Note that i1 == i2 in this case.
    'equal'     a[i1:i2] == b[j1:j2] (the sub-sequences are equal).

```js
>>> s = new difflib.SequenceMatcher(null, 'qabxcd', 'abycdf');
>>> s.getOpcodes();
[ [ 'delete'  , 0 , 1 , 0 , 0 ] ,
  [ 'equal'   , 1 , 3 , 0 , 2 ] ,
  [ 'replace' , 3 , 4 , 2 , 3 ] ,
  [ 'equal'   , 4 , 6 , 3 , 5 ] ,
  [ 'insert'  , 6 , 6 , 5 , 6 ] ]
```

<a name="getGroupedOpcodes" />
#### getGroupedOpcodes([n])

Return a list groups with upto n (default is 3) lines of context.
Each group is in the same format as returned by [getOpcodes()](#getOpcodes).

<a name="ratio" />
#### ratio()

Return a measure of the sequences’ similarity as a float in the range [0, 1].

Where T is the total number of elements in both sequences, 
and M is the number of matches, this is 2.0*M / T. 
Note that this is `1.0` if the sequences are identical, 
and `0.0` if they have nothing in common.

This is expensive to compute if [getMatchingBlocks()](#getMatchingBlocks) or 
[getOpcodes()](#getOpcodes) hasn’t already been called, in which case 
you may want to try [quickRatio()](#quickRatio) or 
[realQuickRatio()](#realQuickRatio) first to get an upper bound.

<a name="quickRatio" />
#### quickRatio()

Return an upper bound on ratio() relatively quickly.

<a name="realQuickRatio" />
#### realQuickRatio()

Return an upper bound on ratio() very quickly.

```js
>>> s = new difflib.SequenceMatcher(null, 'abcd', 'bcde');
>>> s.ratio();
0.75
>>> s.quickRatio();
0.75
>>> s.realQuickRatio();
1.0
```

<a name="Differ" />
### *class* difflib.**Differ**([linejunk[, charjunk]])

This is a class for comparing sequences of lines of text, 
and producing human-readable differences or deltas. 
Differ uses [SequenceMatcher](#SequenceMatcher) both to compare 
sequences of lines, and to compare sequences of characters within 
similar (near-matching) lines.

Each line of a Differ delta begins with a two-letter code:

    Code    Meaning
    '- '    line unique to sequence 1
    '+ '    line unique to sequence 2
    '  '    line common to both sequences
    '? '    line not present in either input sequence

Lines beginning with `?` attempt to guide the eye to intraline differences, 
and were not present in either input sequence. 
These lines can be confusing if the sequences contain tab characters.

Optional parameters *linejunk* and *charjunk* are for filter functions (or **null**):

*linejunk*: A function that accepts a single string argument, 
and returns true if the string is junk. 
The default is **null**, meaning that no line is considered junk.

*charjunk*: A function that accepts a single character argument 
(a string of length 1), and returns true if the character is junk. 
The default is *null*, meaning that no character is considered junk.

<a name="compare" />
#### compare(a, b)

Compare two sequences of lines, and generate the delta (a sequence of lines).

Each sequence must contain individual single-line strings ending with newlines.

```js
>>> d = new difflib.Differ()
>>> d.compare(['one\n', 'two\n', 'three\n'],
...           ['ore\n', 'tree\n', 'emu\n'])
[ '- one\n',
  '?  ^\n',
  '+ ore\n',
  '?  ^\n',
  '- two\n',
  '- three\n',
  '?  -\n',
  '+ tree\n',
  '+ emu\n' ]
```

<a name="contextDiff" />
### difflib.**contextDiff**(a, b, options)

Compare *a* and *b* (lists of strings); 
return the delta lines in context diff format.

options:

* fromfile
* tofile
* fromfiledate
* tofiledate
* n
* lineterm

Context diffs are a compact way of showing just the lines that 
have changed plus a few lines of context. The changes are shown in a 
before/after style. 
The number of context lines is set by n which defaults to three.

By default, the diff control lines (those with `***` or `---`) are created 
with a trailing newline. 

For inputs that do not have trailing newlines, set the lineterm argument 
to `""` so that the output will be uniformly newline free.

The context diff format normally has a header for filenames and modification
times. Any or all of these may be specified using strings for *fromfile*, 
*tofile*, *fromfiledate*, and *tofiledate*. 
The modification times are normally expressed in the ISO 8601 format. 
If not specified, the strings default to blanks.

```js
>>> var s1 = ['bacon\n', 'eggs\n', 'ham\n', 'guido\n']
>>> var s2 = ['python\n', 'eggy\n', 'hamster\n', 'guido\n']
>>> difflib.contextDiff(s1, s2, {fromfile:'before.py', tofile:'after.py'})
[ '*** before.py\n',
  '--- after.py\n',
  '***************\n',
  '*** 1,4 ****\n',
  '! bacon\n',
  '! eggs\n',
  '! ham\n',
  '  guido\n',
  '--- 1,4 ----\n',
  '! python\n',
  '! eggy\n',
  '! hamster\n',
  '  guido\n' ]
```

<a name="getCloseMatches" />
### difflib.*getCloseMatches*(word, possibilities\[, n\]\[, cutoff\])

Return a list of the best “good enough” matches. 
*word* is a sequence for which close matches are desired 
(typically a string), and *possibilities* is a list of sequences against 
which to match word (typically a list of strings).

Optional argument *n* (default 3) is the maximum number of close 
matches to return; *n* must be greater than 0.

Optional argument *cutoff* (default 0.6) is a float in the range 
[0, 1]. 
Possibilities that don’t score at least that similar to word are ignored.

The best (no more than n) matches among the possibilities are 
returned in a list, sorted by similarity score, most similar first.

```js
>>> difflib.getCloseMatches('appel', ['ape', 'apple', 'peach', 'puppy'])
['apple', 'ape']
```

<a name="ndiff" />
### difflib.**ndiff**(a, b\[, linejunk\]\[, charjunk\])

Compare *a* and b (lists of strings); 
return Differ-style delta lines

Optional keyword parameters *linejunk* and *charjunk* are for 
filter functions (or **null**):

*linejunk*: A function that accepts a single string argument, 
and returns true if the string is junk, or false if not. 
The default is (*null*).

*charjunk*: A function that accepts a character (a string of length 1),
and returns if the character is junk, or false if not. The default is 
module-level function [IS_CHARACTER_JUNK()](#IS_CHARACTER_JUNK), 
which filters out whitespace characters (a blank or tab; note: 
bad idea to include newline in this!).

```js
>>> a = ['one\n', 'two\n', 'three\n']
>>> b = ['ore\n', 'tree\n', 'emu\n']
>>> difflib.ndiff(a, b)
[ '- one\n',
  '?  ^\n',
  '+ ore\n',
  '?  ^\n',
  '- two\n',
  '- three\n',
  '?  -\n',
  '+ tree\n',
  '+ emu\n' ]
```

<a name="restore" />
### difflib.**restore**(sequence, which)

Return one of the two sequences that generated a delta.

Given a sequence produced by Differ.compare() or ndiff(), 
extract lines originating from file 1 or 2 (parameter which), stripping off line prefixes.

```js
>>> a = ['one\n', 'two\n', 'three\n']
>>> b = ['ore\n', 'tree\n', 'emu\n']
>>> diff = difflib.ndiff(a, b)
>>> difflib.restore(diff, 1)
[ 'one\n',
  'two\n',
  'three\n' ]
>>> restore(diff, 2)
[ 'ore\n',
  'tree\n',
  'emu\n' ]
```

<a name="unifiedDiff" />
### difflib.**unifiedDiff**(a, b, options)

Compare a and b (lists of strings); 
return delta lines in unified diff format.

options:

* fromfile
* tofile
* fromfiledate
* tofiledate
* n
* lineterm

Unified diffs are a compact way of showing just the lines that have 
changed plus a few lines of context. 
The changes are shown in a inline style (instead of separate before/after 
blocks). 
The number of context lines is set by n which defaults to three.

By default, the diff control lines (those with `---`, `+++`, or `@@`) are 
created with a trailing newline. 

For inputs that do not have trailing newlines, set the lineterm argument 
to `""` so that the output will be uniformly newline free.

The context diff format normally has a header for filenames and modification
times. Any or all of these may be specified using strings for *fromfile*, 
*tofile*, *fromfiledate*, and *tofiledate*. 
The modification times are normally expressed in the ISO 8601 format.
If not specified, the strings default to blanks.

```js
>>> difflib.unifiedDiff('one two three four'.split(' '),
...                     'zero one tree four'.split(' '), {
...                       fromfile: 'Original'
...                       tofile: 'Current',
...                       fromfiledate: '2005-01-26 23:30:50',
...                       tofiledate: '2010-04-02 10:20:52',
...                       lineterm: ''
...                     })
[ '--- Original\t2005-01-26 23:30:50',
  '+++ Current\t2010-04-02 10:20:52',
  '@@ -1,4 +1,4 @@',
  '+zero',
  ' one',
  '-two',
  '-three',
  '+tree',
  ' four' ]
```


<a name="IS_LINE_JUNK" />
### difflib.**IS\_LINE\_JUNK**(line)

Return true for ignorable lines. The line line is ignorable if *line* is 
blank or contains a single `'#'`, otherwise it is not ignorable.

<a name="IS_CHARACTER_JUNK" />
### difflib.**IS\_CHARACTER\_JUNK**(ch)

Return true for ignorable characters. The character *ch* is ignorable if ch
is a space or tab, otherwise it is not ignorable. 
Used as a default for parameter charjunk in [ndiff()](#ndiff).


Change Log
----------
 * 0.1.0 Use Map instead of Object to hold values being diffed -- fixes the bug where e.g. "true" and true, or "0" and 0 compare as identical (forked from Qiao's 2012-04-22 commit: e11553ba3e303e2db206d04c95f8e51c5692ca28)


License
-------

Ported by Xueqiao Xu &lt;xueqiaoxu@gmail.com&gt;

PSF LICENSE AGREEMENT FOR PYTHON 2.7.2

1. This LICENSE AGREEMENT is between the Python Software Foundation (“PSF”), and the Individual or Organization (“Licensee”) accessing and otherwise using Python 2.7.2 software in source or binary form and its associated documentation.
2. Subject to the terms and conditions of this License Agreement, PSF hereby grants Licensee a nonexclusive, royalty-free, world-wide license to reproduce, analyze, test, perform and/or display publicly, prepare derivative works, distribute, and otherwise use Python 2.7.2 alone or in any derivative version, provided, however, that PSF’s License Agreement and PSF’s notice of copyright, i.e., “Copyright © 2001-2012 Python Software Foundation; All Rights Reserved” are retained in Python 2.7.2 alone or in any derivative version prepared by Licensee.
3. In the event Licensee prepares a derivative work that is based on or incorporates Python 2.7.2 or any part thereof, and wants to make the derivative work available to others as provided herein, then Licensee hereby agrees to include in any such work a brief summary of the changes made to Python 2.7.2.
4. PSF is making Python 2.7.2 available to Licensee on an “AS IS” basis. PSF MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED. BY WAY OF EXAMPLE, BUT NOT LIMITATION, PSF MAKES NO AND DISCLAIMS ANY REPRESENTATION OR WARRANTY OF MERCHANTABILITY OR FITNESS FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF PYTHON 2.7.2 WILL NOT INFRINGE ANY THIRD PARTY RIGHTS.
5. PSF SHALL NOT BE LIABLE TO LICENSEE OR ANY OTHER USERS OF PYTHON 2.7.2 FOR ANY INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES OR LOSS AS A RESULT OF MODIFYING, DISTRIBUTING, OR OTHERWISE USING PYTHON 2.7.2, OR ANY DERIVATIVE THEREOF, EVEN IF ADVISED OF THE POSSIBILITY THEREOF.
6. This License Agreement will automatically terminate upon a material breach of its terms and conditions.
7. Nothing in this License Agreement shall be deemed to create any relationship of agency, partnership, or joint venture between PSF and Licensee. This License Agreement does not grant permission to use PSF trademarks or trade name in a trademark sense to endorse or promote products or services of Licensee, or any third party.
8. By copying, installing or otherwise using Python 2.7.2, Licensee agrees to be bound by the terms and conditions of this License Agreement.
