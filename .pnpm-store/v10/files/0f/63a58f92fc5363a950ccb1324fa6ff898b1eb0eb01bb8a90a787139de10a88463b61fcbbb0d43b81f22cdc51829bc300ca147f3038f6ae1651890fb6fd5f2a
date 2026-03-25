## 6.5.11 (2025-05-14)

### Bug fixes

Fix an issue in `replaceNext` that could cause it to create an invalid selection when replacing past the end of the document.

## 6.5.10 (2025-02-26)

### Bug fixes

Add a close button to the `gotoLine` panel.

## 6.5.9 (2025-02-12)

### Bug fixes

When replacing a regexp match, don't expand multi-digit replacement markers to numbers beyond the captured group count in the query.

## 6.5.8 (2024-11-22)

### Bug fixes

Fix a bug that put the selection in the wrong place after running `replaceNext` with a regexp query that could match strings of different length.

## 6.5.7 (2024-11-01)

### Bug fixes

Fix an issue where `findNext` and `findPrevious` would do nothing when the only match in the document was partially selected.

Fix an infinite loop in `SearchCursor` when the normalizer function deletes characters.

## 6.5.6 (2024-02-07)

### Bug fixes

Make `highlightSelectionMatches` include whitespace in the selection in its matches.

Fix a bug that caused `SearchCursor` to return invalid ranges when matching astral chars that the the normalizer normalized to single-code-unit chars.

## 6.5.5 (2023-11-27)

### Bug fixes

Fix a bug that caused codes like `\n` to be unescaped in strings inserted via replace placeholders like `$&`.

Use the keybinding Mod-Alt-g for `gotoLine` to the search keymap, to make it usable for people whose keyboard layout uses Alt/Option-g to type some character.

## 6.5.4 (2023-09-20)

### Bug fixes

Fix a bug that caused whole-word search to incorrectly check for word boundaries in some circumstances.

## 6.5.3 (2023-09-14)

### Bug fixes

The `gotoLine` dialog is now populated with the current line number when you open it.

## 6.5.2 (2023-08-26)

### Bug fixes

Don't use the very lowest precedence for match highlighting decorations.

## 6.5.1 (2023-08-04)

### Bug fixes

Make `gotoLine` prefer to scroll the target line to the middle of the view.

Fix an issue in `SearchCursor` where character normalization could produce nonsensical matches.

## 6.5.0 (2023-06-05)

### New features

The new `regexp` option to `search` can be used to control whether queries have the regexp flag on by default.

## 6.4.0 (2023-04-25)

### Bug fixes

The `findNext` and `findPrevious` commands now select the search field text if that field is focused.

### New features

The `scrollToMatch` callback option now receives the editor view as a second parameter.

## 6.3.0 (2023-03-20)

### New features

The new `scrollToMatch` search option allows you to adjust the way the editor scrolls search matches into view.

## 6.2.3 (2022-11-14)

### Bug fixes

Fix a bug that hid the search dialog's close button when the editor was read-only.

## 6.2.2 (2022-10-18)

### Bug fixes

When `literal` is off, \n, \r, and \t escapes are now also supported in replacement text.

Make sure search dialog inputs don't get treated as form fields when the editor is created inside a form.

Fix a bug in `RegExpCursor` that would cause it to stop matching in the middle of a line when its current match position was equal to the length of the line.

## 6.2.1 (2022-09-26)

### Bug fixes

By-word search queries will now skip any result that had word characters both before and after a match boundary.

## 6.2.0 (2022-08-25)

### New features

A new `wholeWord` search query flag can be used to limit matches to whole words.

`SearchCursor` and `RegExpCursor` now support a `test` parameter that can be used to ignore certain matches.

## 6.1.0 (2022-08-16)

### Bug fixes

Fix an infinite loop when the match position of a `RegExpCursor` ended up in the middle of an UTF16 surrogate pair.

### New features

The `literal` search option can now be set to make literal queries the default.

The new `searchPanelOpen` function can be used to find out whether the search panel is open for a given state.

## 6.0.1 (2022-07-22)

### Bug fixes

`findNext` and `findPrevious` will now return to the current result (and scroll it into view) if no other matches are found.

## 6.0.0 (2022-06-08)

### Bug fixes

