/*

didYouMean.js - A simple JavaScript matching engine
===================================================

[Available on GitHub](https://github.com/dcporter/didyoumean.js).

A super-simple, highly optimized JS library for matching human-quality input to a list of potential
matches. You can use it to suggest a misspelled command-line utility option to a user, or to offer
links to nearby valid URLs on your 404 page. (The examples below are taken from a personal project,
my [HTML5 business card](http://dcporter.aws.af.cm/me), which uses didYouMean.js to suggest correct
URLs from misspelled ones, such as [dcporter.aws.af.cm/me/instagarm](http://dcporter.aws.af.cm/me/instagarm).)
Uses the [Levenshtein distance algorithm](https://en.wikipedia.org/wiki/Levenshtein_distance).

didYouMean.js works in the browser as well as in node.js. To install it for use in node:

```
npm install didyoumean
```


Examples
--------

Matching against a list of strings:
```
var input = 'insargrm'
var list = ['facebook', 'twitter', 'instagram', 'linkedin'];
console.log(didYouMean(input, list));
> 'instagram'
// The method matches 'insargrm' to 'instagram'.

input = 'google plus';
console.log(didYouMean(input, list));
> null
// The method was unable to find 'google plus' in the list of options.
```

Matching against a list of objects:
```
var input = 'insargrm';
var list = [ { id: 'facebook' }, { id: 'twitter' }, { id: 'instagram' }, { id: 'linkedin' } ];
var key = 'id';
console.log(didYouMean(input, list, key));
> 'instagram'
// The method returns the matching value.

didYouMean.returnWinningObject = true;
console.log(didYouMean(input, list, key));
> { id: 'instagram' }
// The method returns the matching object.
```


didYouMean(str, list, [key])
----------------------------

- str: The string input to match.
- list: An array of strings or objects to match against.
- key (OPTIONAL): If your list array contains objects, you must specify the key which contains the string
  to match against.

Returns: the closest matching string, or null if no strings exceed the threshold.


Options
-------

Options are set on the didYouMean function object. You may change them at any time.

### threshold

  By default, the method will only return strings whose edit distance is less than 40% (0.4x) of their length.
  For example, if a ten-letter string is five edits away from its nearest match, the method will return null.

  You can control this by setting the "threshold" value on the didYouMean function. For example, to set the
  edit distance threshold to 50% of the input string's length:

  ```
  didYouMean.threshold = 0.5;
  ```

  To return the nearest match no matter the threshold, set this value to null.

### thresholdAbsolute

  This option behaves the same as threshold, but instead takes an integer number of edit steps. For example,
  if thresholdAbsolute is set to 20 (the default), then the method will only return strings whose edit distance
  is less than 20. Both options apply.

### caseSensitive

  By default, the method will perform case-insensitive comparisons. If you wish to force case sensitivity, set
  the "caseSensitive" value to true:

  ```
  didYouMean.caseSensitive = true;
  ```

### nullResultValue

  By default, the method will return null if there is no sufficiently close match. You can change this value here.

### returnWinningObject

  By default, the method will return the winning string value (if any). If your list contains objects rather
  than strings, you may set returnWinningObject to true.
  
  ```
  didYouMean.returnWinningObject = true;
  ```
  
  This option has no effect on lists of strings.

### returnFirstMatch
  
  By default, the method will search all values and return the closest match. If you're simply looking for a "good-
  enough" match, you can set your thresholds appropriately and set returnFirstMatch to true to substantially speed
  things up.


License
-------

didYouMean copyright (c) 2013-2014 Dave Porter.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License
[here](http://www.apache.org/licenses/LICENSE-2.0).

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/
(function() {
  "use strict";

  // The didYouMean method.
  function didYouMean(str, list, key) {
    if (!str) return null;

    // If we're running a case-insensitive search, smallify str.
    if (!didYouMean.caseSensitive) { str = str.toLowerCase(); }

    // Calculate the initial value (the threshold) if present.
    var thresholdRelative = didYouMean.threshold === null ? null : didYouMean.threshold * str.length,
        thresholdAbsolute = didYouMean.thresholdAbsolute,
        winningVal;
    if (thresholdRelative !== null && thresholdAbsolute !== null) winningVal = Math.min(thresholdRelative, thresholdAbsolute);
    else if (thresholdRelative !== null) winningVal = thresholdRelative;
    else if (thresholdAbsolute !== null) winningVal = thresholdAbsolute;
    else winningVal = null;

    // Get the edit distance to each option. If the closest one is less than 40% (by default) of str's length,
    // then return it.
    var winner, candidate, testCandidate, val,
        i, len = list.length;
    for (i = 0; i < len; i++) {
      // Get item.
      candidate = list[i];
      // If there's a key, get the candidate value out of the object.
      if (key) { candidate = candidate[key]; }
      // Gatekeep.
      if (!candidate) { continue; }
      // If we're running a case-insensitive search, smallify the candidate.
      if (!didYouMean.caseSensitive) { testCandidate = candidate.toLowerCase(); }
      else { testCandidate = candidate; }
      // Get and compare edit distance.
      val = getEditDistance(str, testCandidate, winningVal);
      // If this value is smaller than our current winning value, OR if we have no winning val yet (i.e. the
      // threshold option is set to null, meaning the caller wants a match back no matter how bad it is), then
      // this is our new winner.
      if (winningVal === null || val < winningVal) {
        winningVal = val;
        // Set the winner to either the value or its object, depending on the returnWinningObject option.
        if (key && didYouMean.returnWinningObject) winner = list[i];
        else winner = candidate;
        // If we're returning the first match, return it now.
        if (didYouMean.returnFirstMatch) return winner;
      }
    }

    // If we have a winner, return it.
    return winner || didYouMean.nullResultValue;
  }

  // Set default options.
  didYouMean.threshold = 0.4;
  didYouMean.thresholdAbsolute = 20;
  didYouMean.caseSensitive = false;
  didYouMean.nullResultValue = null;
  didYouMean.returnWinningObject = null;
  didYouMean.returnFirstMatch = false;

  // Expose.
  // In node...
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = didYouMean;
  }
  // Otherwise...
  else {
    window.didYouMean = didYouMean;
  }

  var MAX_INT = Math.pow(2,32) - 1; // We could probably go higher than this, but for practical reasons let's not.
  function getEditDistance(a, b, max) {
    // Handle null or undefined max.
    max = max || max === 0 ? max : MAX_INT;

    var lena = a.length;
    var lenb = b.length;

    // Fast path - no A or B.
    if (lena === 0) return Math.min(max + 1, lenb);
    if (lenb === 0) return Math.min(max + 1, lena);

    // Fast path - length diff larger than max.
    if (Math.abs(lena - lenb) > max) return max + 1;

    // Slow path.
    var matrix = [],
        i, j, colMin, minJ, maxJ;

    // Set up the first row ([0, 1, 2, 3, etc]).
    for (i = 0; i <= lenb; i++) { matrix[i] = [i]; }

    // Set up the first column (same).
    for (j = 0; j <= lena; j++) { matrix[0][j] = j; }

    // Loop over the rest of the columns.
    for (i = 1; i <= lenb; i++) {
      colMin = MAX_INT;
      minJ = 1;
      if (i > max) minJ = i - max;
      maxJ = lenb + 1;
      if (maxJ > max + i) maxJ = max + i;
      // Loop over the rest of the rows.
      for (j = 1; j <= lena; j++) {
        // If j is out of bounds, just put a large value in the slot.
        if (j < minJ || j > maxJ) {
          matrix[i][j] = max + 1;
        }

        // Otherwise do the normal Levenshtein thing.
        else {
          // If the characters are the same, there's no change in edit distance.
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          }
          // Otherwise, see if we're substituting, inserting or deleting.
          else {
            matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // Substitute
                                    Math.min(matrix[i][j - 1] + 1, // Insert
                                    matrix[i - 1][j] + 1)); // Delete
          }
        }

        // Either way, update colMin.
        if (matrix[i][j] < colMin) colMin = matrix[i][j];
      }

      // If this column's minimum is greater than the allowed maximum, there's no point
      // in going on with life.
      if (colMin > max) return max + 1;
    }
    // If we made it this far without running into the max, then return the final matrix value.
    return matrix[lenb][lena];
  }

})();
