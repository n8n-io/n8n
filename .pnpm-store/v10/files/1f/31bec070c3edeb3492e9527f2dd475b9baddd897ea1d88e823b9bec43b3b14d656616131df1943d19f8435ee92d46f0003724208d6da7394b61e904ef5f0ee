# aria-hidden

[![NPM](https://nodei.co/npm/aria-hidden.png?downloads=true&stars=true)](https://nodei.co/npm/aria-hidden/)

Hides from ARIA everything, except provided node(s).

Helps to isolate modal dialogs and focused task - the content will be not accessible using
accessible tools.

Now with [HTML inert](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/inert) support

# API

Just call `hideOthers` with DOM-node you want to keep, and it will _hide_ everything else.
`targetNode` could be placed anywhere - its siblings would be hidden, but it and its parents - not.

> "hidden" in terms or `aria-hidden`

```js
import { hideOthers } from 'aria-hidden';

const undo = hideOthers(exceptThisDOMnode);
// everything else is "aria-hidden"

// undo changes
undo();
```

you also may limit the effect spread by providing top level node as a second parameter

```js
// keep only `anotherNode` node visible in #app
// the rest of document will be untouched
hideOthers(anotherNode, document.getElementById('app'));
```

> `parentNode` defaults to document.body

# Inert

While `aria-hidden` played important role in the past and will play in the future - the main
use case always was around isolating content and making elements "transparent" not only for aria, but for
user interaction as well.

This is why you might consider using `inertOthers`

```tsx
import { hideOthers, inertOthers, supportsInert } from 'aria-hidden';

// focus on element mean "hide others". Ideally disable interactions
const focusOnElement = (node) => (supportsInert() ? inertOthers(node) : hideOthers(node));
```

the same function as above is already contructed and exported as

```tsx
import { suppressOthers } from 'aria-hidden';

suppressOthers([keepThisNode, andThis]);
```

⚠️ Note - inert **will disable any interactions** with _suppressed_ elements ⚠️

### Suppressing interactivity without inert

One can `marker`, the third argument to a function, to mark hidden elements.
Later one can create a style matching given marker to apply `pointer-events:none`

```css
[hidden-node] {
  pointer-events: none;
}
```

```tsx
hideOthers(notThisOne, undefined /*parent = document*/, 'hidden-node');
```

Generally speaking the same can be achieved by addressing `[aria-hidden]` nodes, but
not all `aria-hidden` nodes are expected to be non-interactive.
Hence, it's better to separate concerns.

# Inspiration

Based on [smooth-ui](https://github.com/smooth-code/smooth-ui) modal dialogs.

# See also

- [inert](https://github.com/WICG/inert) - The HTML attribute/property to mark parts of the DOM tree as "inert".
- [react-focus-lock](https://github.com/theKashey/react-focus-lock) to lock Focus inside modal.
- [react-scroll-lock](https://github.com/theKashey/react-scroll-lock) to disable page scroll while modal is opened.

# Size

Code is 30 lines long

# Licence

MIT