Don't crash when a custom search panel doesn't have a field named 'search'.

Make sure replacements are announced to screen readers.

## 0.20.1 (2022-04-22)

### New features

It is now possible to disable backslash escapes in search queries with the `literal` option.

## 0.20.0 (2022-04-20)

### Bug fixes

Make the `wholeWords` option to `highlightSelectionMatches` default to false, as intended.

## 0.19.10 (2022-04-04)

### Bug fixes

Make sure search matches are highlighted when scrolling new content into view.

## 0.19.9 (2022-03-03)

### New features

The selection-matching extension now accepts a `wholeWords` option that makes it only highlight matches that span a whole word. Add SearchQuery.getCursor

The `SearchQuery` class now has a `getCursor` method that allows external code to create a cursor for the query.

## 0.19.8 (2022-02-14)

### Bug fixes

Fix a bug that caused the search panel to start open when configuring a state with the `search()` extension.

## 0.19.7 (2022-02-14)

### Breaking changes

`searchConfig` is deprecated in favor of `search` (but will exist until next major release).

### New features

The new `search` function is now used to enable and configure the search extension.

## 0.19.6 (2022-01-27)

### Bug fixes

Make `selectNextOccurrence` scroll the newly selected range into view.

## 0.19.5 (2021-12-16)

### Breaking changes

The search option `matchCase` was renamed to `caseSensitive` (the old name will continue to work until the next breaking release).

### Bug fixes

`openSearchPanel` will now update the search query to the current selection even if the panel was already open.

### New features

Client code can now pass a custom search panel creation function in the search configuration.

The `getSearchQuery` function and `setSearchQuery` effect can now be used to inspect or change the current search query.

## 0.19.4 (2021-12-02)

### Bug fixes

The search panel will no longer show the replace interface when the editor is read-only.

## 0.19.3 (2021-11-22)

### Bug fixes

Add `userEvent` annotations to search and replace transactions.

Make sure the editor handles keys bound to `findNext`/`findPrevious` even when there are no matches, to avoid the browser's search interrupting users.

### New features

Add a `Symbol.iterator` property to the cursor types, so that they can be used with `for`/`of`.

## 0.19.2 (2021-09-16)

### Bug fixes

`selectNextOccurrence` will now only select partial words if the current main selection hold a partial word.

Explicitly set the button's type to prevent the browser from submitting forms wrapped around the editor.

## 0.19.1 (2021-09-06)

### Bug fixes

Make `highlightSelectionMatches` not produce overlapping decorations, since those tend to just get unreadable.

Make sure any existing search text is selected when opening the search panel. Add search config option to not match case when search panel is opened (#4)

### New features

The `searchConfig` function now takes a `matchCase` option that controls whether the search panel starts in case-sensitive mode.

## 0.19.0 (2021-08-11)

### Bug fixes

Make sure to prevent the native Mod-d behavior so that the editor doesn't lose focus after selecting past the last occurrence.

## 0.18.4 (2021-05-27)

### New features

Initialize the search query to the current selection, when there is one, when opening the search dialog.

Add a `searchConfig` function, supporting an option to put the search panel at the top of the editor.

## 0.18.3 (2021-05-18)

### Bug fixes

Fix a bug where the first search command in a new editor wouldn't properly open the panel.

### New features

New command `selectNextOccurrence` that selects the next occurrence of the selected word (bound to Mod-d in the search keymap).

## 0.18.2 (2021-03-19)

### Bug fixes

The search interface and cursor will no longer include overlapping matches (aligning with what all other editors are doing).

### New features

The package now exports a `RegExpCursor` which is a search cursor that matches regular expression patterns.

The search/replace interface now allows the user to use regular expressions.

The `SearchCursor` class now has a `nextOverlapping` method that includes matches that start inside the previous match.

Basic backslash escapes (\n, \r, \t, and \\) are now accepted in string search patterns in the UI.

## 0.18.1 (2021-03-15)

### Bug fixes

Fix an issue where entering an invalid input in the goto-line dialog would submit a form and reload the page.

## 0.18.0 (2021-03-03)

### Breaking changes

Update dependencies to 0.18.

## 0.17.1 (2021-01-06)

### New features

The package now also exports a CommonJS module.

## 0.17.0 (2020-12-29)

### Breaking changes

First numbered release.

